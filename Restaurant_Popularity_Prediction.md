#  ⚡Restaurant popularity prediction — Zomato Dataset

A machine learning project that predicts restaurant ratings using Zomato data. It includes a trained scikit-learn model, a Streamlit dashboard for interactive predictions, a modular Python backend (`predictor.py`), and Supabase Storage integration for syncing model artifacts.

---

## 📌 Project Overview

Given restaurant attributes like city, cuisine type, average cost, price range, and service score — the model predicts the expected **Zomato rating** for that restaurant.

**Use cases:**
- Restaurant owners estimating how they'd fare on Zomato before listing
- Data science exploration of what drives restaurant ratings
- Academic reference for ML pipelines with a real-world dataset

---

## 🗂️ Project Structure

```
Restaurant-Prediction-Zomato/
├── backend/
│   ├── model.pkl           # Trained ML model (scikit-learn)
│   ├── encoders.pkl        # Label encoders for categorical features
│   ├── predictor.py        # Core prediction logic
│   └── ...
├── frontend/               # JS/CSS frontend (dashboard UI)
├── scratch/                # Notebooks & exploratory scripts
│   ├── Final_RP.ipynb      # Training notebook
│   └── Final_RP.py         # Training script
├── test_predictor.py       # Quick sanity-check script
├── app.py                  # Streamlit app entry point
├── sync_supabase.py        # Artifact upload/download helper
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚙️ Tech Stack

| Layer | Tool |
|---|---|
| ML Model | scikit-learn |
| Data Processing | pandas, numpy |
| Serialization | joblib |
| Dashboard | Streamlit |
| Charts | Plotly |
| Artifact Storage | Supabase Storage |
| Config | python-dotenv |

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Codage-of-Param/Restaurant-Prediction-Zomato.git
cd Restaurant-Prediction-Zomato
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional — only needed if artifacts are stored in a subfolder
SUPABASE_BUCKET=ml-artifacts
SUPABASE_ARTIFACT_PREFIX=runs/2026-04-19
```

> ⚠️ Never commit `.env` to version control. It's already in `.gitignore`.

### 4. Run the Streamlit dashboard

```bash
streamlit run app.py
```

The app will load `model.pkl` and `encoders.pkl` from the `backend/` folder. If those files don't exist locally, it auto-downloads them from Supabase Storage (requires `SUPABASE_BUCKET` to be set).

---

## 🧪 Quick Prediction Test

Run the included test script to verify the model is working:

```bash
python test_predictor.py
```

Example output:
```
Predicted Rating: 3.8
```

The test uses a sample input:
- **City:** New Delhi
- **Cuisines:** North Indian, Mughlai
- **Country:** India
- **Avg cost for two:** ₹1500
- **Price range:** 3
- **Service score:** 2

---

## 🔮 Model Input Features

| Feature | Type | Description |
|---|---|---|
| `city` | string | City where the restaurant is located |
| `country` | string | Country |
| `cuisines` | string | Comma-separated cuisine types |
| `avg_cost_for_two` | int | Average cost in local currency |
| `price_range` | int (1–4) | Zomato price range bucket |
| `service_score` | int | Internal service quality score |

**Output:** Predicted Zomato aggregate rating (float)

---

## ☁️ Supabase Artifact Sync

Model artifacts (`model.pkl`, `encoders.pkl`) can be synced to/from Supabase Storage using `sync_supabase.py`.

**Upload:**
```bash
python sync_supabase.py upload-artifacts --bucket ml-artifacts
python sync_supabase.py upload-artifacts --bucket ml-artifacts --prefix runs/2026-04-19
```

**Download:**
```bash
python sync_supabase.py download-artifacts --bucket ml-artifacts
python sync_supabase.py download-artifacts --bucket ml-artifacts --prefix runs/2026-04-19
```

> This is Storage-only. The project does not use Supabase Postgres.

---

## 🏋️ Training the Model

The training notebook/script is in `scratch/`:

```bash
# As a script
python scratch/Final_RP.py

# Or open the notebook
jupyter notebook scratch/Final_RP.ipynb
```

After training, move the output artifacts to `backend/`:
```bash
mv model.pkl backend/
mv encoders.pkl backend/
```

---

## 📄 License

This project is open source. Feel free to use it for learning, academic, or personal projects.
