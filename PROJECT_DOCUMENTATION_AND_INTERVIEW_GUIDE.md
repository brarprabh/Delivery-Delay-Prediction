# DeliverIQ: Complete System Architecture, Engineering Process & Interview Guide

---

## 1. Executive Summary & Problem Formulation

### 1.1 What is DeliverIQ?
**DeliverIQ** is an enterprise-grade predictive logistics and supply chain analytics platform. It predicts whether a scheduled commercial shipment will experience delivery delays before carrier dispatch occurs. By coupling machine learning inference with confidence-filtered risk scoring, logistics teams can proactively intervene (e.g., reschedule routing, alert warehouse managers, change carriers) rather than reacting to SLA violations after the delay has already taken place.

### 1.2 The Business Problem
Supply chain networks lose billions annually due to delivery delays:
- Contractual SLA penalty fees.
- Customer churn and diminished Lifetime Value (LTV).
- Carrier expediting and emergency rerouting expenses.
- Lack of visibility: conventional ERP systems only record that a delivery is late *after* the expected delivery date has passed.

### 1.3 Target Variable Formulation
- **Target Feature**: `Late_delivery_risk`
- **Machine Learning Problem Type**: **Supervised Binary Classification**
  - Class `0`: **On-Time** (Shipment arrived on or before the committed delivery deadline).
  - Class `1`: **Late Delivery Risk** (Shipment breached or is predicted to breach the scheduled transit duration).
- **Target Distribution**:
  - Total records: 180,519 shipments
  - Late shipments (`1`): 98,977 (54.83%)
  - On-time shipments (`0`): 81,542 (45.17%)

---

## 2. Dataset Breakdown & Domain Context

### 2.1 The DataCo Smart Supply Chain Dataset
The application trains on real-world global logistics records enriched with atmospheric transit weather.

| Core Category | Features Included | Description & Significance |
| :--- | :--- | :--- |
| **Transit / Shipping** | `Shipping Mode`, `Days for shipment (scheduled)`, `Days for shipping (real)` | Carrier tier guarantee and committed turnaround window. |
| **Temporal / Dates** | `order date (DateOrders)`, `shipping date (DateOrders)` | Timestamp of order receipt and fulfillment. |
| **Geographic / Routing** | `Market`, `Order Region`, `Order City`, `Order State`, `Customer City`, `Customer State`, `Latitude`, `Longitude` | International shipping origins and destination corridors. |
| **Ambient Weather** | `Weather_Condition`, `Weather_Condition_Encoded`, `Days_and_Location` | Transit weather (e.g., Snow, Rain, Overcast, Clear). |
| **Financial / Economic** | `Sales`, `Benefit per order`, `Order Item Discount`, `Order Item Product Price`, `Order Profit Per Order` | Revenue, discount pressure, and commercial margins. |
| **Customer / Profile** | `Customer Segment`, `Department Name`, `Category Id`, `Type` | Segment behavior (Consumer vs Corporate) and payment instrument. |

### 2.2 Data Leakage Prevention (Crucial ML Concept)
In predictive modeling, **data leakage** occurs when features available *only after* the event has occurred are included in the training set. If retained, the model achieves artificial 100% test accuracy but fails completely in production.

#### Features Specifically Dropped to Prevent Leakage:
1. `Days for shipping (real)`: The exact elapsed shipping days. Knowing this renders the prediction trivial because `real > scheduled = late`.
2. `shipping date (DateOrders)` & `shipping_date`: Fulfillment timestamps recorded after dispatch.
3. `Delivery Status` & `Order Status`: Post-fulfillment tracking statuses (e.g., "Late delivery", "Shipping on time").
4. `Target_Date`: Future arrival indicator.
5. `Customer Email`, `Customer Password`, `Product Image`, `Product Description`: Redundant or high-cardinality PII with zero generalization value.
6. `Product Price`, `Order Item Total`: Duplicate collinear columns with `Sales` and `Order Item Product Price`.
7. `lat_round`, `lon_round`: Redundant rounded coordinates.

