from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class PredictionInput(BaseModel):
    # Key inputs commonly specified by logistics managers
    shipping_mode: str = Field(default="Standard Class", description="Shipping Mode: Standard Class, Second Class, First Class, Same Day")
    days_scheduled: int = Field(default=4, description="Days for shipment (scheduled)")
    type: str = Field(default="TRANSFER", description="Payment/Order Type: TRANSFER, PAYMENT, DEBIT, PAYMENT")
    order_city: str = Field(default="Bekasi", description="Destination Order City")
    order_state: str = Field(default="Jawa Barat", description="Destination Order State")
    order_region: str = Field(default="Southeast Asia", description="Order Region")
    market: str = Field(default="Pacific Asia", description="Geographic Market")
    customer_city: str = Field(default="Caguas", description="Customer Origin City")
    customer_state: str = Field(default="PR", description="Customer Origin State")
    customer_street: str = Field(default="5365 Cll. 19", description="Customer Origin Street Address")
    customer_zipcode: int = Field(default=725, description="Customer Zip Code")
    customer_segment: str = Field(default="Consumer", description="Customer Segment: Consumer, Corporate, Home Office")
    department_name: str = Field(default="Fitness", description="Department Name")
    weather_condition: str = Field(default="Overcast", description="Weather condition along transit")
    latitude: float = Field(default=18.251453, description="Origin Latitude")
    longitude: float = Field(default=-66.037056, description="Origin Longitude")
    order_item_quantity: int = Field(default=1, description="Order Item Quantity")
    sales: float = Field(default=327.75, description="Total Order Sales Amount ($)")
    benefit_per_order: float = Field(default=91.25, description="Net Profit Benefit per order ($)")
    order_item_discount: float = Field(default=72.25, description="Discount amount applied ($)")
    order_item_product_price: float = Field(default=399.98, description="Product base price ($)")
    order_date: Optional[str] = Field(default="2026-06-15 14:30:00", description="Order timestamp")

    # Catch-all for any extra attributes
    extra_features: Optional[Dict[str, Any]] = Field(default=None, description="Any additional dataset attributes")

class FeatureContribution(BaseModel):
    feature: str
    value: float
    importance: float
    impact: float
    direction: str

class PredictionResponse(BaseModel):
    id: Optional[int] = None
    late_delivery_risk: int
    probability: float
    is_late: bool
    is_confident: bool
    is_at_risk: bool
    risk_level: str
    tier_applied: str
    threshold_used: float
    margin: float
    top_factors: List[FeatureContribution]
    created_at: Optional[datetime] = None

class PredictionDetail(BaseModel):
    id: int
    created_at: datetime
    shipping_mode: str
    days_scheduled: int
    market: str
    order_region: str
    order_city: str
    customer_city: str
    customer_segment: str
    department_name: str
    weather_condition: str
    order_item_quantity: int
    sales: float
    benefit_per_order: float
    payment_type: str
    late_delivery_risk: int
    probability: float
    is_late: bool
    is_confident: bool
    is_at_risk: bool
    risk_level: str
    tier_applied: str
    threshold_used: float
    top_factors: Optional[List[Dict[str, Any]]] = None
    actual_status: Optional[str] = None
    raw_input: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class ModelMetrics(BaseModel):
    acc_all: float
    acc_conf: float
    f1: float
    auc: float
    n_total: int
    n_conf: int
    n_risk: int
    pct_risk: float
    confusion_matrix: List[List[int]]

class ModelInfoResponse(BaseModel):
    model_type: str
    confidence_margin: float
    cascade_thresholds: Dict[str, float]
    selected_features: List[str]
    evaluation_metrics: Dict[str, ModelMetrics]
    tiers: List[str]
    total_training_features: int
    status: str

class OverviewAnalyticsResponse(BaseModel):
    total_predictions: int
    late_count: int
    ontime_count: int
    at_risk_count: int
    confident_count: int
    on_time_rate: float
    average_delay_probability: float
    shipping_mode_breakdown: Dict[str, int]
    risk_level_breakdown: Dict[str, int]
    recent_predictions: List[PredictionDetail]

class TrendItem(BaseModel):
    date: str
    total: int
    late: int
    ontime: int
    at_risk: int

class TrendsAnalyticsResponse(BaseModel):
    trends: List[TrendItem]
    market_distribution: List[Dict[str, Any]]
    weather_impact: List[Dict[str, Any]]

