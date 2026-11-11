from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, List, Dict, Any
import datetime

# --- Service Schemas ---
class ServiceBase(BaseModel):
    name: str = Field(..., max_length=255, json_schema_extra={"example": "NSE India Portal"})
    provider: str = Field(..., max_length=255, json_schema_extra={"example": "National Stock Exchange"})
    category: str = Field(..., json_schema_extra={"example": "exchanges"})  # exchanges, broker_apis, market_data
    url: str = Field(..., json_schema_extra={"example": "https://www.nseindia.com"})
    method: str = Field("GET", json_schema_extra={"example": "GET"})
    timeout_seconds: int = Field(10, ge=1, le=60)
    check_interval_seconds: int = Field(300, ge=30, le=86400)
    expected_status_codes: List[int] = Field(default_factory=lambda: [200, 301, 302])
    validation_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    authentication_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    is_active: bool = True

class ServiceCreate(ServiceBase):
    pass

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    category: Optional[str] = None
    url: Optional[str] = None
    method: Optional[str] = None
    timeout_seconds: Optional[int] = None
    check_interval_seconds: Optional[int] = None
    expected_status_codes: Optional[List[int]] = None
    validation_config: Optional[Dict[str, Any]] = None
    authentication_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class HealthCheckResponse(BaseModel):
    id: int
    service_id: int
    status: str
    http_status_code: Optional[int] = None
    latency_ms: Optional[float] = None
    error_message: Optional[str] = None
    response_valid: bool
    checked_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ServiceResponse(BaseModel):
    id: int
    name: str
    provider: str
    category: str
    url: str
    method: str
    timeout_seconds: int
    check_interval_seconds: int
    expected_status_codes: List[int]
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
    current_status: str = "operational"
    current_latency_ms: Optional[float] = None
    uptime_24h: float = 100.0
    last_checked_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ServiceDetailResponse(ServiceResponse):
    uptime_7d: float = 100.0
    uptime_30d: float = 100.0
    avg_latency_ms: Optional[float] = None
    min_latency_ms: Optional[float] = None
    max_latency_ms: Optional[float] = None
    median_latency_ms: Optional[float] = None
    p95_latency_ms: Optional[float] = None
    total_successful_checks: int = 0
    total_failed_checks: int = 0
    recent_checks: List[HealthCheckResponse] = []
    active_incidents: List[Any] = []

    model_config = ConfigDict(from_attributes=True)

# --- Incident Schemas ---
class IncidentUpdateCreate(BaseModel):
    message: str = Field(..., min_length=1)

class IncidentUpdateResponse(BaseModel):
    id: int
    incident_id: int
    message: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class IncidentCreate(BaseModel):
    service_id: Optional[int] = None
    title: str = Field(..., max_length=255)
    description: str
    severity: str = Field("minor", json_schema_extra={"example": "minor"})  # minor, major, critical
    status: str = Field("investigating", json_schema_extra={"example": "investigating"})  # investigating, identified, monitoring, resolved

class IncidentPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    resolved_at: Optional[datetime.datetime] = None

class IncidentResponse(BaseModel):
    id: int
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    title: str
    description: str
    severity: str
    status: str
    started_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    updates: List[IncidentUpdateResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class AdminUserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# --- System Overview Schema ---
class OverviewStatusResponse(BaseModel):
    overall_status: str  # operational, degraded, major_outage
    total_monitored: int
    operational_count: int
    degraded_count: int
    down_count: int
    unconfigured_count: int
    avg_response_time_ms: Optional[float] = None
    overall_uptime_pct: float
    last_updated: Optional[datetime.datetime] = None
    services_by_category: Dict[str, List[ServiceResponse]]
    active_incidents: List[IncidentResponse]
