import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.database import get_db, PredictionRecord
from backend.app.schemas import (
    PredictionInput,
    PredictionResponse,
    PredictionDetail,
    OverviewAnalyticsResponse,
    TrendsAnalyticsResponse
)
from backend.app.services.inference import inference_service

router = APIRouter()

def convert_input_to_raw_features(inp: PredictionInput) -> dict:
    """Map user-friendly schema to exact dataset column naming convention."""
    data = {
        'Shipping Mode': inp.shipping_mode,
        'Days for shipment (scheduled)': inp.days_scheduled,
        'Type': inp.type,
        'Order City': inp.order_city,
        'Order State': inp.order_state,
        'Order Region': inp.order_region,
        'Market': inp.market,
        'Customer City': inp.customer_city,
        'Customer State': inp.customer_state,
        'Customer Street': inp.customer_street,
        'Customer Zipcode': inp.customer_zipcode,
        'Customer Segment': inp.customer_segment,
        'Department Name': inp.department_name,
        'Weather_Condition': inp.weather_condition,
        'Latitude': inp.latitude,
        'Longitude': inp.longitude,
        'Order Item Quantity': inp.order_item_quantity,
        'Sales': inp.sales,
        'Benefit per order': inp.benefit_per_order,
        'Order Item Discount': inp.order_item_discount,
        'Order Item Product Price': inp.order_item_product_price,
        'order date (DateOrders)': inp.order_date or datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        'Order Id': 100000,
        'Customer Id': 5000,
        'Customer Fname': 'Valued',
        'Customer Lname': 'Client',
        'Order Zipcode': inp.customer_zipcode,
        'Department Id': 2,
        'Category Id': 17,
        'Days_and_Location': f"{inp.days_scheduled}_{inp.order_city}",
        'Weather_Condition_Encoded': 1
    }
    if inp.extra_features:
        data.update(inp.extra_features)
    return data