---

## 3. End-to-End Data Preprocessing & Feature Engineering Pipeline

The production pipeline in `backend/app/ml/train_and_export.py` enforces strict data isolation: all statistics, bounds, encodings, and scaling are **fit on the training set only** and saved as serializable metadata for online inference (`InferenceService`).

```
Raw Shipment Input
       │
       ▼
1. Drop Leakage & Non-Predictive Features
       │
       ▼
2. Domain Feature Engineering (Cyclic Dates, Transit Interaction, Profit Ratios)
       │
       ▼
3. Stratified Train-Test Split (80% Train, 20% Holdout Test)
       │
       ▼
4. Imputation (Train Mean for Numerics, Train Mode for Categoricals)
       │
       ▼
5. Outlier Capping (IQR 1.5× Bounds fit on Train)
       │
       ▼
6. Geographic Centroid Feature (Euclidean Distance to Train Median)
       │
       ▼
7. Skew Mitigation (log1p for features with |skew| > 0.5)
       │
       ▼
8. Categorical Encoding (One-Hot for <5 card, TargetEncoder for ≥5 card)
       │
       ▼
9. MinMax Normalization [0, 1]
       │
       ▼
10. Feature Reduction (Zero Variance → Collinear |r|>0.90 → Mutual Info Top 30)
       │
       ▼
11. Tier-Specific Cascade Classifier Routing
```

### 3.1 Feature Engineering Details
1. **Cyclic Time Encodings**:
   - Gregorian months and days of week are circular (e.g., December and January are adjacent, Sunday and Monday are adjacent).
   - Linear integers ($1 \dots 12$, $0 \dots 6$) introduce an artificial discontinuity between extremes.
   - We map calendar intervals onto unit circles using sine and cosine:
     $$\text{month\_sin} = \sin\left(\frac{2\pi \cdot \text{month}}{12}\right), \quad \text{month\_cos} = \cos\left(\frac{2\pi \cdot \text{month}}{12}\right)$$
     $$\text{dow\_sin} = \sin\left(\frac{2\pi \cdot \text{dow}}{7}\right), \quad \text{dow\_cos} = \cos\left(\frac{2\pi \cdot \text{dow}}{7}\right)$$
   - `is_weekend = int(order_dayofweek >= 5)` captures carrier dispatch slowdowns on Saturdays and Sundays.

2. **Carrier Tier Priority**:
   - `ship_priority`: Mapped numerically to dispatch speed:
     $$\text{Standard Class} \rightarrow 1, \quad \text{Second Class} \rightarrow 2, \quad \text{First Class} \rightarrow 3, \quad \text{Same Day} \rightarrow 4$$
   - `sched_x_priority = Days for shipment (scheduled) * ship_priority`: Captures carrier commitment urgency.

3. **Commercial & Pricing Ratios**:
   - `price_per_item = Sales / (Order Item Quantity + 1)`
   - `profit_margin = Benefit per order / (Sales + 1)`
   - `discount_ratio = Order Item Discount / (Order Item Product Price + 1)`

4. **Geographic Centroid Distance**:
   - Using the median latitude ($\approx 18.25^\circ$) and longitude ($\approx -66.03^\circ$) of the distribution center hub:
     $$\text{dist\_center} = \sqrt{(\text{Latitude} - \text{Lat}_{\text{med}})^2 + (\text{Longitude} - \text{Lon}_{\text{med}})^2}$$

5. **Skewness & Log Transformations**:
   - Skewed financial variables with $|\text{skew}| > 0.5$ (e.g., `Sales`, `Order Profit Per Order`) are stabilized with:
     $$x_{\text{transformed}} = \ln(1 + \max(0, x))$$

