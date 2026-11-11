import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.seed import seed_database
from app.scheduler import start_scheduler, stop_scheduler, check_all_active_services
from app.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("marketpulse.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    logger.info("MarketPulse starting up...")
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_database(session)
    
    # Start background scheduler
    start_scheduler()

    # Trigger initial check cycle asynchronously without blocking startup
    import asyncio
    asyncio.create_task(check_all_active_services())

    yield

    # Shutdown:
    logger.info("MarketPulse shutting down...")
    stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="MarketPulse: Indian Financial Market API Monitoring & Public Status Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "documentation": "/docs",
        "api_prefix": settings.API_V1_STR
    }
