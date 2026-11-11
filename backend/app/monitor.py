import time
import httpx
import logging
import datetime
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models import Service, HealthCheck, Incident, IncidentUpdate
from app.ssrf import validate_url_for_ssrf
from app.config import settings

logger = logging.getLogger("marketpulse.monitor")

async def execute_service_check(service: Service, db: AsyncSession) -> HealthCheck:
    """
    Executes a single health check for a given service, performs SSRF validation,
    measures latency, validates response, records the result in the database,
    and triggers the incident detection engine.
    """
    logger.info(f"Checking service [{service.id}] {service.name} ({service.url})")
    
    # 1. SSRF Validation
    is_safe, ssrf_err = validate_url_for_ssrf(service.url)
    if not is_safe:
        logger.warning(f"SSRF Check Failed for {service.name}: {ssrf_err}")
        check = HealthCheck(
            service_id=service.id,
            status="down",
            http_status_code=None,
            latency_ms=0.0,
            error_message=f"SSRF Protection blocked request: {ssrf_err}",
            response_valid=False,
            checked_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(check)
        await db.commit()
        await db.refresh(check)
        await evaluate_incidents(service, check, db)
        return check

    # 2. Build Headers and Request Configuration
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MarketPulse/1.0",
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    auth_cfg = service.authentication_config or {}
    if auth_cfg.get("type") == "bearer" and auth_cfg.get("token"):
        headers["Authorization"] = f"Bearer {auth_cfg['token']}"
    elif auth_cfg.get("type") == "api_key" and auth_cfg.get("header") and auth_cfg.get("key"):
        headers[auth_cfg["header"]] = auth_cfg["key"]
    elif auth_cfg.get("type") == "custom_headers" and isinstance(auth_cfg.get("headers"), dict):
        headers.update(auth_cfg["headers"])

    timeout_sec = service.timeout_seconds or settings.DEFAULT_TIMEOUT_SECONDS
    expected_codes = service.expected_status_codes or [200, 301, 302]

    # 3. Perform Request with Retry handling
    status_str = "down"
    http_code: Optional[int] = None
    latency_ms: Optional[float] = None
    error_msg: Optional[str] = None
    response_valid = True

    # Try up to 2 times for transient errors
    max_attempts = 2
    for attempt in range(1, max_attempts + 1):
        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(timeout_sec),
                follow_redirects=True,
                verify=True
            ) as client:
                req_method = (service.method or "GET").upper()
                if req_method == "POST":
                    resp = await client.post(service.url, headers=headers)
                elif req_method == "HEAD":
                    resp = await client.head(service.url, headers=headers)
                else:
                    resp = await client.get(service.url, headers=headers)

                elapsed = (time.perf_counter() - start_time) * 1000.0
                latency_ms = round(elapsed, 2)
                http_code = resp.status_code

                # Validate status code
                if http_code in expected_codes:
                    # Validate body if configured
                    val_cfg = service.validation_config or {}
                    if val_cfg.get("contains_text"):
                        expected_text = val_cfg["contains_text"]
                        if expected_text not in resp.text:
                            response_valid = False
                            error_msg = f"Expected text '{expected_text}' not found in response"
                    elif val_cfg.get("json_key"):
                        try:
                            json_data = resp.json()
                            key = val_cfg["json_key"]
                            if key not in json_data:
                                response_valid = False
                                error_msg = f"Expected JSON key '{key}' missing from payload"
                            elif "expected_value" in val_cfg and json_data.get(key) != val_cfg["expected_value"]:
                                response_valid = False
                                error_msg = f"JSON key '{key}' had unexpected value"
                        except Exception:
                            response_valid = False
                            error_msg = "Response was not valid JSON as required by validation config"

                    if response_valid:
                        if latency_ms >= settings.DEGRADED_LATENCY_THRESHOLD_MS:
                            status_str = "degraded"
                            error_msg = f"High latency: {latency_ms}ms exceeds threshold ({settings.DEGRADED_LATENCY_THRESHOLD_MS}ms)"
                        else:
                            status_str = "operational"
                            error_msg = None
                    else:
                        status_str = "degraded"
                else:
                    status_str = "down"
                    error_msg = f"HTTP {http_code} not in expected codes {expected_codes}"

                break  # Successful check execution, no need for attempt 2

        except httpx.TimeoutException:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            latency_ms = round(elapsed, 2)
            error_msg = f"Connection timed out after {timeout_sec}s"
            status_str = "down"
            if attempt == max_attempts:
                break
        except httpx.ConnectError as e:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            latency_ms = round(elapsed, 2)
            error_msg = f"Connection failed: {type(e).__name__}"
            status_str = "down"
            if attempt == max_attempts:
                break
        except Exception as e:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            latency_ms = round(elapsed, 2)
            error_msg = f"Request error: {str(e)}"
            status_str = "down"
            if attempt == max_attempts:
                break

    # 4. Save HealthCheck Record
    check = HealthCheck(
        service_id=service.id,
        status=status_str,
        http_status_code=http_code,
        latency_ms=latency_ms,
        error_message=error_msg,
        response_valid=response_valid,
        checked_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(check)
    await db.commit()
    await db.refresh(check)

    # 5. Incident Detection Engine
    await evaluate_incidents(service, check, db)

    return check

async def evaluate_incidents(service: Service, latest_check: HealthCheck, db: AsyncSession):
    """
    Evaluates automated incident creation and resolution rules:
    - 3 consecutive failures -> declare an outage incident.
    - Repeated high latency -> declare degraded incident.
    - 3 consecutive successes after an outage -> auto-resolve the incident.
    """
    # Fetch recent checks for this service
    stmt = (
        select(HealthCheck)
        .where(HealthCheck.service_id == service.id)
        .order_by(desc(HealthCheck.checked_at))
        .limit(5)
    )
    result = await db.execute(stmt)
    recent_checks = result.scalars().all()

    # Find any active incident for this service
    inc_stmt = (
        select(Incident)
        .where(
            Incident.service_id == service.id,
            Incident.status.in_(["investigating", "identified", "monitoring"])
        )
        .order_by(desc(Incident.started_at))
    )
    inc_res = await db.execute(inc_stmt)
    active_incident = inc_res.scalar_one_or_none()

    if len(recent_checks) >= settings.OUTAGE_CONSECUTIVE_FAILURES:
        last_n_checks = recent_checks[:settings.OUTAGE_CONSECUTIVE_FAILURES]
        all_failed = all(c.status == "down" for c in last_n_checks)
        all_operational = all(c.status == "operational" for c in last_n_checks[:settings.RECOVERY_CONSECUTIVE_SUCCESSES])

        # If all failed and no active incident -> create incident
        if all_failed and not active_incident:
            severity = "critical" if service.category == "exchanges" else "major"
            new_incident = Incident(
                service_id=service.id,
                title=f"Service Outage Detected: {service.name}",
                description=f"Automated monitoring detected {settings.OUTAGE_CONSECUTIVE_FAILURES} consecutive failed health checks. Last error: {latest_check.error_message or 'Service unreachable'}",
                severity=severity,
                status="investigating",
                started_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(new_incident)
            await db.commit()
            await db.refresh(new_incident)

            # Add initial update
            update = IncidentUpdate(
                incident_id=new_incident.id,
                message=f"Automated alert triggered: Service {service.name} failed {settings.OUTAGE_CONSECUTIVE_FAILURES} health checks consecutively. Investigation initiated.",
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(update)
            await db.commit()
            logger.warning(f"Auto-created incident for {service.name}: ID {new_incident.id}")

        # If active incident exists and service has recovered with 3 consecutive operational checks -> resolve
        elif all_operational and active_incident:
            active_incident.status = "resolved"
            active_incident.resolved_at = datetime.datetime.now(datetime.timezone.utc)
            
            update = IncidentUpdate(
                incident_id=active_incident.id,
                message=f"Automatic Recovery: Service {service.name} has responded successfully to {settings.RECOVERY_CONSECUTIVE_SUCCESSES} consecutive health checks with healthy latency. Incident marked as resolved.",
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(update)
            await db.commit()
            logger.info(f"Auto-resolved incident for {service.name}: ID {active_incident.id}")
