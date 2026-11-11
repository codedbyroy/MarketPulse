import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import AdminUser, Service, HealthCheck, Incident, IncidentUpdate
from app.schemas import (
    LoginRequest, TokenResponse, AdminUserResponse,
    ServiceCreate, ServiceUpdate, ServiceResponse,
    IncidentCreate, IncidentPatch, IncidentResponse, IncidentUpdateCreate, IncidentUpdateResponse,
    HealthCheckResponse
)
from app.auth import verify_password, create_access_token, get_current_admin
from app.ssrf import validate_url_for_ssrf
from app.monitor import execute_service_check
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.post("/login", response_model=TokenResponse)
async def admin_login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(AdminUser).where(AdminUser.email == login_data.email)
    res = await db.execute(stmt)
    admin = res.scalar_one_or_none()
    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": admin.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.get("/me", response_model=AdminUserResponse)
async def get_current_admin_user(
    current_admin: AdminUser = Depends(get_current_admin)
):
    return current_admin

# --- Endpoint Management ---

@router.get("/endpoints")
async def list_admin_endpoints(
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Service).order_by(Service.category, Service.name)
    res = await db.execute(stmt)
    services = res.scalars().all()
    # Mask sensitive auth fields before returning
    output = []
    for s in services:
        auth_copy = dict(s.authentication_config or {})
        if "token" in auth_copy:
            auth_copy["token"] = "••••••••"
        if "key" in auth_copy:
            auth_copy["key"] = "••••••••"

        output.append({
            "id": s.id,
            "name": s.name,
            "provider": s.provider,
            "category": s.category,
            "url": s.url,
            "method": s.method,
            "timeout_seconds": s.timeout_seconds,
            "check_interval_seconds": s.check_interval_seconds,
            "expected_status_codes": s.expected_status_codes,
            "validation_config": s.validation_config,
            "authentication_config": auth_copy,
            "is_active": s.is_active,
            "created_at": s.created_at,
            "updated_at": s.updated_at
        })
    return output

