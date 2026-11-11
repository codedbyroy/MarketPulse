import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    provider = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True)  # exchanges, broker_apis, market_data
    url = Column(String(2048), nullable=False)
    method = Column(String(10), default="GET", nullable=False)
    timeout_seconds = Column(Integer, default=10, nullable=False)
    check_interval_seconds = Column(Integer, default=300, nullable=False)
    expected_status_codes = Column(JSON, default=lambda: [200], nullable=False)
    validation_config = Column(JSON, default=dict, nullable=True)
    authentication_config = Column(JSON, default=dict, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), onupdate=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    # Relationships
    health_checks = relationship("HealthCheck", back_populates="service", cascade="all, delete-orphan", order_by="desc(HealthCheck.checked_at)")
    incidents = relationship("Incident", back_populates="service", cascade="all, delete-orphan", order_by="desc(Incident.started_at)")

class HealthCheck(Base):
    __tablename__ = "health_checks"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)  # operational, degraded, down, unconfigured
    http_status_code = Column(Integer, nullable=True)
    latency_ms = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    response_valid = Column(Boolean, default=True, nullable=False)
    checked_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)

    # Relationship
    service = relationship("Service", back_populates="health_checks")

    __table_args__ = (
        Index("idx_service_checked_at", "service_id", "checked_at"),
    )

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), default="minor", nullable=False)  # minor, major, critical
    status = Column(String(50), default="investigating", nullable=False, index=True)  # investigating, identified, monitoring, resolved
    started_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    service = relationship("Service", back_populates="incidents")
    updates = relationship("IncidentUpdate", back_populates="incident", cascade="all, delete-orphan", order_by="asc(IncidentUpdate.created_at)")

class IncidentUpdate(Base):
    __tablename__ = "incident_updates"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)

    # Relationship
    incident = relationship("Incident", back_populates="updates")

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc), nullable=False)