6. **Outlier Mitigation**:
   - Outliers are not dropped (which would delete production dispatches); instead, they are clipped to IQR whiskers:
     $$[Q_1 - 1.5 \times \text{IQR}, \quad Q_3 + 1.5 \times \text{IQR}]$$

7. **Categorical Encoding Strategy**:
   - **Low-cardinality** ($< 5$ unique classes, e.g., `Customer Segment`, `Type`): One-Hot Encoding (`pd.get_dummies(drop_first=True)`).
   - **High-cardinality** ($\ge 5$ unique classes, e.g., `Market`, `Order Region`, `Department Name`, `Weather_Condition`): Empirical Bayes **Target Encoding** (`category_encoders.TargetEncoder(smoothing=10)`) which encodes categories as the conditional mean of the target variable smoothed by global prior.

8. **Feature Selection (Three-Tier Filter)**:
   - **Stage 1 (Variance Threshold)**: Eliminated near-constant features ($\text{Var} < 0.001$).
   - **Stage 2 (Correlation Filter)**: Computed upper triangle correlation matrix; dropped collinear features where $|r| > 0.90$.
   - **Stage 3 (Mutual Information)**: Ranked remaining features using `mutual_info_classif` and selected the **Top 30 most informative features**.

---

## 4. Model Architecture & Selection: Why the Cascade Classifier Won

### 4.1 The Fundamental Insight: Shipping Mode Heterogeneity
Analyzing the dataset by shipping tier revealed that global models suffer because each tier operates under entirely distinct logistical dynamics and delay rates:

| Shipping Mode | Share of Total Orders | Actual Late Rate | Operational Reality |
| :--- | :---: | :---: | :---: |
| **First Class** | 15.4% | **95.32%** | Extremely tight 1-day deadline; nearly always delayed if any hiccup occurs. |
| **Second Class** | 19.5% | **76.63%** | 2-day delivery; significant positive-class imbalance. |
| **Same Day** | 5.4% | **45.74%** | Fast local dispatch; nearly balanced outcomes. |
| **Standard Class** | 59.7% | **38.07%** | High volume, 4-day scheduled transit; lower delay rate. |

A single global model fitted across all records treats these distinct operational regimes with an identical loss function, causing sub-optimal predictions.

### 4.2 The Winning Cascade Classifier
DeliverIQ implements a **Tier-Specific Cascade Architecture**: incoming shipments are routed to specialized sub-models calibrated specifically for that carrier tier.

```
Incoming Shipment
        │
        ├─► If Shipping Mode == "Standard Class"
        │     └─► LightGBM Classifier (is_unbalance=True, OOF-Tuned Threshold: 0.50)
        │
        ├─► If Shipping Mode == "Second Class"
        │     └─► XGBoost Classifier (scale_pos_weight calibrated to 3.28)
        │
        ├─► If Shipping Mode == "First Class"
        │     └─► Regularized Logistic Regression (SAGA solver, L2 penalty)
        │
        └─► If Shipping Mode == "Same Day"
              └─► Gradient Boosting Machine (Depth=3, 100 Estimators)
```

### 4.3 Out-of-Fold (OOF) Optimal Threshold Tuning
For Standard Class, the default decision boundary of $0.50$ is not assumed. A 5-fold Stratified cross-validation sweep over thresholds from $0.25$ to $0.55$ identifies the threshold that maximizes validation accuracy, yielding **0.50** calibrated against the unbalanced class weights.

### 4.4 The Confidence Band Mechanism ($\pm 0.10$ Margin)
In mission-critical logistics, uncertain predictions near the decision threshold are dangerous:
- **Decision Boundary**: Threshold $\theta$ (typically $0.50$).
- **Margin**: $M = 0.10$.
- **At-Risk / Uncertain Band**:
  $$\text{Condition: } \theta - M \le P(\text{Late}) < \theta + M \quad \Longleftrightarrow \quad [0.40, 0.60)$$
