import pytest
import pytest_asyncio
import httpx
import datetime
from sqlalchemy import select

from app.config import settings
from app.database import init_db, AsyncSessionLocal, Base, engine
from app.seed import seed_database
from app.auth import hash_password, verify_password, create_access_token
from app.ssrf import validate_url_for_ssrf
from app.models import Service, HealthCheck, Incident, AdminUser
from app.monitor import execute_service_check, evaluate_incidents
from app.main import app

@pytest.mark.asyncio
async def test_ssrf_validator():
    # Private / loopback / metadata IPs must be rejected
    unsafe_urls = [
        "http://127.0.0.1:8000/internal",
        "http://localhost:3000",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/admin",
        "http://192.168.1.1/router",
        "http://[::1]/secret",
        "ftp://example.com/file",
    ]
    for url in unsafe_urls:
        is_safe, err = validate_url_for_ssrf(url)
        assert not is_safe, f"Expected {url} to be blocked by SSRF check, but was allowed"
        assert len(err) > 0

    # Public domain must be allowed
    is_safe, err = validate_url_for_ssrf("https://www.google.com")
    assert is_safe, f"Expected public URL to be allowed, error: {err}"

@pytest.mark.asyncio
async def test_auth_hashing():
    pw = "SuperSecretPassword123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

@pytest.mark.asyncio
async def test_incident_detection_and_recovery():
    await init_db()
    async with AsyncSessionLocal() as session:
        # Create a test service
        test_svc = Service(
            name="Test Mock Broker",
            provider="Mock Broker Ltd",
            category="broker_apis",
            url="https://api.example.com/status",
            method="GET",
            timeout_seconds=5,
            check_interval_seconds=60,
            expected_status_codes=[200],
            is_active=True
        )
        session.add(test_svc)
        await session.commit()
        await session.refresh(test_svc)

        # 1. Simulate 3 consecutive down checks
        for i in range(3):
            check = HealthCheck(
                service_id=test_svc.id,
                status="down",
                http_status_code=503,
                latency_ms=100.0,
                error_message="HTTP 503 Service Unavailable",
                response_valid=False,
                checked_at=datetime.datetime.now(datetime.timezone.utc)
            )
            session.add(check)
            await session.commit()
            await evaluate_incidents(test_svc, check, session)

        # Verify incident was created
        inc_stmt = select(Incident).where(Incident.service_id == test_svc.id, Incident.status == "investigating")
        inc = (await session.execute(inc_stmt)).scalar_one_or_none()
        assert inc is not None
        assert "Service Outage Detected" in inc.title

        # 2. Simulate 3 consecutive operational checks
        for i in range(3):
            check = HealthCheck(
                service_id=test_svc.id,
                status="operational",
                http_status_code=200,
                latency_ms=45.0,
                error_message=None,
                response_valid=True,
                checked_at=datetime.datetime.now(datetime.timezone.utc)
            )
            session.add(check)
            await session.commit()
            await evaluate_incidents(test_svc, check, session)

        # Verify incident was auto-resolved
        await session.refresh(inc)
        assert inc.status == "resolved"
        assert inc.resolved_at is not None

@pytest.mark.asyncio
async def test_app_lifecycle_and_endpoints():
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_database(session)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"

        # 2. System overview
        res = await client.get("/api/status/overview")
        assert res.status_code == 200
        overview = res.json()
        assert "overall_status" in overview
        assert overview["total_monitored"] >= 5
        assert "services_by_category" in overview

        # 3. List services
        res = await client.get("/api/services")
        assert res.status_code == 200
        services = res.json()
        assert len(services) >= 5

        # 4. Service details
        first_svc = services[0]
        res = await client.get(f"/api/services/{first_svc['id']}")
        assert res.status_code == 200
        svc_detail = res.json()
        assert svc_detail["name"] == first_svc["name"]
        assert "uptime_24h" in svc_detail
        assert "uptime_7d" in svc_detail

        # 5. Admin Login with seed credentials
        res = await client.post("/api/admin/login", json={
            "email": settings.DEFAULT_ADMIN_EMAIL,
            "password": settings.DEFAULT_ADMIN_PASSWORD
        })
        assert res.status_code == 200
        token_data = res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]

        # 6. Admin Me
        res = await client.get("/api/admin/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["email"] == settings.DEFAULT_ADMIN_EMAIL

        # 7. Admin Endpoint Trigger Check
        res = await client.post(
            f"/api/admin/endpoints/{first_svc['id']}/trigger",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        chk = res.json()
        assert "status" in chk
        assert "latency_ms" in chk
