import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.database import init_db
from backend.app.services.inference import inference_service
from backend.app.routes.predictions import router as predictions_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    init_db()
    # Load ML pipeline once at startup
    inference_service.load()
    yield

app = FastAPI(
    title="DeliverIQ - Logistics & Delivery Prediction API",
    description="Enterprise Machine Learning platform for predictive delivery risk scoring and cascade dispatch optimization.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include prediction and analytics routes under /api
app.include_router(predictions_router, prefix="/api", tags=["Predictions & Analytics"])

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DeliverIQ Backend",
        "model_loaded": inference_service.loaded,
        "environment": os.getenv("ENV", "development")
    }

@app.get("/api/model-info")
def get_model_information():
    return inference_service.get_model_info()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

