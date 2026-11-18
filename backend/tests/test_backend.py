import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import Base, engine
from backend.app.services.inference import inference_service

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    inference_service.load()
    yield

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True

def test_model_info_endpoint():
    response = client.get("/api/model-info")
    assert response.status_code == 200
    data = response.json()
    assert "Cascade Classifier" in data["model_type"]
    assert len(data["selected_features"]) == 30
    assert "Cascade (Ours)" in data["evaluation_metrics"]
    assert data["cascade_thresholds"]["Standard Class"] > 0

def test_prediction_valid_input():
    payload = {
        "shipping_mode": "Standard Class",
        "days_scheduled": 4,
        "type": "TRANSFER",
        "order_city": "Bekasi",
        "order_state": "Jawa Barat",
        "order_region": "Southeast Asia",
        "market": "Pacific Asia",
        "customer_city": "Caguas",
        "customer_state": "PR",
        "customer_street": "5365 Cll. 19",
        "customer_zipcode": 725,
        "customer_segment": "Consumer",
        "department_name": "Fitness",
        "weather_condition": "Overcast",
        "latitude": 18.251453,
        "longitude": -66.037056,
        "order_item_quantity": 1,
        "sales": 327.75,
        "benefit_per_order": 91.25,
        "order_item_discount": 72.25,
        "order_item_product_price": 399.98
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "late_delivery_risk" in data
    assert data["late_delivery_risk"] in [0, 1]
    assert 0.0 <= data["probability"] <= 1.0
    assert data["tier_applied"] == "Standard Class"
    assert "risk_level" in data
    assert len(data["top_factors"]) > 0
    assert data["id"] is not None

def test_prediction_first_class_routing():
    payload = {
        "shipping_mode": "First Class",
        "days_scheduled": 1,
        "market": "Europe",
        "order_region": "Western Europe",
        "sales": 150.0
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["tier_applied"] == "First Class"

def test_prediction_invalid_input_validation():
    # Sending invalid data type for days_scheduled
    payload = {
        "shipping_mode": "Standard Class",
        "days_scheduled": "not-an-integer"
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 422

def test_list_predictions_and_detail():
    # Make a prediction
    client.post("/api/predict", json={"shipping_mode": "Same Day", "days_scheduled": 0})
    
    # List predictions
    response = client.get("/api/predictions")
    assert response.status_code == 200
    records = response.json()
    assert len(records) >= 1
    
    rec_id = records[0]["id"]
    detail_res = client.get(f"/api/predictions/{rec_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == rec_id

def test_analytics_endpoints():
    overview_res = client.get("/api/analytics/overview")
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert overview["total_predictions"] >= 1
    assert "on_time_rate" in overview

    trends_res = client.get("/api/analytics/trends")
    assert trends_res.status_code == 200
    trends = trends_res.json()
    assert "trends" in trends
    assert "market_distribution" in trends
