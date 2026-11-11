import datetime
import statistics
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from typing import List, Optional

from app.database import get_db
from app.models import Service, HealthCheck, Incident, IncidentUpdate
from app.schemas import ServiceResponse, ServiceDetailResponse, HealthCheckResponse, IncidentResponse, IncidentUpdateResponse

router = APIRouter(prefix="/services", tags=["Services Analytics"])

@router.get("", response_model=List[ServiceResponse])
async def list_services(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all monitored services with current status and 24h uptime."""
    stmt = select(Service)
    if category:
        stmt = stmt.where(Service.category == category)
    stmt = stmt.order_by(Service.category, Service.name)

    res = await db.execute(stmt)
    services = res.scalars().all()

    now = datetime.datetime.now(datetime.timezone.utc)
    one_day_ago = now - datetime.timedelta(hours=24)

    output = []
    for svc in services:
        # Latest check
        chk_stmt = select(HealthCheck).where(HealthCheck.service_id == svc.id).order_by(desc(HealthCheck.checked_at)).limit(1)
        latest_chk = (await db.execute(chk_stmt)).scalar_one_or_none()

        # 24h uptime
        total_stmt = select(func.count(HealthCheck.id)).where(HealthCheck.service_id == svc.id, HealthCheck.checked_at >= one_day_ago)
        total_24h = (await db.execute(total_stmt)).scalar() or 0

        succ_stmt = select(func.count(HealthCheck.id)).where(
            HealthCheck.service_id == svc.id,
            HealthCheck.checked_at >= one_day_ago,
            HealthCheck.status.in_(["operational", "degraded"])
        )
        succ_24h = (await db.execute(succ_stmt)).scalar() or 0

        uptime_24h = round((succ_24h / total_24h * 100.0), 2) if total_24h > 0 else 100.0
        current_status = latest_chk.status if (latest_chk and svc.is_active) else ("unconfigured" if not svc.is_active else "operational")

        output.append(
            ServiceResponse(
                id=svc.id,
                name=svc.name,
                provider=svc.provider,
                category=svc.category,
                url=svc.url,
                method=svc.method,
                timeout_seconds=svc.timeout_seconds,
                check_interval_seconds=svc.check_interval_seconds,
                expected_status_codes=svc.expected_status_codes,
                is_active=svc.is_active,
                created_at=svc.created_at,
                updated_at=svc.updated_at,
                current_status=current_status,
                current_latency_ms=latest_chk.latency_ms if latest_chk else None,
                uptime_24h=uptime_24h,
                last_checked_at=latest_chk.checked_at if latest_chk else None
            )
        )
    return output

@router.get("/{service_id}", response_model=ServiceDetailResponse)
async def get_service_details(
    service_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed metrics for a single service:
    24h, 7d, 30d uptime, min/max/avg/median/p95 latency, recent checks and incidents.
    """
    svc_stmt = select(Service).where(Service.id == service_id)
    svc = (await db.execute(svc_stmt)).scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    now = datetime.datetime.now(datetime.timezone.utc)
    t24h = now - datetime.timedelta(hours=24)
    t7d = now - datetime.timedelta(days=7)
    t30d = now - datetime.timedelta(days=30)

    # Calculate uptime helper
    async def get_uptime(since: datetime.datetime) -> float:
        tot = (await db.execute(select(func.count(HealthCheck.id)).where(HealthCheck.service_id == service_id, HealthCheck.checked_at >= since))).scalar() or 0
        succ = (await db.execute(select(func.count(HealthCheck.id)).where(
            HealthCheck.service_id == service_id,
            HealthCheck.checked_at >= since,
            HealthCheck.status.in_(["operational", "degraded"])
        ))).scalar() or 0
        return round((succ / tot * 100.0), 2) if tot > 0 else 100.0

    uptime_24h = await get_uptime(t24h)
    uptime_7d = await get_uptime(t7d)
    uptime_30d = await get_uptime(t30d)

    # Fetch recent checks for latency calculation (last 500 checks)
    chk_stmt = (
        select(HealthCheck)
        .where(HealthCheck.service_id == service_id)
        .order_by(desc(HealthCheck.checked_at))
        .limit(500)
    )
    chk_res = await db.execute(chk_stmt)
    all_recent_checks = chk_res.scalars().all()

    valid_latencies = [c.latency_ms for c in all_recent_checks if c.latency_ms is not None and c.latency_ms > 0]

    min_lat = round(min(valid_latencies), 2) if valid_latencies else None
    max_lat = round(max(valid_latencies), 2) if valid_latencies else None
    avg_lat = round(sum(valid_latencies) / len(valid_latencies), 2) if valid_latencies else None
    median_lat = round(statistics.median(valid_latencies), 2) if valid_latencies else None
    
    # Calculate P95
    if valid_latencies:
        sorted_lat = sorted(valid_latencies)
        idx = int(0.95 * len(sorted_lat))
        p95_lat = round(sorted_lat[min(idx, len(sorted_lat) - 1)], 2)
    else:
        p95_lat = None

    tot_succ = sum(1 for c in all_recent_checks if c.status in ("operational", "degraded"))
    tot_fail = sum(1 for c in all_recent_checks if c.status == "down")

    latest_chk = all_recent_checks[0] if all_recent_checks else None
    current_status = latest_chk.status if (latest_chk and svc.is_active) else ("unconfigured" if not svc.is_active else "operational")

    # Active incidents
    inc_stmt = (
        select(Incident)
        .where(Incident.service_id == service_id, Incident.status.in_(["investigating", "identified", "monitoring"]))
        .order_by(desc(Incident.started_at))
    )
    inc_res = await db.execute(inc_stmt)
    incidents_raw = inc_res.scalars().all()

    active_incidents = []
    for inc in incidents_raw:
        upd_res = await db.execute(select(IncidentUpdate).where(IncidentUpdate.incident_id == inc.id).order_by(IncidentUpdate.created_at.asc()))
        updates = [IncidentUpdateResponse.model_validate(u) for u in upd_res.scalars().all()]
        active_incidents.append(
            IncidentResponse(
                id=inc.id,
                service_id=inc.service_id,
                service_name=svc.name,
                title=inc.title,
                description=inc.description,
                severity=inc.severity,
                status=inc.status,
                started_at=inc.started_at,
                resolved_at=inc.resolved_at,
                updates=updates
            )
        )

    recent_checks_resp = [HealthCheckResponse.model_validate(c) for c in all_recent_checks[:50]]

    return ServiceDetailResponse(
        id=svc.id,
        name=svc.name,
        provider=svc.provider,
        category=svc.category,
        url=svc.url,
        method=svc.method,
        timeout_seconds=svc.timeout_seconds,
        check_interval_seconds=svc.check_interval_seconds,
        expected_status_codes=svc.expected_status_codes,
        is_active=svc.is_active,
        created_at=svc.created_at,
        updated_at=svc.updated_at,
        current_status=current_status,
        current_latency_ms=latest_chk.latency_ms if latest_chk else None,
        uptime_24h=uptime_24h,
        uptime_7d=uptime_7d,
        uptime_30d=uptime_30d,
        last_checked_at=latest_chk.checked_at if latest_chk else None,
        avg_latency_ms=avg_lat,
        min_latency_ms=min_lat,
        max_latency_ms=max_lat,
        median_latency_ms=median_lat,
        p95_latency_ms=p95_lat,
        total_successful_checks=tot_succ,
        total_failed_checks=tot_fail,
        recent_checks=recent_checks_resp,
        active_incidents=active_incidents
    )

@router.get("/{service_id}/history", response_model=List[HealthCheckResponse])
async def get_service_history(
    service_id: int,
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """
    Get historical check data points for interactive charts.
    """
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=hours)
    stmt = (
        select(HealthCheck)
        .where(HealthCheck.service_id == service_id, HealthCheck.checked_at >= since)
        .order_by(HealthCheck.checked_at.asc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [HealthCheckResponse.model_validate(r) for r in records]