- **Confident Decision**:
  $$P(\text{Late}) < 0.40 \quad (\text{Confident On-Time}) \quad \lor \quad P(\text{Late}) \ge 0.60 \quad (\text{Confident Late})$$

Shipments in the uncertain band are surfaced in the UI with a distinct **"At-Risk / Uncertain" amber badge**, prompting dispatchers to conduct manual verification or buffer transit schedules.

---

## 5. Model Evaluation & Benchmark Comparison

All models were evaluated on the **exact same 20% stratified holdout test split** (36,104 unobserved shipments) using identical metrics:

| Architecture | Standard Accuracy | Confidence Accuracy | Gain from Confidence Filter | At-Risk Band (%) | F1 Score | ROC AUC |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cascade Classifier (Deployed)** | **81.74%** | **86.27%** | **+4.53%** | **15.3%** | **0.8377** | **0.871** |
| Random Forest | 80.17% | 85.33% | +5.16% | 16.3% | 0.8095 | 0.852 |
| XGBoost (Global) | 77.22% | 81.75% | +4.53% | 15.7% | 0.7848 | 0.834 |
| Gradient Boosting (Global) | 76.57% | 80.52% | +3.95% | 14.1% | 0.7794 | 0.828 |
| Logistic Regression (Global) | 75.51% | 78.90% | +3.39% | 15.2% | 0.7761 | 0.819 |

### 5.1 Test Split Confusion Matrix (Cascade Classifier)
On the holdout test set ($N = 36,104$):

| Actual \ Predicted | Predicted On-Time ($0$) | Predicted Late ($1$) | Total |
| :--- | :---: | :---: | :---: |
| **Actual On-Time ($0$)** | **12,418 (TN)** | 3,890 (FP) | 16,308 |
| **Actual Late ($1$)** | 2,702 (FN) | **17,094 (TP)** | 19,796 |

- **Sensitivity / Recall (Late Risk)**: $17,094 / 19,796 = \mathbf{86.35\%}$
- **Specificity (On-Time)**: $12,418 / 16,308 = \mathbf{76.15\%}$

---

## 6. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│   Tailwind CSS v4 • Lucide Icons • Recharts Analytics │
│   Pages: Overview, Predict, History, Analytics, Perf   │
└───────────────────────────▲────────────────────────────┘
                            │  HTTP / JSON (REST)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│   Uvicorn ASGI • Pydantic v2 Validation • Lifespan Init│
│   Endpoints: /api/predict, /api/predictions, /analytics│
└─────────────▲────────────────────────────▲─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐┌───────────────────────────┐
│     Inference Engine      ││     SQLite / SQLAlchemy   │
│ In-Memory Cascade Pipeline││ Persisted Prediction Logs │
│ Joblib Models & Metadata  ││ Audit Trail & Analytics   │
└───────────────────────────┘└───────────────────────────┘
```

### 6.1 Frontend Stack
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 with custom enterprise design tokens (`#111827`, `#0F766E`, `#14B8A6`, `#F7F8FA`).
- **Routing**: React Router 7.
- **Charts**: Recharts (Pie/Donut outcome ratios, stacked chronological trend bars, horizontal market and weather comparisons).
- **Icons**: Lucide React.

### 6.2 Backend Stack
- **Framework**: FastAPI (Python 3.10+ / 3.14 compatible).
- **Inference Runtime**: Singleton `InferenceService` loaded once in memory via FastAPI `lifespan` handler (zero disk reads per request).
- **Validation**: Pydantic v2 schemas for strict input verification.
- **Database**: SQLite with SQLAlchemy ORM.
- **Testing**: Pytest + FastAPI `TestClient`.

---

## 7. Application Walkthrough & User Experience

### 1. Overview Dashboard (`/`)
- **KPI Metrics**: Total predictions, on-time delivery rate, at-risk uncertainty count, and average delay probability.
- **Outcome Donut Chart**: Dynamic ratio of on-time versus late risk dispatches.
- **Tier Bar Chart**: Shipment volume broken down by carrier tier.
- **Recent Inferences Table**: Shows the latest dispatches with live status badges and direct inspect buttons.

