import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.linear_model import Ridge
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, StackingRegressor
from sklearn.neighbors import KNeighborsRegressor
import joblib

# ---------------------------------------------------------------------------
# Load and preprocess data (same steps as Final_RP)
# ---------------------------------------------------------------------------
RAW_LOCAL_PATH = "backend/Zomato2_cleaned.csv"
if not Path(RAW_LOCAL_PATH).exists() and Path("Zomato2_cleaned.csv").exists():
    RAW_LOCAL_PATH = "Zomato2_cleaned.csv"

def load_and_preprocess():
    df = pd.read_csv(RAW_LOCAL_PATH)
    # Log transform cost
    df['avg_cost_for_two'] = np.log1p(df['avg_cost_for_two'])
    # Cuisine features
    df['cuisine_count'] = df['Cuisines'].apply(lambda x: len(str(x).split('|')))
    df['primary_cuisine'] = df['Cuisines'].apply(lambda x: str(x).split('|')[0].strip())
    # Encode categorical columns
    label_cols = ['City', 'primary_cuisine', 'country']
    encoders = {}
    for col in label_cols:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
    # Feature set and target
    X = df[['City', 'primary_cuisine', 'country', 'avg_cost_for_two',
            'price_range', 'cuisine_count', 'service_score']]
    y = df['Rating']
    return X, y, encoders

# ---------------------------------------------------------------------------
# Evaluation helper – prints train/test R2 and returns them
# ---------------------------------------------------------------------------
def evaluate(model, X_tr, X_te, y_tr, y_te, name):
    tr_pred = model.predict(X_tr)
    te_pred = model.predict(X_te)
    tr_r2 = r2_score(y_tr, tr_pred)
    te_r2 = r2_score(y_te, te_pred)
    print(f"--- {name} ---")
    print(f"  Train R2: {tr_r2*100:.2f}%")
    print(f"  Test R2 : {te_r2*100:.2f}%")
    print(f"  Gap     : {(tr_r2 - te_r2)*100:.2f}%")
    return tr_r2, te_r2

# ---------------------------------------------------------------------------
# Main training routine
# ---------------------------------------------------------------------------
def train_and_save():
    X, y, encoders = load_and_preprocess()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42)

    best_model = None
    best_score = -np.inf

    # 1. Ridge Regression (with Grid Search on alpha)
    ridge_pipeline = make_pipeline(StandardScaler(), Ridge())
    ridge_params = {'ridge__alpha': [0.1, 1.0, 10.0, 100.0]}
    ridge_grid = GridSearchCV(ridge_pipeline, ridge_params, cv=5, scoring='r2', n_jobs=-1)
    ridge_grid.fit(X_train, y_train)
    ridge_best = ridge_grid.best_estimator_
    _, te_r2 = evaluate(ridge_best, X_train, X_test, y_train, y_test, 'Ridge Regression')
    if te_r2 > best_score:
        best_score = te_r2
        best_model = ridge_best

    # 2. Decision Tree (regularized)
    dt_pipeline = make_pipeline(StandardScaler(), DecisionTreeRegressor(max_depth=5, min_samples_leaf=20, max_features='sqrt'))
    dt_pipeline.fit(X_train, y_train)
    _, te_r2 = evaluate(dt_pipeline, X_train, X_test, y_train, y_test, 'Decision Tree')
    if te_r2 > best_score:
        best_score = te_r2
        best_model = dt_pipeline

    # 3. Random Forest (regularized)
    rf_pipeline = make_pipeline(StandardScaler(), RandomForestRegressor(
        n_estimators=200,
        max_depth=6,
        min_samples_leaf=20,
        max_features='sqrt',
        random_state=42,
        n_jobs=-1))
    rf_pipeline.fit(X_train, y_train)
    _, te_r2 = evaluate(rf_pipeline, X_train, X_test, y_train, y_test, 'Random Forest')
    if te_r2 > best_score:
        best_score = te_r2
        best_model = rf_pipeline

    # 4. Gradient Boosting
    X_gb_train, X_gb_val, y_gb_train, y_gb_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42)
    gb_pipeline = make_pipeline(StandardScaler(), GradientBoostingRegressor(
        n_estimators=500,
        learning_rate=0.05,
        max_depth=3,
        min_samples_leaf=10,
        subsample=0.8,
        random_state=42))
    gb_pipeline.fit(X_gb_train, y_gb_train)
    _, val_r2 = evaluate(gb_pipeline, X_gb_train, X_gb_val, y_gb_train, y_gb_val, 'Gradient Boosting (val)')
    _, te_r2 = evaluate(gb_pipeline, X_train, X_test, y_train, y_test, 'Gradient Boosting')
    if te_r2 > best_score:
        best_score = te_r2
        best_model = gb_pipeline

    # 5. Stacking Ensemble
    base_estimators = [
        ('dt', DecisionTreeRegressor(max_depth=5, min_samples_leaf=20, max_features='sqrt')),
        ('rf', RandomForestRegressor(n_estimators=200, max_depth=6, min_samples_leaf=20, max_features='sqrt', random_state=42, n_jobs=-1)),
        ('knr', KNeighborsRegressor(n_neighbors=10))
    ]
    stack_pipeline = make_pipeline(
        StandardScaler(),
        StackingRegressor(
            estimators=base_estimators,
            final_estimator=Ridge(alpha=1.0),
            cv=5,
            n_jobs=-1
        )
    )
    stack_pipeline.fit(X_train, y_train)
    _, te_r2 = evaluate(stack_pipeline, X_train, X_test, y_train, y_test, 'Stacking Ensemble')
    if te_r2 > best_score:
        best_score = te_r2
        best_model = stack_pipeline

    # -----------------------------------------------------------------------
    # Persist the best model and encoders
    # -----------------------------------------------------------------------
    out_dir = Path("backend")
    if not out_dir.exists():
        out_dir = Path(".")
    
    model_path = out_dir / "model.pkl"
    enc_path = out_dir / "encoders.pkl"

    joblib.dump(best_model, str(model_path))
    joblib.dump(encoders, str(enc_path))
    
    print(f'\n[SUCCESS] Best model saved to {model_path}')
    print(f'[SUCCESS] Encoders saved to {enc_path}')

if __name__ == "__main__":
    train_and_save()
