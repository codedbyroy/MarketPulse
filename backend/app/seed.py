import logging
import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AdminUser, Service
from app.auth import hash_password
from app.config import settings

logger = logging.getLogger("marketpulse.seed")

INITIAL_SERVICES = [
    {
        "name": "NSE India Web Portal",
        "provider": "National Stock Exchange",
        "category": "exchanges",
        "url": "https://www.nseindia.com",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200, 301, 302, 403],
        "validation_config": {"note": "Monitors NSE web frontend gateway"},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "BSE India Market Status API",
        "provider": "Bombay Stock Exchange",
        "category": "exchanges",
        "url": "https://api.bseindia.com/BseIndiaAPI/api/MarketStatus/w",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200, 302],
        "validation_config": {"note": "BSE Live Market Status feed"},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "MCX India Commodity Exchange",
        "provider": "Multi Commodity Exchange",
        "category": "exchanges",
        "url": "https://www.mcxindia.com",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200, 301, 302],
        "validation_config": {},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "Zerodha Kite Connect Platform",
        "provider": "Zerodha",
        "category": "broker_apis",
        "url": "https://kite.zerodha.com",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200],
        "validation_config": {"contains_text": "Kite"},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "Angel One SmartAPI Gateway",
        "provider": "Angel One",
        "category": "broker_apis",
        "url": "https://smartapi.angelone.in",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200, 301, 302],
        "validation_config": {},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "Upstox Developer Platform",
        "provider": "Upstox",
        "category": "broker_apis",
        "url": "https://api.upstox.com",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200, 404, 301],
        "validation_config": {},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "Groww Investment Portal",
        "provider": "Groww",
        "category": "broker_apis",
        "url": "https://groww.in",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200, 301, 302],
        "validation_config": {},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "Yahoo Finance NIFTY 50 API",
        "provider": "Yahoo Finance",
        "category": "market_data",
        "url": "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200],
        "validation_config": {"json_key": "chart"},
        "authentication_config": {},
        "is_active": True
    },
    {
        "name": "Reserve Bank of India Portal",
        "provider": "Reserve Bank of India",
        "category": "market_data",
        "url": "https://www.rbi.org.in",
        "method": "GET",
        "timeout_seconds": 10,
        "check_interval_seconds": 300,
        "expected_status_codes": [200, 301, 302],
        "validation_config": {},
        "authentication_config": {},
        "is_active": True
    }
]

async def seed_database(db: AsyncSession):
    """
    Seeds default admin and financial market services if not present.
    """
    # 1. Admin User
    admin_stmt = select(AdminUser).where(AdminUser.email == settings.DEFAULT_ADMIN_EMAIL)
    admin_res = await db.execute(admin_stmt)
    admin = admin_res.scalar_one_or_none()
    if not admin:
        admin = AdminUser(
            email=settings.DEFAULT_ADMIN_EMAIL,
            password_hash=hash_password(settings.DEFAULT_ADMIN_PASSWORD),
            created_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(admin)
        await db.commit()
        logger.info(f"Seeded default admin user: {settings.DEFAULT_ADMIN_EMAIL}")

    # 2. Services
    for svc_data in INITIAL_SERVICES:
        svc_stmt = select(Service).where(Service.name == svc_data["name"])
        svc_res = await db.execute(svc_stmt)
        svc = svc_res.scalar_one_or_none()
        if not svc:
            svc = Service(
                name=svc_data["name"],
                provider=svc_data["provider"],
                category=svc_data["category"],
                url=svc_data["url"],
                method=svc_data["method"],
                timeout_seconds=svc_data["timeout_seconds"],
                check_interval_seconds=svc_data["check_interval_seconds"],
                expected_status_codes=svc_data["expected_status_codes"],
                validation_config=svc_data["validation_config"],
                authentication_config=svc_data["authentication_config"],
                is_active=svc_data["is_active"],
                created_at=datetime.datetime.now(datetime.timezone.utc),
                updated_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(svc)
            await db.commit()
            logger.info(f"Seeded initial service: {svc_data['name']}")