### 2. Predict Delivery (`/predict`)
- **Quick Scenario Presets**: Instant one-click buttons for realistic logistics dispatches:
  - *Standard Class (Typical On-Time)*
  - *First Class (Tight Turnaround)*
  - *Second Class (Long Haul)*
  - *Same Day Rush*
- **Parameter Form**: Organized into 4 logical logistics groups (Transit Tier, Routing, Ambient Weather, Order Economics).
- **Inference Verdict Panel**:
  - Binary prediction outcome with color-coded status badge.
  - Confidence rating (Confident vs. At-Risk Band).
  - Delay Probability Gauge with marked threshold.
  - Directional Feature Drivers: highlights the top 6 contributing features that increased or reduced delay risk.

### 3. Prediction History (`/history`)
- Real-time search across cities, regions, and departments.
- Multi-parameter filtering by shipping tier, risk level, and market.
- Slide-out detail drawer displaying full feature inputs and audited decision parameters.

### 4. Analytics (`/analytics`)
- Chronological stacked bar charts tracking daily volumes and outcome ratios.
- Horizontal bar charts of delay rates across international sales markets.
- Ambient weather analysis showing delay rates under precipitation, snow, or overcast transit.

### 5. Model Performance (`/performance`)
- Benchmark comparison table of all evaluated models.
- Side-by-side standard versus confidence-filtered accuracy comparison.
- Full test-set confusion matrix and model architecture diagrams.

### 6. Settings (`/settings`)
- Live service health indicators (FastAPI backend, inference service RAM state, SQLite DB).
- Feature registry displaying the Top 30 features selected by Mutual Information.
- Calibrated thresholds and hyperparameter metadata.

---

## 8. Exhaustive Technical Interview Questions & Answers

### Architecture & ML Strategy

#### Q1: Why did you frame this problem as classification rather than regression?
**Answer**: In the dataset, while `Days for shipping (real)` exists, using it directly causes severe data leakage because the elapsed duration is only known after delivery finishes. The business problem in logistics centers on whether a carrier delivery commitment will be breached (SLA violation). Logistics operations make decisions based on risk probability: *Is this shipment at risk of missing its contractual delivery window?* Treating this as binary classification on `Late_delivery_risk` directly models business risk, allows probabilistic threshold calibration, and enables confidence margin filtering.

#### Q2: What is the Cascade Classifier and why is it superior to an XGBoost or Random Forest baseline?
**Answer**: The dataset exhibits extreme operational heterogeneity across the four shipping tiers. First Class has an actual late rate of 95.3% due to tight 1-day windows, whereas Standard Class has an actual late rate of 38.1% with 4 scheduled days. A single global model minimizes global loss, leading to miscalibrated probabilities for minority classes like Same Day or First Class. The Cascade Classifier partitions the input by shipping tier and delegates inference to a model specialized for that operational context (e.g., LightGBM with unbalance weighting for Standard Class, XGBoost for Second Class, Logistic Regression for First Class). This improved test set accuracy from 77.2% (global XGBoost) to 81.74%, and confidence-filtered accuracy to 86.27%.

#### Q3: What is the "Confidence Margin" and how does it create business value?
**Answer**: In binary classification, predictions with predicted probabilities close to the decision threshold (e.g., $P \in [0.45, 0.55]$) have the highest error rate. DeliverIQ introduces a margin $M = 0.10$. Dispatches with probabilities falling within $[\theta - 0.10, \theta + 0.10)$ are designated as the **At-Risk / Uncertain Band**. Rather than making automated, high-risk routing decisions on these borderline cases, the system flags them for human dispatcher review or schedule buffering. Filtering out this 15.3% uncertain band increases model accuracy from 81.74% to 86.27%.

