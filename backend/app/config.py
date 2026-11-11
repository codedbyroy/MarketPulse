from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "MarketPulse"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database
    # Supports SQLite for local tests and PostgreSQL for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./marketpulse.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "marketpulse-production-super-secret-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Admin Seed
    DEFAULT_ADMIN_EMAIL: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@marketpulse.in")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "MarketPulse@2026Admin")
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "*"
    ]
    
    # Monitoring Defaults
    DEFAULT_TIMEOUT_SECONDS: int = 10
    DEFAULT_CHECK_INTERVAL_SECONDS: int = 300  # 5 minutes
    DEGRADED_LATENCY_THRESHOLD_MS: float = 2000.0  # > 2000ms is degraded
    OUTAGE_CONSECUTIVE_FAILURES: int = 3
    RECOVERY_CONSECUTIVE_SUCCESSES: int = 3

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
