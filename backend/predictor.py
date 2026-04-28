from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

import joblib
import pandas as pd
import numpy as np


@dataclass(frozen=True)
class Artifacts:
    model: Any
    encoders: Dict[str, Any]


def load_artifacts(
    model_path: Union[str, Path] = "model.pkl",
    encoders_path: Union[str, Path] = "encoders.pkl",
) -> Artifacts:
    # Handle path flexibility (check root and backend folder)
    p_model = Path(model_path)
    p_enc = Path(encoders_path)
    
    if not p_model.exists():
        p_model = Path("backend") / model_path
    if not p_enc.exists():
        p_enc = Path("backend") / encoders_path

    if not p_model.exists() or not p_enc.exists():
        raise FileNotFoundError(f"Artifacts not found: {p_model}, {p_enc}")

    model = joblib.load(str(p_model))
    encoders = joblib.load(str(p_enc))
    return Artifacts(model=model, encoders=encoders)


def _encode_or_fallback(encoder: Any, value: str) -> Tuple[int, Optional[str]]:
    classes = list(getattr(encoder, "classes_", []))
    val_str = str(value)
    if val_str in classes:
        return int(encoder.transform([val_str])[0]), None
    fallback = "Unknown" if "Unknown" in classes else (classes[0] if classes else "0")
    try:
        encoded = int(encoder.transform([fallback])[0])
    except Exception:
        encoded = 0
    return encoded, f"Unseen value '{val_str}' mapped to '{fallback}'."


def build_feature_row(
    *,
    artifacts: Artifacts,
    city: str,
    cuisines: str,
    country: str,
    avg_cost_for_two: float,
    price_range: int,
    service_score: int,
) -> tuple[pd.DataFrame, list[str]]:
    enc = artifacts.encoders
    warnings: list[str] = []

    # 1. Cuisine Engineering (Sync with Final_RP.py)
    cuisine_list = [c.strip() for c in str(cuisines).split(',')]
    cuisine_count = len(cuisine_list)
    primary_cuisine = cuisine_list[0] if cuisine_list else "Unknown"

    # 2. Encoding
    # Handle "City, India" format from frontend
    city_clean = city.split(",")[0].strip()
    city_enc, w1 = _encode_or_fallback(enc.get("City"), city_clean)
    if w1: warnings.append(w1)
    
    primary_cuisine_enc, w2 = _encode_or_fallback(enc.get("primary_cuisine"), primary_cuisine)
    if w2: warnings.append(w2)
    
    country_enc, w3 = _encode_or_fallback(enc.get("country"), country)
    if w3: warnings.append(w3)

    # 3. Cost Transformation
    log_cost = np.log1p(float(avg_cost_for_two))

    # Feature Row Construction (Order must match training)
    # X = ['City', 'primary_cuisine', 'country', 'avg_cost_for_two', 'price_range', 'cuisine_count', 'service_score']
    base: dict[str, Any] = {
        "City": city_enc,
        "primary_cuisine": primary_cuisine_enc,
        "country": country_enc,
        "avg_cost_for_two": log_cost,
        "price_range": int(price_range),
        "cuisine_count": int(cuisine_count),
        "service_score": int(service_score),
    }

    # Verify column order against model if possible
    expected = getattr(artifacts.model, "feature_names_in_", None)
    if expected is not None:
        values = {name: base.get(name, 0) for name in list(expected)}
        return pd.DataFrame([values], columns=list(expected)), warnings
    
    # Fallback to explicit order
    cols = ['City', 'primary_cuisine', 'country', 'avg_cost_for_two', 'price_range', 'cuisine_count', 'service_score']
    values = {name: base.get(name, 0) for name in cols}
    return pd.DataFrame([values], columns=cols), warnings


def predict_rating(*, artifacts: Artifacts, features: pd.DataFrame) -> float:
    pred = artifacts.model.predict(features)
    res = float(pred[0])
    return 3.5 if (np.isnan(res) or res < 1.0) else res


def rating_to_popularity_percent(rating: float) -> float:
    clamped = max(1.0, min(5.0, rating))
    return ((clamped - 1.0) / 4.0) * 100.0