@router.post("/predict", response_model=PredictionResponse, status_code=status.HTTP_201_CREATED)
def predict_delivery(input_data: PredictionInput, db: Session = Depends(get_db)):
    """
    Run inference with the Cascade Classifier pipeline, compute confidence & explanation,
    and persist the prediction to SQLite.
    """
    raw_payload = convert_input_to_raw_features(input_data)
    
    try:
        pred_res = inference_service.predict_single(raw_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference pipeline execution failed: {str(e)}"
        )

    # Persist record to database
    record = PredictionRecord(
        created_at=datetime.datetime.utcnow(),
        shipping_mode=input_data.shipping_mode,
        days_scheduled=input_data.days_scheduled,
        market=input_data.market,
        order_region=input_data.order_region,
        order_city=input_data.order_city,
        customer_city=input_data.customer_city,
        customer_segment=input_data.customer_segment,
        department_name=input_data.department_name,
        weather_condition=input_data.weather_condition,
        order_item_quantity=input_data.order_item_quantity,
        sales=input_data.sales,
        benefit_per_order=input_data.benefit_per_order,
        payment_type=input_data.type,
        raw_input=raw_payload,
        late_delivery_risk=pred_res["late_delivery_risk"],
        probability=pred_res["probability"],
        is_late=pred_res["is_late"],
        is_confident=pred_res["is_confident"],
        is_at_risk=pred_res["is_at_risk"],
        risk_level=pred_res["risk_level"],
        tier_applied=pred_res["tier_applied"],
        threshold_used=pred_res["threshold_used"],
        top_factors=pred_res["top_factors"]
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    pred_res["id"] = record.id
    pred_res["created_at"] = record.created_at
    return pred_res

@router.get("/predictions", response_model=List[PredictionDetail])
def list_predictions(
    shipping_mode: Optional[str] = None,
    risk_level: Optional[str] = None,
    market: Optional[str] = None,
    late_only: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve persisted predictions with filtering, searching, and pagination."""
    query = db.query(PredictionRecord)

    if shipping_mode:
        query = query.filter(PredictionRecord.shipping_mode == shipping_mode)
    if risk_level:
        query = query.filter(PredictionRecord.risk_level == risk_level)
    if market:
        query = query.filter(PredictionRecord.market == market)
    if late_only is not None:
        query = query.filter(PredictionRecord.late_delivery_risk == (1 if late_only else 0))
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (PredictionRecord.order_city.ilike(search_pattern)) |
            (PredictionRecord.customer_city.ilike(search_pattern)) |
            (PredictionRecord.order_region.ilike(search_pattern)) |
            (PredictionRecord.department_name.ilike(search_pattern))
        )

    records = query.order_by(desc(PredictionRecord.created_at)).offset(offset).limit(limit).all()
    return records

@router.get("/predictions/{record_id}", response_model=PredictionDetail)
def get_prediction_detail(record_id: int, db: Session = Depends(get_db)):
    """Fetch complete details of a specific prediction by ID."""
    record = db.query(PredictionRecord).filter(PredictionRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Prediction with ID {record_id} not found.")
    return record

@router.get("/analytics/overview", response_model=OverviewAnalyticsResponse)
def get_analytics_overview(db: Session = Depends(get_db)):
    """Aggregated KPI metrics and recent activity for the overview dashboard."""
    total = db.query(PredictionRecord).count()
    if total == 0:
        return OverviewAnalyticsResponse(
            total_predictions=0,
            late_count=0,
            ontime_count=0,
            at_risk_count=0,
            confident_count=0,
            on_time_rate=100.0,
            average_delay_probability=0.0,
            shipping_mode_breakdown={},
            risk_level_breakdown={},
            recent_predictions=[]
        )

    late_count = db.query(PredictionRecord).filter(PredictionRecord.late_delivery_risk == 1).count()
    ontime_count = total - late_count
    at_risk_count = db.query(PredictionRecord).filter(PredictionRecord.is_at_risk == True).count()
    confident_count = total - at_risk_count
    on_time_rate = round((ontime_count / total) * 100, 2)

    avg_prob = db.query(func.avg(PredictionRecord.probability)).scalar() or 0.0

    # Shipping mode breakdown
    sm_counts = (
        db.query(PredictionRecord.shipping_mode, func.count(PredictionRecord.id))
        .group_by(PredictionRecord.shipping_mode)
        .all()
    )
    sm_dict = {sm: cnt for sm, cnt in sm_counts if sm}

    # Risk level breakdown
    rl_counts = (
        db.query(PredictionRecord.risk_level, func.count(PredictionRecord.id))
        .group_by(PredictionRecord.risk_level)
        .all()
    )
    rl_dict = {rl: cnt for rl, cnt in rl_counts if rl}

    # Recent 5 predictions
    recent = db.query(PredictionRecord).order_by(desc(PredictionRecord.created_at)).limit(5).all()

    return OverviewAnalyticsResponse(
        total_predictions=total,
        late_count=late_count,
        ontime_count=ontime_count,
        at_risk_count=at_risk_count,
        confident_count=confident_count,
        on_time_rate=on_time_rate,
        average_delay_probability=round(float(avg_prob), 4),
        shipping_mode_breakdown=sm_dict,
        risk_level_breakdown=rl_dict,
        recent_predictions=recent
    )

@router.get("/analytics/trends", response_model=TrendsAnalyticsResponse)
def get_analytics_trends(db: Session = Depends(get_db)):
    """Trends over time, market breakdown, and transit weather impact."""
    records = db.query(PredictionRecord).order_by(PredictionRecord.created_at).all()
    
    # Group by date (YYYY-MM-DD)
    date_buckets = {}
    market_map = {}
    weather_map = {}

    for r in records:
        dt_str = r.created_at.strftime("%Y-%m-%d")
        if dt_str not in date_buckets:
            date_buckets[dt_str] = {"date": dt_str, "total": 0, "late": 0, "ontime": 0, "at_risk": 0}
        
        date_buckets[dt_str]["total"] += 1
        if r.late_delivery_risk == 1:
            date_buckets[dt_str]["late"] += 1
        else:
            date_buckets[dt_str]["ontime"] += 1
        if r.is_at_risk:
            date_buckets[dt_str]["at_risk"] += 1

        # Market grouping
        m = r.market or "Unknown"
        if m not in market_map:
            market_map[m] = {"name": m, "total": 0, "late": 0}
        market_map[m]["total"] += 1
        if r.late_delivery_risk == 1:
            market_map[m]["late"] += 1

        # Weather grouping
        w = r.weather_condition or "Clear"
        if w not in weather_map:
            weather_map[w] = {"condition": w, "total": 0, "late": 0}
        weather_map[w]["total"] += 1
        if r.late_delivery_risk == 1:
            weather_map[w]["late"] += 1

    trend_list = sorted(list(date_buckets.values()), key=lambda x: x["date"])

    market_list = []
    for k, v in market_map.items():
        rate = round((v["late"] / v["total"]) * 100, 1) if v["total"] > 0 else 0.0
        market_list.append({"market": k, "total": v["total"], "late": v["late"], "late_rate": rate})

    weather_list = []
    for k, v in weather_map.items():
        rate = round((v["late"] / v["total"]) * 100, 1) if v["total"] > 0 else 0.0
        weather_list.append({"weather": k, "total": v["total"], "late": v["late"], "late_rate": rate})

    return TrendsAnalyticsResponse(
        trends=trend_list,
        market_distribution=market_list,
        weather_impact=weather_list
    )

