import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from typing import List, Dict

from app.database import get_db
from app.models import Service, HealthCheck, Incident, IncidentUpdate
from app.schemas import OverviewStatusResponse, ServiceResponse, IncidentResponse, IncidentUpdateResponse

router = APIRouter(prefix="", tags=["Public Status"])

@router.get("/health")
async def health_check_endpoint(db: AsyncSession = Depends(get_db)):
    """Backend application self health-check"""
    try:
        await db.execute(select(1))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ok",
        "service": "MarketPulse Backend API",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "database": db_status
    }

@router.get("/status/overview", response_model=OverviewStatusResponse)
async def get_system_overview(db: AsyncSession = Depends(get_db)):
    """
    Public overview dashboard endpoint.
    Computes real-time system metrics, categorized service states,
    uptime percentages, latency metrics, and active incidents.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    one_day_ago = now - datetime.timedelta(hours=24)

    # 1. Fetch all active services
    svc_stmt = select(Service).order_by(Service.category, Service.name)
    svc_res = await db.execute(svc_stmt)
    services = svc_res.scalars().all()

    total_monitored = len(services)
    operational_count = 0
    degraded_count = 0
    down_count = 0
    unconfigured_count = 0
    recent_latencies: List[float] = []

    categorized_services: Dict[str, List[ServiceResponse]] = {
        "exchanges": [],
        "broker_apis": [],
        "market_data": []
    }

    for svc in services:
        # Fetch latest health check
        chk_stmt = (
            select(HealthCheck)
            .where(HealthCheck.service_id == svc.id)
            .order_by(desc(HealthCheck.checked_at))
            .limit(1)
        )
        chk_res = await db.execute(chk_stmt)
        latest_chk = chk_res.scalar_one_or_none()

        # Calculate 24h uptime
        u_stmt = (
            select(
                func.count(HealthCheck.id).label("total"),
                func.sum(
                    case=None
                )
            )
            .select_from(HealthCheck)
            .where(
                HealthCheck.service_id == svc.id,
                HealthCheck.checked_at >= one_day_ago
            )
        )
        
        # Calculate uptime using simple counts
        total_24h_stmt = select(func.count(HealthCheck.id)).where(HealthCheck.service_id == svc.id, HealthCheck.checked_at >= one_day_ago)
        total_24h = (await db.execute(total_24h_stmt)).scalar() or 0

        succ_24h_stmt = select(func.count(HealthCheck.id)).where(
            HealthCheck.service_id == svc.id,
            HealthCheck.checked_at >= one_day_ago,
            HealthCheck.status.in_(["operational", "degraded"])
        )
        succ_24h = (await db.execute(succ_24h_stmt)).scalar() or 0

        uptime_24h = round((succ_24h / total_24h * 100.0), 2) if total_24h > 0 else 100.0

        if not svc.is_active:
            current_status = "unconfigured"
            unconfigured_count += 1
        elif not latest_chk:
            current_status = "operational"
            operational_count += 1
        else:
            current_status = latest_chk.status
            if current_status == "operational":
                operational_count += 1
            elif current_status == "degraded":
                degraded_count += 1
            elif current_status == "down":
                down_count += 1
            else:
                unconfigured_count += 1

            if latest_chk.latency_ms is not None and latest_chk.latency_ms > 0:
                recent_latencies.append(latest_chk.latency_ms)

        svc_resp = ServiceResponse(
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

        cat_key = svc.category if svc.category in categorized_services else "market_data"
        categorized_services[cat_key].append(svc_resp)

    # Calculate average response time
    avg_resp_time = round(sum(recent_latencies) / len(recent_latencies), 2) if recent_latencies else None

    # Calculate overall uptime across all active services in 24h
    total_checks_all_stmt = select(func.count(HealthCheck.id)).where(HealthCheck.checked_at >= one_day_ago)
    total_checks_all = (await db.execute(total_checks_all_stmt)).scalar() or 0

    succ_checks_all_stmt = select(func.count(HealthCheck.id)).where(
        HealthCheck.checked_at >= one_day_ago,
        HealthCheck.status.in_(["operational", "degraded"])
    )
    succ_checks_all = (await db.execute(succ_checks_all_stmt)).scalar() or 0

    overall_uptime = round((succ_checks_all / total_checks_all * 100.0), 2) if total_checks_all > 0 else 100.0

    # Determine overall status
    if down_count >= 2:
        overall_status = "major_outage"
    elif down_count == 1 or degraded_count >= 2:
        overall_status = "degraded"
    else:
        overall_status = "operational"

    # Fetch active incidents
    inc_stmt = (
        select(Incident)
        .where(Incident.status.in_(["investigating", "identified", "monitoring"]))
        .order_by(desc(Incident.started_at))
    )
    inc_res = await db.execute(inc_stmt)
    active_incidents_raw = inc_res.scalars().all()
    
    active_incidents: List[IncidentResponse] = []
    for inc in active_incidents_raw:
        # load updates
        upd_stmt = select(IncidentUpdate).where(IncidentUpdate.incident_id == inc.id).order_by(IncidentUpdate.created_at.asc())
        upd_res = await db.execute(upd_stmt)
        updates = [IncidentUpdateResponse.model_validate(u) for u in upd_res.scalars().all()]
        
        svc_name = None
        if inc.service_id:
            s_res = await db.execute(select(Service.name).where(Service.id == inc.service_id))
            svc_name = s_res.scalar_one_or_none()

        active_incidents.append(
            IncidentResponse(
                id=inc.id,
                service_id=inc.service_id,
                service_name=svc_name,
                title=inc.title,
                description=inc.description,
                severity=inc.severity,
                status=inc.status,
                started_at=inc.started_at,
                resolved_at=inc.resolved_at,
                updates=updates
            )
        )

    # Get latest check timestamp
    last_chk_stmt = select(func.max(HealthCheck.checked_at))
    last_updated = (await db.execute(last_chk_stmt)).scalar()

    return OverviewStatusResponse(
        overall_status=overall_status,
        total_monitored=total_monitored,
        operational_count=operational_count,
        degraded_count=degraded_count,
        down_count=down_count,
        unconfigured_count=unconfigured_count,
        avg_response_time_ms=avg_resp_time,
        overall_uptime_pct=overall_uptime,
        last_updated=last_updated,
        services_by_category=categorized_services,
        active_incidents=active_incidents
    )
