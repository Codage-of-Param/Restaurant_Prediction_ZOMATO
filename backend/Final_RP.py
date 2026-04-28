# # **Restaurant Popularity Prediction — Optimized Version**

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import os
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, AdaBoostRegressor, StackingRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression
from sklearn.neighbors import KNeighborsRegressor
from supabase_client import download_file, upload_file
from train_models import train_and_save

# --- Supabase Config ---
BUCKET = os.getenv("SUPABASE_BUCKET", "ml-artifacts") 
RAW_REMOTE_PATH = "Zomato2.csv"
RAW_LOCAL_PATH = "Zomato2.csv"

def sync_from_cloud():
    print(f"--- Syncing raw data from Supabase bucket: {BUCKET} ---")
    try:
        download_file(bucket=BUCKET, remote_path=RAW_REMOTE_PATH, local_path=RAW_LOCAL_PATH)
        print("[SUCCESS] Raw data downloaded successfully.")
    except Exception as e:
        print(f"[WARNING] Could not download from cloud, checking local: {e}")
        if not Path(RAW_LOCAL_PATH).exists():
            raise FileNotFoundError(f"Missing {RAW_LOCAL_PATH} locally and on cloud.")

def sync_to_cloud():
    print(f"--- Uploading results to Supabase bucket: {BUCKET} ---")
    
    base_dir = "backend/" if Path("backend").exists() else ""
    
    files = {
        f"{base_dir}model.pkl": "model.pkl", 
        f"{base_dir}encoders.pkl": "encoders.pkl", 
        f"{base_dir}Zomato2_cleaned.csv" if Path(f"{base_dir}Zomato2_cleaned.csv").exists() else "Zomato2_cleaned.csv": "Zomato2_cleaned.csv"
    }
    
    for local, remote in files.items():
        try:
            if Path(local).exists():
                upload_file(bucket=BUCKET, remote_path=remote, local_path=local)
                print(f"[SUCCESS] Uploaded {local} to {remote}")
            else:
                print(f"[WARNING] Local file missing, skip upload: {local}")
        except Exception as e:
            print(f"[ERROR] Failed to upload {local}: {e}")


def main():
    sync_from_cloud()
    df = pd.read_csv(RAW_LOCAL_PATH, encoding="unicode_escape")
    print(f"Shape on load: {df.shape}")

    # # **Data Preprocessing**

    # Dropping useless columns
    df.drop(columns=["Switch_to_order_menu", "LocalityVerbose", "Address"], inplace=True)

    # Rename Cols
    df.rename(columns={
        "RestaurantID"       : "restaurant_id",
        "RestaurantName"     : "restaurant_name",
        "CountryCode"        : "country_code",
        "Price_range"        : "price_range",
        "Average_Cost_for_two": "avg_cost_for_two",
    }, inplace=True)

    # Handling Cuisines
    df['Cuisines'].fillna("Unknown", inplace=True)

    # --- NEW: Cuisine Engineering ---
    # 1. Count of Cuisines
    df['cuisine_count'] = df['Cuisines'].apply(lambda x: len(str(x).split('|')))
    # 2. Primary Cuisine (The first mentioned)
    df['primary_cuisine'] = df['Cuisines'].apply(lambda x: str(x).split('|')[0].strip())

    # Map Countries
    country_map = {
        1  : "India",          14 : "Australia",    30 : "Brazil",
        37 : "Canada",         94 : "Indonesia",    148: "New Zealand",
        162: "Philippines",    166: "Qatar",         184: "Singapore",
        189: "South Africa",   191: "Sri Lanka",    208: "Turkey",
        214: "UAE",            215: "United Kingdom", 216: "United States",
    }
    df["country"] = df["country_code"].map(country_map)
    df.drop(columns=["country_code"], inplace=True)

    # Handle unrated
    unrated_mask = (df["Rating"] == 1.0) & (df["Votes"] == 0)
    df.loc[unrated_mask, "Rating"] = np.nan
    df["is_rated"] = (~unrated_mask).astype(int)

    # City Imputation
    city_median_rating = df.groupby("City")["Rating"].transform("median")
    df["Rating"] = df["Rating"].fillna(city_median_rating)
    df["Rating"].fillna(df["Rating"].median(), inplace=True) # Global fallback

    # Service Score
    binary_cols = ["Has_Table_booking", "Has_Online_delivery", "Is_delivering_now"]
    for col in binary_cols:
        df[col] = (df[col].astype(str).str.strip() == "Yes").astype(int)
    df["service_score"] = df["Has_Table_booking"] + df["Has_Online_delivery"] + df["Is_delivering_now"]
    df.drop(columns=['Has_Table_booking','Has_Online_delivery','Is_delivering_now', 'Currency'], inplace=True)

    # Save Cleaned Data
    df.to_csv("Zomato2_cleaned.csv", index=False)

    # # **Model Preparation & Training (Delegated to train_models.py)**
    train_and_save()

    # Push to cloud
    sync_to_cloud()

if __name__ == "__main__":
    main()