"""
Pydantic schemas for the Analytics Service API.

See: docs/specs/05_AI_AGENTIC_LAYER.md - Section 6
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class TimeGranularity(str, Enum):
    """Time granularity for analytics queries."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class MetricType(str, Enum):
    """Available metric types."""
    ORDERS = "orders"
    REVENUE = "revenue"
    DELIVERIES = "deliveries"
    DRIVERS_ACTIVE = "drivers_active"
    AVG_DELIVERY_TIME = "avg_delivery_time"
    SLA_COMPLIANCE = "sla_compliance"
    CUSTOMER_SATISFACTION = "customer_satisfaction"
    FRAUD_RATE = "fraud_rate"


class DeliveryZone(str, Enum):
    """Delivery zones for regional analytics."""
    KZN_NORTH = "KZN-North"
    KZN_SOUTH = "KZN-South"
    KZN_CBD = "KZN-CBD"
    GAUTENG_NORTH = "Gauteng-North"
    GAUTENG_SOUTH = "Gauteng-South"
    WESTERN_CAPE = "Western-Cape"
    ALL = "all"


# --- Metrics ---

class MetricQueryRequest(BaseModel):
    """Request for a metrics query."""
    metric_type: MetricType
    zone: DeliveryZone = DeliveryZone.ALL
    granularity: TimeGranularity = TimeGranularity.DAILY
    from_date: datetime
    to_date: datetime


class MetricDataPoint(BaseModel):
    """Single data point in a metric time series."""
    timestamp: datetime
    value: float
    zone: str | None = None


class MetricQueryResponse(BaseModel):
    """Response with metric time series data."""
    metric_type: MetricType
    zone: str
    granularity: TimeGranularity
    data_points: list[MetricDataPoint]
    total: float
    average: float
    min_value: float
    max_value: float


# --- Reports ---

class ReportType(str, Enum):
    """Available report types."""
    DAILY_OPERATIONS = "daily_operations"
    WEEKLY_PERFORMANCE = "weekly_performance"
    MONTHLY_REVENUE = "monthly_revenue"
    DRIVER_PERFORMANCE = "driver_performance"
    PARTNER_PERFORMANCE = "partner_performance"
    SLA_COMPLIANCE = "sla_compliance"
    ESG_IMPACT = "esg_impact"


class GenerateReportRequest(BaseModel):
    """Request to generate a report."""
    report_type: ReportType
    from_date: datetime
    to_date: datetime
    zone: DeliveryZone = DeliveryZone.ALL
    format: str = "json"


class ReportResponse(BaseModel):
    """Generated report response."""
    report_id: str
    report_type: ReportType
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    zone: str
    sections: list[dict[str, Any]]
    summary: str


# --- Forecasting ---

class ForecastRequest(BaseModel):
    """Request for demand forecasting."""
    zone: DeliveryZone
    forecast_hours: int = Field(default=24, ge=1, le=168)
    include_confidence: bool = True


class ForecastDataPoint(BaseModel):
    """Single forecast data point."""
    timestamp: datetime
    predicted_orders: float
    confidence_low: float | None = None
    confidence_high: float | None = None
    drivers_needed: int


class ForecastResponse(BaseModel):
    """Demand forecast response."""
    zone: str
    forecast_hours: int
    data_points: list[ForecastDataPoint]
    model_version: str
    generated_at: datetime


# --- Health ---

class AnalyticsHealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    database_connected: bool
    timescaledb_connected: bool
    cache_connected: bool