#### Q4: How did you prevent data leakage during preprocessing?
**Answer**:
1. Dropped post-fulfillment columns (`Days for shipping (real)`, `Delivery Status`, `Order Status`, `shipping date`).
2. Executed a stratified train/test split *before* fitting any transformer.
3. Imputation values (numeric means, categorical modes), IQR clipping bounds, geographic medians, target encodings, and MinMax scaling parameters were calculated strictly on the training partition and persisted into `pipeline_metadata.joblib`. Online inference uses these pre-computed training parameters without ever touching test data.

#### Q5: How did you select the Top 30 features?
**Answer**: We utilized a three-tier reduction strategy:
1. **Variance Thresholding**: Removed static features with zero variance ($\text{Var} < 0.001$).
2. **Correlation Filtering**: Dropped one feature from each pair with Pearson correlation $|r| > 0.90$ to eliminate multicollinearity.
3. **Mutual Information (`mutual_info_classif`)**: Ranked the remaining features by non-linear dependency with the target variable, selecting the top 30 most predictive features.

#### Q6: How does the model provide explainability for individual predictions?
**Answer**: Each incoming feature value is transformed through the preprocessing pipeline into scaled space $[0, 1]$. The inference engine multiplies the distance of each feature from its baseline ($x - 0.5$) by the global feature importance score from the ensemble model. The engine outputs the top contributing features with directional tags:
- `increases_late_risk` (pushed the prediction toward late delivery)
- `reduces_late_risk` (promoted on-time arrival)

### Backend & Software Engineering

#### Q7: How does your backend handle inference performance under high request concurrency?
**Answer**:
1. **Zero Repeated Training / Disk Loading**: The model and transformers are loaded once during FastAPI's `lifespan` startup into a singleton `InferenceService` residing in RAM.
2. **Asynchronous Architecture**: FastAPI handles concurrent I/O requests non-blockingly on the Uvicorn ASGI event loop.
3. **Lightweight Preprocessing**: Inference executes vectorized NumPy and Pandas transformations using pre-fit metadata dictionaries, delivering sub-30ms prediction latency.

#### Q8: How is database persistence managed?
**Answer**: Using SQLAlchemy ORM connected to SQLite (`deliveriq.db`). Every prediction request submitted to `/api/predict` records:
- Sanitized input parameters.
- Raw JSON payload for full reproducibility.
- Computed probability, threshold, and confidence flags.
- Top feature explanation factors.
- Timestamps for historical trend and audit analysis.

#### Q9: What was the cause of the `[vite] http proxy error /api/health AggregateError [ECONNREFUSED]` error and how did you resolve it?
**Answer**: Modern Node.js environments resolve the hostname `localhost` to IPv6 (`::1`) first. The FastAPI backend was bound to IPv4 (`127.0.0.1:8000`). When Vite's dev server proxy forwarded requests to `http://localhost:8000`, the connection to `[::1]:8000` was refused. Changing the proxy target in `vite.config.js` to explicit IPv4 `http://127.0.0.1:8000` resolved the connection failure.

---

## 9. Key Project Metrics Quick-Reference Card

| Metric | Value |
| :--- | :--- |
| **Total Dataset Size** | 180,519 shipments |
| **Training Records (80%)** | 144,415 shipments |
| **Test Records (20%)** | 36,104 shipments |
| **Raw Feature Count** | 60 columns |
| **Production Features (Top MI)** | 30 features |
| **Winning Architecture** | Tier-Specific Cascade Classifier |
| **Test Accuracy (Standard)** | **81.74%** |
| **Test Accuracy (Confidence Filtered)** | **86.27%** |
| **Confidence Decision Margin** | $\pm 0.10$ |
| **At-Risk Band Proportion** | 15.3% |
| **Test Set F1 Score** | 0.8377 |
| **Test Set ROC AUC** | 0.871 |
| **Backend Latency** | $< 35\text{ ms}$ per prediction |
| **API Endpoints Tested** | 7/7 automated tests passing |
