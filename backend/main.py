from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import numpy as np
import pandas as pd
from pathlib import Path

from supabase_client import download_file, get_supabase_client
from predictor import load_artifacts, build_feature_row, predict_rating, rating_to_popularity_percent

app = FastAPI(title="Zomato Predictor API")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    name: str = ""
    city: str
    country: str
    cuisines: str
    avg_cost_for_two: float
    price_range: int
    online_ordering: bool = True
    table_booking: bool = False
    delivering_now: bool = False
    min_rating: Optional[float] = 0.0
    price_label: Optional[str] = "Affordable"
    votes: Optional[int] = 0

class PredictResponse(BaseModel):
    restaurant_name: str
    predicted_rating: float
    popularity_percent: float
    warnings: List[str]
    success_label: str

def get_success_label(percent: float) -> str:
    if percent >= 80: return "HIGH SUCCESS"
    if percent >= 60: return "GOOD POTENTIAL"
    if percent >= 40: return "MODERATE"
    return "NEEDS WORK"

def _get_local_path(filename: str) -> str:
    """Helper to find files relative to script or in root."""
    if Path(filename).exists():
        return filename
    backend_path = Path("backend") / filename
    if backend_path.exists():
        return str(backend_path)
    return filename

def sync_model_from_supabase():
    try:
        bucket = os.getenv("SUPABASE_BUCKET")
        if not bucket:
            print("Supabase bucket not configured. Skipping cloud sync.")
            return

        print(f"Checking artifacts in Supabase bucket: {bucket}...")
        for f in ["model.pkl", "encoders.pkl", "Zomato2_cleaned.csv"]:
            dest = _get_local_path(f)
            if not Path(dest).exists():
                download_file(bucket=bucket, remote_path=f, local_path=dest)
                print(f"✅ Downloaded {f}")
        
        print("Artifacts sync check complete.")
    except Exception as e:
        print(f"Warning: Could not sync from Supabase: {e}")

# Run sync on startup
sync_model_from_supabase()

@app.get("/")
def read_root():
    return {"status": "alive", "engine": "FastAPI"}

@app.get("/options")
def get_options():
    try:
        csv_path = _get_local_path("Zomato2_cleaned.csv")
        df = pd.read_csv(csv_path)
        
        def get_unique_sorted(col):
            if col not in df.columns: return []
            return sorted([str(x) for x in df[col].unique() if pd.notna(x) and str(x) != "nan"])
            
        return {
            "cities": get_unique_sorted("City"),
            "cuisines": get_unique_sorted("primary_cuisine"),
            "countries": get_unique_sorted("country")
        }
    except Exception as e:
        print(f"Error in /options: {e}")
        return {"cities": ["Bangalore", "New Delhi"], "cuisines": ["North Indian"], "countries": ["India"]}

@app.post("/predict", response_model=PredictResponse)
def predict(data: PredictRequest):
    try:
        artifacts = load_artifacts()
    except Exception as e:
        print(f"Artifact loading error: {e}")
        return PredictResponse(
            restaurant_name=data.name or "Your restaurant",
            predicted_rating=0.0,
            popularity_percent=0.0,
            warnings=[f"Model Error: {str(e)}"],
            success_label="ERROR"
        )
    
    service_score = int(data.online_ordering) + int(data.table_booking) + int(data.delivering_now)
    
    try:
        features, warnings = build_feature_row(
            artifacts=artifacts,
            city=data.city,
            cuisines=data.cuisines,
            country=data.country,
            avg_cost_for_two=data.avg_cost_for_two,
            price_range=data.price_range,
            service_score=service_score
        )
        rating = predict_rating(artifacts=artifacts, features=features)
        percent = rating_to_popularity_percent(rating)
        
        response_data = PredictResponse(
            restaurant_name=data.name or "Your restaurant",
            predicted_rating=round(float(rating), 2),
            popularity_percent=round(float(percent), 1),
            warnings=warnings,
            success_label=get_success_label(percent)
        )
        
        try:
            client = get_supabase_client()
            record = data.dict()
            record.update({
                "predicted_rating": response_data.predicted_rating,
                "popularity_percent": response_data.popularity_percent,
                "success_label": response_data.success_label
            })
            client.table("predictions").insert(record).execute()
        except:
            pass

        return response_data
    except Exception as e:
        print(f"Prediction logic error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/benchmarks")
def get_benchmarks(city: str = None, cuisines: str = None):
    try:
        csv_path = _get_local_path("Zomato2_cleaned.csv")
        df = pd.read_csv(csv_path)
        
        # City Filter
        if city:
            # Handle "City, Country" format if passed
            city_pure = city.split(",")[0].strip()
            df = df[df['City'].str.contains(city_pure, case=False, na=False)]
        
        # Cuisine Filter (Partial match on full Cuisines string)
        if cuisines and not df.empty:
            # We look for ANY of the selected cuisines in the restaurant's cuisine list
            targets = [c.strip().lower() for c in cuisines.split(",")]
            
            def has_overlap(item):
                if pd.isna(item): return False
                item_lower = str(item).lower()
                return any(t in item_lower for t in targets)
            
            df = df[df['Cuisines'].apply(has_overlap)]

        # If we filtered too much, just show top of city
        if df.empty and city:
            df = pd.read_csv(csv_path)
            city_pure = city.split(",")[0].strip()
            df = df[df['City'].str.contains(city_pure, case=False, na=False)]

        top_picks = df.sort_values(by="Rating", ascending=False).head(15)
        data = []
        for _, row in top_picks.iterrows():
            data.append({
                "restaurant_name": row["restaurant_name"],
                "city": row["City"],
                "cuisines": row.get("Cuisines", "Unknown"),
                "rating": row["Rating"],
                "avg_cost_for_two": row["avg_cost_for_two"],
                "price_range": row["price_range"]
            })
        return {"data": data}
    except Exception as e:
        print(f"Error fetching benchmarks: {e}")
        return {"data": [], "error": str(e)}
