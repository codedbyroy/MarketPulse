from fastapi import APIRouter
from app.api.status import router as status_router
from app.api.services import router as services_router
from app.api.incidents import router as incidents_router
from app.api.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(status_router)
api_router.include_router(services_router)
api_router.include_router(incidents_router)
api_router.include_router(admin_router)