@router.post("/endpoints", status_code=status.HTTP_201_CREATED)
async def create_endpoint(
    service_in: ServiceCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    # Strict SSRF check before accepting URL
    is_safe, err = validate_url_for_ssrf(service_in.url)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"SSRF validation rejected URL: {err}")

    new_svc = Service(
        name=service_in.name,
        provider=service_in.provider,
        category=service_in.category,
        url=service_in.url,
        method=service_in.method,
        timeout_seconds=service_in.timeout_seconds,
        check_interval_seconds=service_in.check_interval_seconds,
        expected_status_codes=service_in.expected_status_codes,
        validation_config=service_in.validation_config,
        authentication_config=service_in.authentication_config,
        is_active=service_in.is_active,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(new_svc)
    await db.commit()
    await db.refresh(new_svc)

    # Trigger immediate health check for new service
    try:
        await execute_service_check(new_svc, db)
    except Exception:
        pass

    return {"message": "Endpoint created successfully", "id": new_svc.id}

@router.put("/endpoints/{service_id}")
async def update_endpoint(
    service_id: int,
    service_in: ServiceUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Service).where(Service.id == service_id)
    res = await db.execute(stmt)
    svc = res.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service endpoint not found")

    if service_in.url and service_in.url != svc.url:
        is_safe, err = validate_url_for_ssrf(service_in.url)
        if not is_safe:
            raise HTTPException(status_code=400, detail=f"SSRF validation rejected URL: {err}")
        svc.url = service_in.url

    if service_in.name is not None:
        svc.name = service_in.name
    if service_in.provider is not None:
        svc.provider = service_in.provider
    if service_in.category is not None:
        svc.category = service_in.category
    if service_in.method is not None:
        svc.method = service_in.method
    if service_in.timeout_seconds is not None:
        svc.timeout_seconds = service_in.timeout_seconds
    if service_in.check_interval_seconds is not None:
        svc.check_interval_seconds = service_in.check_interval_seconds
    if service_in.expected_status_codes is not None:
        svc.expected_status_codes = service_in.expected_status_codes
    if service_in.validation_config is not None:
        svc.validation_config = service_in.validation_config
    if service_in.authentication_config is not None:
        # If masked, keep existing
        new_auth = service_in.authentication_config
        if new_auth.get("token") != "••••••••" and new_auth.get("key") != "••••••••":
            svc.authentication_config = new_auth
    if service_in.is_active is not None:
        svc.is_active = service_in.is_active

    svc.updated_at = datetime.datetime.now(datetime.timezone.utc)
    await db.commit()
    await db.refresh(svc)
    return {"message": "Endpoint updated successfully", "id": svc.id}

@router.delete("/endpoints/{service_id}")
async def delete_endpoint(
    service_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Service).where(Service.id == service_id)
    res = await db.execute(stmt)
    svc = res.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service endpoint not found")

    await db.delete(svc)
    await db.commit()
    return {"message": "Endpoint deleted successfully"}

@router.post("/endpoints/{service_id}/trigger", response_model=HealthCheckResponse)
async def trigger_endpoint_check(
    service_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin triggers an immediate manual health check."""
    stmt = select(Service).where(Service.id == service_id)
    res = await db.execute(stmt)
    svc = res.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service endpoint not found")

    check = await execute_service_check(svc, db)
    return HealthCheckResponse.model_validate(check)

# --- Incident Management ---

@router.post("/incidents", status_code=status.HTTP_201_CREATED, response_model=IncidentResponse)
async def create_manual_incident(
    inc_in: IncidentCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    svc_name = None
    if inc_in.service_id:
        s_res = await db.execute(select(Service.name).where(Service.id == inc_in.service_id))
        svc_name = s_res.scalar_one_or_none()

    new_inc = Incident(
        service_id=inc_in.service_id,
        title=inc_in.title,
        description=inc_in.description,
        severity=inc_in.severity,
        status=inc_in.status,
        started_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(new_inc)
    await db.commit()
    await db.refresh(new_inc)

    # Initial update
    init_update = IncidentUpdate(
        incident_id=new_inc.id,
        message=f"Incident opened: {inc_in.description}",
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(init_update)
    await db.commit()
    await db.refresh(init_update)

    return IncidentResponse(
        id=new_inc.id,
        service_id=new_inc.service_id,
        service_name=svc_name,
        title=new_inc.title,
        description=new_inc.description,
        severity=new_inc.severity,
        status=new_inc.status,
        started_at=new_inc.started_at,
        resolved_at=new_inc.resolved_at,
        updates=[IncidentUpdateResponse.model_validate(init_update)]
    )

@router.patch("/incidents/{incident_id}")
async def patch_incident(
    incident_id: int,
    patch_in: IncidentPatch,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Incident).where(Incident.id == incident_id)
    res = await db.execute(stmt)
    inc = res.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    if patch_in.title is not None:
        inc.title = patch_in.title
    if patch_in.description is not None:
        inc.description = patch_in.description
    if patch_in.severity is not None:
        inc.severity = patch_in.severity
    if patch_in.status is not None:
        inc.status = patch_in.status
        if patch_in.status == "resolved" and not inc.resolved_at:
            inc.resolved_at = datetime.datetime.now(datetime.timezone.utc)
    if patch_in.resolved_at is not None:
        inc.resolved_at = patch_in.resolved_at

    await db.commit()
    await db.refresh(inc)
    return {"message": "Incident updated successfully"}

@router.post("/incidents/{incident_id}/updates", response_model=IncidentUpdateResponse)
async def add_incident_update(
    incident_id: int,
    upd_in: IncidentUpdateCreate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Incident).where(Incident.id == incident_id)
    res = await db.execute(stmt)
    inc = res.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    upd = IncidentUpdate(
        incident_id=incident_id,
        message=upd_in.message,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(upd)
    await db.commit()
    await db.refresh(upd)
    return IncidentUpdateResponse.model_validate(upd)

@router.get("/logs")
async def get_system_logs(
    limit: int = Query(100, ge=1, le=500),
    current_admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(HealthCheck, Service.name.label("service_name"))
        .join(Service, HealthCheck.service_id == Service.id)
        .order_by(desc(HealthCheck.checked_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    logs = []
    for check, s_name in res.all():
        logs.append({
            "id": check.id,
            "service_id": check.service_id,
            "service_name": s_name,
            "status": check.status,
            "http_status_code": check.http_status_code,
            "latency_ms": check.latency_ms,
            "error_message": check.error_message,
            "response_valid": check.response_valid,
            "checked_at": check.checked_at.isoformat()
        })
    return logs
