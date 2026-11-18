# DeliverIQ — Intelligent Delivery Prediction & Logistics Analytics Platform

DeliverIQ is an enterprise SaaS platform for predictive shipment risk scoring and cascade dispatch optimization, built from real-world supply chain and ambient transit data.

---

##  Key Architectural Highlights

1. **Cascade ML Architecture (Tier-Specialized Inference)**
   - Standard Class: LightGBM with out-of-fold optimal probability threshold tuning (`threshold=0.50`).
   - Second Class: XGBoost with positive-class imbalance weighting (`scale_pos_weight`).
   - First Class: Regularized Logistic Regression with SAGA solver.
   - Same Day: Gradient Boosting Machine.
   - Reaches **86.27% accuracy** on confident decisions with an **±0.10 decision margin filter**.

2. **Full Preprocessing Pipeline Preservation**
   - Exact replication of notebook transformations: cyclic order dates, priority-speed products, price per item, margin ratios, train-fit imputation, IQR outlier capping, geographic centroid Euclidean distance, log-skew transforms, target encoding, MinMax normalization, and top-30 mutual information feature selection.

3. **Enterprise UI & Interactive Explainability**
   - Built with React 19, Tailwind CSS v4, Lucide Icons, and Recharts.
   - Real-time directional feature impact drivers (`increases_late_risk` vs. `promotes_on_time`).
   - Audit trail persisted in SQLite via SQLAlchemy.

---

##  Project Structure

```
DeliverIQ/
├── backend/
│   ├── app/
│   │   ├── ml/
│   │   │   ├── artifacts/               # Serialized Joblib models, scalers & metadata
│   │   │   └── train_and_export.py     # End-to-end training and serialization script
│   │   ├── routes/
│   │   │   └── predictions.py          # REST API endpoints (/predict, /history, /analytics)
│   │   ├── services/
│   │   │   └── inference.py            # Singleton ML inference & explainability engine
│   │   ├── database.py                 # SQLite engine & SQLAlchemy models
│   │   ├── schemas.py                  # Pydantic v2 schemas
│   │   └── main.py                     # FastAPI application entrypoint
│   ├── tests/
│   │   └── test_backend.py             # Pytest automated test suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/                 # Sidebar, badges, KPI cards, spinners
│   │   ├── layouts/                    # Main application layout & navbar
│   │   ├── pages/                      # Overview, Predict, History, Analytics, Performance, Settings
│   │   ├── services/api.js             # API client
│   │   ├── App.jsx
│   │   └── index.css                   # Custom Tailwind theme
│   ├── package.json
│   └── vite.config.js
├── DataCo_Weather_Encoded.csv          # Raw training dataset (180,519 records)
├── final (1).ipynb                     # Original research & comparison notebook
├── .env.example
├── .gitignore
└── README.md
```

---

##  Installation & Setup Instructions

### 1. Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js 18+** & npm

### 2. Backend Setup
From the repository root:

```bash
# Install backend Python dependencies
pip install -r backend/requirements.txt
```

*(Optional)* Retrain and export the ML pipeline from the dataset:
```bash
python backend/app/ml/train_and_export.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

---

##  Running the Application

### Option A: Run Backend Server
From the project root:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs will be live at: `http://127.0.0.1:8000/docs`

### Option B: Run Frontend Dev Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
Open your browser at: `http://127.0.0.1:5173`

---

##  Running Automated Tests

Run the complete backend test suite:
```bash
$env:PYTHONPATH="." # On Windows PowerShell
pytest backend/tests/test_backend.py -v
```

Tests cover:
- `/api/health` connectivity
- `/api/model-info` cascade architecture verification
- Valid prediction inference & confidence calculations
- First-class tier routing
- Schema validation & invalid input rejections (422)
- Persistence in SQLite database
- History listing and record detail inspection
- Analytics overview and trend aggregations

---

##  Completed Application Modules

1. **Overview Dashboard**: Live KPI cards, delivery outcome ratio chart, tier shipment breakdown, and recent audited predictions with one-click inspection.
2. **Predict Delivery**: Dynamic form covering shipping tier, scheduled transit days, market routing, ambient weather, order economics, quick scenario presets, risk verdict meters, and directional feature drivers.
3. **Prediction History**: Audited table with real-time search, filters by shipping mode, market, and risk level, with a slide-out deep inspection drawer.
4. **Analytics**: Outcome trends over time, market delay rates, and ambient weather impact charts.
5. **Model Performance**: Full benchmark comparison table across all 5 evaluated architectures (Cascade, XGBoost, Random Forest, GBM, Logistic Regression), test-split confusion matrix, and confidence gains.
6. **Settings**: Real-time service connectivity health, inference engine status, active hyperparameters, and production feature registers.

