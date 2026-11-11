from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.database import get_db
from app.models import Incident, IncidentUpdate, Service
from app.schemas import IncidentResponse, IncidentUpdateResponse

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentResponse])
async def list_incidents(
    status: Optional[str] = Query(None, description="active, resolved, or all"),
    service_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Public incident history and timeline.
    """
    stmt = select(Incident)
    if status == "active":
        stmt = stmt.where(Incident.status.in_(["investigating", "identified", "monitoring"]))
    elif status == "resolved":
        stmt = stmt.where(Incident.status == "resolved")
    
    if service_id:
        stmt = stmt.where(Incident.service_id == service_id)

    stmt = stmt.order_by(desc(Incident.started_at)).limit(limit)
    res = await db.execute(stmt)
    incidents = res.scalars().all()

    output = []
    for inc in incidents:
        # Load updates
        upd_stmt = select(IncidentUpdate).where(IncidentUpdate.incident_id == inc.id).order_by(IncidentUpdate.created_at.asc())
        upd_res = await db.execute(upd_stmt)
        updates = [IncidentUpdateResponse.model_validate(u) for u in upd_res.scalars().all()]

        # Service name
        svc_name = None
        if inc.service_id:
            s_res = await db.execute(select(Service.name).where(Service.id == inc.service_id))
            svc_name = s_res.scalar_one_or_none()

        output.append(
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
    return output

@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Incident).where(Incident.id == incident_id)
    res = await db.execute(stmt)
    inc = res.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    upd_stmt = select(IncidentUpdate).where(IncidentUpdate.incident_id == inc.id).order_by(IncidentUpdate.created_at.asc())
    upd_res = await db.execute(upd_stmt)
    updates = [IncidentUpdateResponse.model_validate(u) for u in upd_res.scalars().all()]

    svc_name = None
    if inc.service_id:
        s_res = await db.execute(select(Service.name).where(Service.id == inc.service_id))
        svc_name = s_res.scalar_one_or_none()

    return IncidentResponse(
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
