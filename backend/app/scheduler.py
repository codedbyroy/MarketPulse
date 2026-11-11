import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Service
from app.monitor import execute_service_check

logger = logging.getLogger("marketpulse.scheduler")

scheduler = AsyncIOScheduler()

async def check_all_active_services():
    """
    Worker task: Queries all active services and executes health checks in parallel.
    """
    logger.info("Scheduler: starting health check cycle for all active services...")
    async with AsyncSessionLocal() as session:
        try:
            stmt = select(Service).where(Service.is_active == True)
            result = await session.execute(stmt)
            services = result.scalars().all()
            logger.info(f"Scheduler found {len(services)} active services to monitor.")

            # Run checks concurrently with a semaphore to prevent socket exhaustion
            semaphore = asyncio.Semaphore(10)

            async def sem_check(svc):
                async with semaphore:
                    # Use a dedicated session for each concurrent check
                    async with AsyncSessionLocal() as check_session:
                        try:
                            # Re-fetch service in the check session
                            s_stmt = select(Service).where(Service.id == svc.id)
                            res = await check_session.execute(s_stmt)
                            db_svc = res.scalar_one_or_none()
                            if db_svc:
                                await execute_service_check(db_svc, check_session)
                        except Exception as e:
                            logger.error(f"Error checking service {svc.name}: {e}", exc_info=True)

            tasks = [sem_check(s) for s in services]
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            logger.info("Scheduler: health check cycle completed.")
        except Exception as e:
            logger.error(f"Unexpected error in check_all_active_services: {e}", exc_info=True)

def start_scheduler():
    """
    Starts the scheduler inside the application event loop.
    Default interval: 60 seconds (1 minute check cycle for high reliability).
    """
    if not scheduler.running:
        scheduler.add_job(
            check_all_active_services,
            trigger=IntervalTrigger(seconds=60),
            id="marketpulse_monitor_job",
            name="MarketPulse Recurring Health Checks",
            replace_existing=True
        )
        scheduler.start()
        logger.info("MarketPulse Background Scheduler started.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("MarketPulse Background Scheduler stopped.")

# Standalone worker loop if deployed as a separate persistent worker process
async def run_worker():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    logger.info("Starting MarketPulse Standalone Persistent Monitoring Worker...")
    while True:
        try:
            await check_all_active_services()
        except Exception as e:
            logger.error(f"Worker cycle failed: {e}")
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(run_worker())
