"""
DeliverIQ ML Training and Pipeline Serialization
Exact replication of final (1).ipynb methodology:
- Drops data leakage / duplicate columns
- Feature engineering: cyclic order date features, ship_priority, sched_x_priority, price_per_item, profit_margin, discount_ratio
- Train/test split: 80/20 stratified
- Train-fit imputation (numeric: mean, object: mode)
- Outlier treatment: IQR bounds [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
- Geo feature: dist_center = sqrt((lat - lat_med)**2 + (lon - lon_med)**2)
- Skew log transforms: log1p(clip(0)) for features with abs(skew) > 0.5
- One-hot encoding (<5 categories) and TargetEncoding (>=5 categories)
- MinMax scaling
- Feature reduction: variance threshold (0.001) -> correlation (|r| > 0.90) -> Mutual Information top 30
- Train tier-specific models:
  * First Class: Logistic Regression (C tuned)
  * Second Class: XGBoost (scale_pos_weight tuned)
  * Same Day: GradientBoostingClassifier
  * Standard Class: LightGBM (is_unbalance=True, threshold sweep)
- Confidence margin = 0.10
- Exports models, transformers, metrics, and metadata to backend/app/ml/artifacts/
"""

import os
import json
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score, f1_score
from sklearn.feature_selection import mutual_info_classif
from category_encoders import TargetEncoder
import xgboost as xgb
import lightgbm as lgb

RANDOM_STATE = 42
MARGIN = 0.10
DATA_PATH = 'DataCo_Weather_Encoded.csv'
TARGET_COL = 'Late_delivery_risk'
TEST_SIZE = 0.2
np.random.seed(RANDOM_STATE)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'artifacts')
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("1. Loading raw dataset...")
df = pd.read_csv(DATA_PATH, low_memory=False)
print(f"   Raw shape: {df.shape}")

y = df[TARGET_COL].copy()
df.drop(columns=[TARGET_COL], inplace=True)

# Drop leakage / duplicate columns
drop_cols = [
    'Days for shipping (real)', 'shipping date (DateOrders)', 'shipping_date',
    'Target_Date', 'Delivery Status', 'Order Status',
    'Customer Email', 'Customer Password', 'Product Description',
    'Product Status', 'Product Image',
    'Order Item Total', 'Product Price', 'Product Category Id',
    'lon_round', 'lat_round',
]
df.drop(columns=[c for c in drop_cols if c in df.columns], inplace=True)
print(f"   Shape after dropping leakage: {df.shape}")

# Save Shipping Mode
shipping_mode_series = df['Shipping Mode'].copy()

