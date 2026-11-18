import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./deliveriq.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # Core input indicators
    shipping_mode = Column(String, index=True)
    days_scheduled = Column(Integer)
    market = Column(String, index=True)
    order_region = Column(String)
    order_city = Column(String)
    customer_city = Column(String)
    customer_segment = Column(String)
    department_name = Column(String)
    weather_condition = Column(String)
    order_item_quantity = Column(Integer)
    sales = Column(Float)
    benefit_per_order = Column(Float)
    payment_type = Column(String)

    # Full input payload for reproducibility
    raw_input = Column(JSON)

    # Prediction outcomes
    late_delivery_risk = Column(Integer, index=True) # 0 = On Time, 1 = Late
    probability = Column(Float)
    is_late = Column(Boolean)
    is_confident = Column(Boolean)
    is_at_risk = Column(Boolean)
    risk_level = Column(String) # "High Risk", "At-Risk / Uncertain", "Low Risk / On-Time"
    tier_applied = Column(String)
    threshold_used = Column(Float)
    
    # Explainability factors
    top_factors = Column(JSON)

    # Optional user notes or delivery tracking status
    actual_status = Column(String, nullable=True) # E.g., "Verified On-Time", "Verified Late", or null

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