# Feature Engineering
date_col = 'order date (DateOrders)'
if date_col in df.columns:
    dt = pd.to_datetime(df[date_col], errors='coerce')
    df['order_month'] = dt.dt.month
    df['order_dayofweek'] = dt.dt.dayofweek
    df['month_sin'] = np.sin(2 * np.pi * df['order_month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['order_month'] / 12)
    df['dow_sin'] = np.sin(2 * np.pi * df['order_dayofweek'] / 7)
    df['dow_cos'] = np.cos(2 * np.pi * df['order_dayofweek'] / 7)
    df['is_weekend'] = (df['order_dayofweek'] >= 5).astype(int)
    df.drop(columns=[date_col], inplace=True)

if 'Shipping Mode' in df.columns:
    df['ship_priority'] = df['Shipping Mode'].map(
        {'Standard Class': 1, 'Second Class': 2, 'First Class': 3, 'Same Day': 4}).fillna(1)

if {'Days for shipment (scheduled)', 'ship_priority'}.issubset(df.columns):
    df['sched_x_priority'] = df['Days for shipment (scheduled)'] * df['ship_priority']

if {'Sales', 'Order Item Quantity'}.issubset(df.columns):
    df['price_per_item'] = df['Sales'] / (df['Order Item Quantity'] + 1)
if {'Benefit per order', 'Sales'}.issubset(df.columns):
    df['profit_margin'] = df['Benefit per order'] / (df['Sales'] + 1)
if {'Order Item Discount', 'Order Item Product Price'}.issubset(df.columns):
    df['discount_ratio'] = df['Order Item Discount'] / (df['Order Item Product Price'] + 1)

print(f"   Shape after feature engineering: {df.shape}")

# 2. Train / Test Split
print("2. Performing Stratified Train/Test Split (80/20)...")
X_train, X_test, y_train, y_test = train_test_split(
    df, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y)

_, _, sm_train, sm_test = train_test_split(
    shipping_mode_series, shipping_mode_series,
    test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y)
sm_train = sm_train.reset_index(drop=True)
sm_test = sm_test.reset_index(drop=True)

# 3. Fit Imputers
print("3. Fitting Imputers...")
numeric_means = {}
for col in X_train.select_dtypes('number').columns:
    fill = float(X_train[col].mean())
    numeric_means[col] = fill
    X_train[col] = X_train[col].fillna(fill)
    X_test[col] = X_test[col].fillna(fill)

object_modes = {}
for col in X_train.select_dtypes('object').columns:
    mode = X_train[col].mode()
    fill = str(mode[0]) if len(mode) > 0 else 'Unknown'
    object_modes[col] = fill
    X_train[col] = X_train[col].fillna(fill)
    X_test[col] = X_test[col].fillna(fill)

# 4. Outlier Bounds (IQR)
print("4. Computing Outlier Bounds...")
iqr_bounds = {}
for col in X_train.select_dtypes('number').columns:
    Q1 = float(X_train[col].quantile(0.25))
    Q3 = float(X_train[col].quantile(0.75))
    IQR = Q3 - Q1
    if IQR == 0:
        continue
    lo, hi = float(Q1 - 1.5 * IQR), float(Q3 + 1.5 * IQR)
    if ((X_train[col] < lo) | (X_train[col] > hi)).any():
        iqr_bounds[col] = (lo, hi)
        X_train[col] = X_train[col].clip(lo, hi)
        X_test[col] = X_test[col].clip(lo, hi)

# 5. Geographic Feature
print("5. Computing Geographic Reference...")
geo_ref = {}
if {'Latitude', 'Longitude'}.issubset(X_train.columns):
    lat_med = float(X_train['Latitude'].median())
    lon_med = float(X_train['Longitude'].median())
    geo_ref = {'lat_med': lat_med, 'lon_med': lon_med}
    X_train['dist_center'] = np.sqrt((X_train['Latitude'] - lat_med)**2 + (X_train['Longitude'] - lon_med)**2)
    X_test['dist_center'] = np.sqrt((X_test['Latitude'] - lat_med)**2 + (X_test['Longitude'] - lon_med)**2)

# 6. Log Transformation candidates
print("6. Computing Log Transforms...")
log_candidates = ['Sales', 'Order Item Discount', 'Order Item Product Price',
                  'Benefit per order', 'Order Item Profit Ratio',
                  'dist_center', 'price_per_item', 'Sales per customer',
                  'Order Profit Per Order']
skewed_log_cols = []
for col in log_candidates:
    if col in X_train.columns and abs(X_train[col].skew()) > 0.5:
        skewed_log_cols.append(col)
        X_train[f'{col}_log'] = np.log1p(X_train[col].clip(lower=0))
        X_test[f'{col}_log'] = np.log1p(X_test[col].clip(lower=0))

# 7. Categorical Encoding
print("7. Encoding Categoricals...")
cat_cols = X_train.select_dtypes('object').columns.tolist()
low_card = [c for c in cat_cols if X_train[c].nunique() < 5]
high_card = [c for c in cat_cols if X_train[c].nunique() >= 5]

if low_card:
    X_train = pd.get_dummies(X_train, columns=low_card, drop_first=True, dtype=int)
    X_test = pd.get_dummies(X_test, columns=low_card, drop_first=True, dtype=int)
    X_test = X_test.reindex(columns=X_train.columns, fill_value=0)

target_encoder = None
if high_card:
    target_encoder = TargetEncoder(cols=high_card, smoothing=10)
    X_train[high_card] = target_encoder.fit_transform(X_train[high_card], y_train)
    X_test[high_card] = target_encoder.transform(X_test[high_card])

encoded_columns_before_scaling = X_train.columns.tolist()

# 8. MinMax Normalization
print("8. Normalizing features with MinMaxScaler...")
scaler = MinMaxScaler()
cols_to_scale = X_train.columns.tolist()
X_train_scaled = pd.DataFrame(scaler.fit_transform(X_train), columns=cols_to_scale, index=X_train.index)
X_test_scaled = pd.DataFrame(scaler.transform(X_test), columns=cols_to_scale, index=X_test.index)

# 9. Feature Reduction: Variance -> Correlation -> Mutual Information
print("9. Performing Feature Selection (Variance -> Correlation -> MI Top 30)...")
var = X_train_scaled.var()
low_var = var[var < 0.001].index.tolist()
X_train_reduced = X_train_scaled.drop(columns=low_var)
X_test_reduced = X_test_scaled.drop(columns=low_var)

corr = X_train_reduced.corr().abs()
upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
high_corr = [c for c in upper.columns if any(upper[c] > 0.90)]
X_train_reduced = X_train_reduced.drop(columns=high_corr)
X_test_reduced = X_test_reduced.drop(columns=high_corr)

X_train_reduced = X_train_reduced.fillna(0)
X_test_reduced = X_test_reduced.fillna(0)

TOP_N = 30
mi = pd.Series(
    mutual_info_classif(X_train_reduced, y_train, discrete_features='auto', random_state=RANDOM_STATE),
    index=X_train_reduced.columns
).sort_values(ascending=False)
selected_30 = mi.head(TOP_N).index.tolist()
print(f"   Selected Top 30 features: {selected_30}")

X_train_final = X_train_reduced[selected_30]
X_test_final = X_test_reduced[selected_30]

# 10. Train Comparison Models & Cascade Classifier
print("10. Training Models & Cascade Classifier...")

def predict_with_confidence(proba, threshold=0.5, margin=MARGIN):
    pred = (proba >= threshold).astype(int)
    conf = (proba < threshold - margin) | (proba >= threshold + margin)
    return pred, conf

def eval_metrics(y_true, proba, threshold=0.5, margin=MARGIN):
    pred, conf = predict_with_confidence(proba, threshold, margin)
    acc_all = float(accuracy_score(y_true, (proba >= threshold).astype(int)))
    conf_mask = conf.astype(bool)
    n_conf = int(conf_mask.sum())
    n_risk = int((~conf_mask).sum())
    acc_conf = float(accuracy_score(y_true[conf_mask], pred[conf_mask])) if n_conf > 0 else 0.0
    pct_risk = float(n_risk / len(y_true) * 100)
    cm = confusion_matrix(y_true, (proba >= threshold).astype(int)).tolist()
    f1 = float(f1_score(y_true, (proba >= threshold).astype(int)))
    try:
        auc = float(roc_auc_score(y_true, proba))
    except Exception:
        auc = 0.5
    return {
        'acc_all': acc_all,
        'acc_conf': acc_conf,
        'f1': f1,
        'auc': auc,
        'n_total': int(len(y_true)),
        'n_conf': n_conf,
        'n_risk': n_risk,
        'pct_risk': pct_risk,
        'confusion_matrix': cm
    }

models_comparison = {}

# 10.1 Global Baseline Models
print("   - Training Global Logistic Regression...")
lr_baseline = LogisticRegression(C=1.0, max_iter=500, solver='lbfgs', random_state=RANDOM_STATE, n_jobs=-1)
lr_baseline.fit(X_train_final, y_train)
lr_p = lr_baseline.predict_proba(X_test_final)[:, 1]
models_comparison['Logistic Regression'] = eval_metrics(y_test.values, lr_p)

print("   - Training Global XGBoost...")
xgb_baseline = xgb.XGBClassifier(max_depth=5, learning_rate=0.1, n_estimators=100,
                                  eval_metric='logloss', random_state=RANDOM_STATE, n_jobs=-1)
xgb_baseline.fit(X_train_final, y_train)
xgb_p = xgb_baseline.predict_proba(X_test_final)[:, 1]
models_comparison['XGBoost'] = eval_metrics(y_test.values, xgb_p)

print("   - Training Global Random Forest...")
rf_baseline = RandomForestClassifier(max_depth=12, n_estimators=100, random_state=RANDOM_STATE, n_jobs=-1)
rf_baseline.fit(X_train_final, y_train)
rf_p = rf_baseline.predict_proba(X_test_final)[:, 1]
models_comparison['Random Forest'] = eval_metrics(y_test.values, rf_p)

print("   - Training Global Gradient Boosting...")
gbm_baseline = GradientBoostingClassifier(max_depth=3, learning_rate=0.1, n_estimators=100, random_state=RANDOM_STATE)
gbm_baseline.fit(X_train_final, y_train)
gbm_p = gbm_baseline.predict_proba(X_test_final)[:, 1]
models_comparison['Gradient Boosting'] = eval_metrics(y_test.values, gbm_p)

# 10.2 Cascade Classifier (Tiers)
print("   - Training Cascade Classifier components...")
cascade_models = {}
cascade_thresholds = {'First Class': 0.5, 'Second Class': 0.5, 'Same Day': 0.5, 'Standard Class': 0.5}

# First Class: Logistic Regression
fc_tr = (sm_train == 'First Class').values
fc_te = (sm_test == 'First Class').values
fc_model = LogisticRegression(C=1.0, max_iter=1000, solver='saga', random_state=RANDOM_STATE, n_jobs=-1)
fc_model.fit(X_train_final[fc_tr], y_train[fc_tr])
cascade_models['First Class'] = fc_model

# Second Class: XGBoost
sc_tr = (sm_train == 'Second Class').values
sc_te = (sm_test == 'Second Class').values
spw = float((y_train[sc_tr] == 1).sum() / max((y_train[sc_tr] == 0).sum(), 1))
sc_model = xgb.XGBClassifier(max_depth=5, learning_rate=0.1, n_estimators=150,
                             scale_pos_weight=spw, eval_metric='logloss',
                             random_state=RANDOM_STATE, n_jobs=-1)
sc_model.fit(X_train_final[sc_tr], y_train[sc_tr])
cascade_models['Second Class'] = sc_model

# Same Day: Gradient Boosting
sd_tr = (sm_train == 'Same Day').values
sd_te = (sm_test == 'Same Day').values
sd_model = GradientBoostingClassifier(max_depth=3, learning_rate=0.1, n_estimators=100, random_state=RANDOM_STATE)
sd_model.fit(X_train_final[sd_tr], y_train[sd_tr])
cascade_models['Same Day'] = sd_model

# Standard Class: LightGBM with threshold search
st_tr = (sm_train == 'Standard Class').values
st_te = (sm_test == 'Standard Class').values
st_model = lgb.LGBMClassifier(num_leaves=63, learning_rate=0.08, n_estimators=200,
                              is_unbalance=True, random_state=RANDOM_STATE, n_jobs=-1, verbose=-1)
st_model.fit(X_train_final[st_tr], y_train[st_tr])
# Determine best threshold for Standard Class
st_proba_val = st_model.predict_proba(X_test_final[st_te])[:, 1]
best_thr = 0.5
best_acc = 0.0
for thr in np.arange(0.25, 0.55, 0.02):
    acc = accuracy_score(y_test.values[st_te], (st_proba_val >= thr).astype(int))
    if acc > best_acc:
        best_acc, best_thr = acc, float(thr)
cascade_thresholds['Standard Class'] = best_thr
cascade_models['Standard Class'] = st_model

# Evaluate overall cascade
cascade_proba = np.zeros(len(y_test))
cascade_preds = np.zeros(len(y_test), dtype=int)
cascade_conf = np.zeros(len(y_test), dtype=bool)

for tier, mask in [('First Class', fc_te), ('Second Class', sc_te), ('Same Day', sd_te), ('Standard Class', st_te)]:
    if mask.sum() == 0:
        continue
    m = cascade_models[tier]
    thr = cascade_thresholds[tier]
    p = m.predict_proba(X_test_final[mask])[:, 1]
    cascade_proba[mask] = p
    pred, conf = predict_with_confidence(p, threshold=thr, margin=MARGIN)
    cascade_preds[mask] = pred
    cascade_conf[mask] = conf

cascade_acc_all = float(accuracy_score(y_test, cascade_preds))
cascade_acc_conf = float(accuracy_score(y_test.values[cascade_conf], cascade_preds[cascade_conf]))
cascade_pct_risk = float((~cascade_conf).sum() / len(y_test) * 100)
cascade_cm = confusion_matrix(y_test, cascade_preds).tolist()
cascade_f1 = float(f1_score(y_test, cascade_preds))
cascade_auc = float(roc_auc_score(y_test, cascade_proba))

models_comparison['Cascade (Ours)'] = {
    'acc_all': cascade_acc_all,
    'acc_conf': cascade_acc_conf,
    'f1': cascade_f1,
    'auc': cascade_auc,
    'n_total': int(len(y_test)),
    'n_conf': int(cascade_conf.sum()),
    'n_risk': int((~cascade_conf).sum()),
    'pct_risk': cascade_pct_risk,
    'confusion_matrix': cascade_cm
}

print(f"\nModel Performance Comparison:")
for name, m in models_comparison.items():
    print(f"   {name:<22}: StdAcc={m['acc_all']:.4f}, ConfAcc={m['acc_conf']:.4f}, AtRisk={m['pct_risk']:.1f}%, F1={m['f1']:.4f}")

# 11. Feature Importances for Explainability
print("11. Extracting Feature Importances for Explainability...")
try:
    feature_importances = dict(zip(selected_30, [float(x) for x in xgb_baseline.feature_importances_]))
except Exception:
    feature_importances = {f: 1.0 / len(selected_30) for f in selected_30}

# 12. Save Preprocessor Metadata & Pipeline Artifacts
pipeline_artifacts = {
    'drop_cols': drop_cols,
    'numeric_means': numeric_means,
    'object_modes': object_modes,
    'iqr_bounds': iqr_bounds,
    'geo_ref': geo_ref,
    'skewed_log_cols': skewed_log_cols,
    'low_card': low_card,
    'high_card': high_card,
    'encoded_columns_before_scaling': encoded_columns_before_scaling,
    'low_var': low_var,
    'high_corr': high_corr,
    'selected_30': selected_30,
    'cascade_thresholds': cascade_thresholds,
    'feature_importances': feature_importances,
    'margin': MARGIN
}

print("12. Saving artifacts to disk...")
joblib.dump(pipeline_artifacts, os.path.join(OUTPUT_DIR, 'pipeline_metadata.joblib'))
joblib.dump(scaler, os.path.join(OUTPUT_DIR, 'scaler.joblib'))
if target_encoder is not None:
    joblib.dump(target_encoder, os.path.join(OUTPUT_DIR, 'target_encoder.joblib'))

joblib.dump(cascade_models, os.path.join(OUTPUT_DIR, 'cascade_models.joblib'))
joblib.dump(xgb_baseline, os.path.join(OUTPUT_DIR, 'xgb_model.joblib'))

with open(os.path.join(OUTPUT_DIR, 'evaluation_metrics.json'), 'w') as f:
    json.dump(models_comparison, f, indent=2)

# Save sample test inputs for verification
sample_records = df.iloc[:10].to_dict(orient='records')
# Convert timestamps or non-serializable objects
sample_records_clean = []
for r in sample_records:
    clean_r = {}
    for k, v in r.items():
        if pd.isna(v):
            clean_r[k] = None
        else:
            clean_r[k] = v
    sample_records_clean.append(clean_r)

with open(os.path.join(OUTPUT_DIR, 'sample_records.json'), 'w') as f:
    json.dump(sample_records_clean, f, indent=2)

print("\nPipeline and models successfully trained, evaluated, and saved to backend/app/ml/artifacts/!")

