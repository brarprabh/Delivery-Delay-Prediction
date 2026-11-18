import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "artifacts")

class InferenceService:
    def __init__(self):
        self.metadata = None
        self.scaler = None
        self.target_encoder = None
        self.cascade_models = None
        self.xgb_model = None
        self.evaluation_metrics = None
        self.loaded = False

    def load(self):
        if self.loaded:
            return

        meta_path = os.path.join(ARTIFACTS_DIR, "pipeline_metadata.joblib")
        if not os.path.exists(meta_path):
            raise FileNotFoundError(f"Pipeline metadata not found at {meta_path}. Run train_and_export.py first.")

        self.metadata = joblib.load(meta_path)
        self.scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "scaler.joblib"))
        
        te_path = os.path.join(ARTIFACTS_DIR, "target_encoder.joblib")
        if os.path.exists(te_path):
            self.target_encoder = joblib.load(te_path)
        
        self.cascade_models = joblib.load(os.path.join(ARTIFACTS_DIR, "cascade_models.joblib"))
        self.xgb_model = joblib.load(os.path.join(ARTIFACTS_DIR, "xgb_model.joblib"))

        metrics_path = os.path.join(ARTIFACTS_DIR, "evaluation_metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                self.evaluation_metrics = json.load(f)

        self.loaded = True
        print("InferenceService: ML Pipeline and Cascade Models successfully loaded into memory.")

    def preprocess_df(self, input_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Replicates the exact training preprocessing pipeline:
        1. Drop leakage / duplicate columns
        2. Feature engineering:
           - cyclic order month & dayofweek, is_weekend
           - ship_priority
           - sched_x_priority
           - price_per_item
           - profit_margin
           - discount_ratio
        3. Imputation using trained numeric_means and object_modes
        4. Outlier clipping using trained IQR bounds
        5. Geo dist_center using trained medians
        6. Log transforms for skewed columns
        7. One-hot encoding & Target encoding
        8. MinMax scaling
        9. Top-30 feature projection
        """
        df = input_df.copy()

        # Save shipping mode for cascade model routing
        if 'Shipping Mode' in df.columns:
            sm_series = df['Shipping Mode'].copy()
        else:
            sm_series = pd.Series(['Standard Class'] * len(df), index=df.index)

        # 1. Drop leakage / duplicates
        drop_cols = self.metadata['drop_cols']
        df.drop(columns=[c for c in drop_cols if c in df.columns], inplace=True)

        # 2. Feature engineering
        date_col = 'order date (DateOrders)'
        if date_col in df.columns:
            dt = pd.to_datetime(df[date_col], errors='coerce')
            df['order_month'] = dt.dt.month.fillna(6)
            df['order_dayofweek'] = dt.dt.dayofweek.fillna(2)
            df['month_sin'] = np.sin(2 * np.pi * df['order_month'] / 12)
            df['month_cos'] = np.cos(2 * np.pi * df['order_month'] / 12)
            df['dow_sin'] = np.sin(2 * np.pi * df['order_dayofweek'] / 7)
            df['dow_cos'] = np.cos(2 * np.pi * df['order_dayofweek'] / 7)
            df['is_weekend'] = (df['order_dayofweek'] >= 5).astype(int)
            df.drop(columns=[date_col], inplace=True)
        else:
            df['order_month'] = 6
            df['order_dayofweek'] = 2
            df['month_sin'] = 0.0
            df['month_cos'] = -1.0
            df['dow_sin'] = 0.97
            df['dow_cos'] = -0.22
            df['is_weekend'] = 0

        # ship_priority
        if 'Shipping Mode' in df.columns:
            df['ship_priority'] = df['Shipping Mode'].map(
                {'Standard Class': 1, 'Second Class': 2, 'First Class': 3, 'Same Day': 4}).fillna(1)
        else:
            df['ship_priority'] = 1

        # sched_x_priority
        if 'Days for shipment (scheduled)' in df.columns:
            df['sched_x_priority'] = df['Days for shipment (scheduled)'] * df['ship_priority']
        else:
            df['sched_x_priority'] = 4.0

        # price_per_item
        sales = df.get('Sales', 100.0)
        qty = df.get('Order Item Quantity', 1.0)
        df['price_per_item'] = sales / (qty + 1)

        # profit_margin
        benefit = df.get('Benefit per order', 20.0)
        df['profit_margin'] = benefit / (sales + 1)

        # discount_ratio
        discount = df.get('Order Item Discount', 0.0)
        prod_price = df.get('Order Item Product Price', 100.0)
        df['discount_ratio'] = discount / (prod_price + 1)

        # 3. Imputation
        for col, mean_val in self.metadata['numeric_means'].items():
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(mean_val)
            else:
                df[col] = mean_val

        for col, mode_val in self.metadata['object_modes'].items():
            if col in df.columns:
                df[col] = df[col].astype(str).fillna(mode_val)
                # replace 'nan' or 'None' strings with mode
                df[col] = df[col].replace({'nan': mode_val, 'None': mode_val})
            else:
                df[col] = mode_val

        # 4. Outlier clipping
        for col, (lo, hi) in self.metadata['iqr_bounds'].items():
            if col in df.columns:
                df[col] = df[col].clip(lo, hi)

        # 5. Geo feature
        geo = self.metadata['geo_ref']
        if geo and 'Latitude' in df.columns and 'Longitude' in df.columns:
            df['dist_center'] = np.sqrt((df['Latitude'] - geo['lat_med'])**2 + (df['Longitude'] - geo['lon_med'])**2)
        else:
            df['dist_center'] = 0.0

        # 6. Log transforms
        for col in self.metadata['skewed_log_cols']:
            if col in df.columns:
                df[f'{col}_log'] = np.log1p(df[col].clip(lower=0))

        # 7. Categorical Encoding
        low_card = self.metadata['low_card']
        if low_card:
            df = pd.get_dummies(df, columns=[c for c in low_card if c in df.columns], drop_first=True, dtype=int)

        high_card = self.metadata['high_card']
        if self.target_encoder is not None and high_card:
            existing_high = [c for c in high_card if c in df.columns]
            if existing_high:
                df[existing_high] = self.target_encoder.transform(df[existing_high])

        # Align columns to exact training structure before scaling
        expected_cols = self.metadata['encoded_columns_before_scaling']
        df = df.reindex(columns=expected_cols, fill_value=0)

        # 8. Scale
        scaled_array = self.scaler.transform(df)
        df_scaled = pd.DataFrame(scaled_array, columns=expected_cols, index=df.index)

        # 9. Project to Top 30 features
        selected_30 = self.metadata['selected_30']
        df_final = df_scaled[selected_30]

        return df_final, sm_series

    def predict_single(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict late delivery risk for a single order payload.
        Returns:
            - late_delivery_risk: int (0 or 1)
            - probability: float (0.0 to 1.0)
            - is_late: bool
            - is_confident: bool
            - is_at_risk: bool
            - tier_applied: str (Shipping mode model tier)
            - threshold_used: float
            - margin: float
            - risk_level: str ("High Risk", "At-Risk / Uncertain", "Low Risk / On-Time")
            - feature_contributions: List[Dict] (Top positive/negative drivers)
        """
        if not self.loaded:
            self.load()

        df_input = pd.DataFrame([input_data])
        X_proc, sm_series = self.preprocess_df(df_input)

        shipping_mode = str(sm_series.iloc[0]) if len(sm_series) > 0 else 'Standard Class'
        if shipping_mode not in self.cascade_models:
            shipping_mode = 'Standard Class'

        model = self.cascade_models[shipping_mode]
        threshold = self.metadata['cascade_thresholds'].get(shipping_mode, 0.5)
        margin = self.metadata['margin']

        proba = float(model.predict_proba(X_proc)[:, 1][0])

        is_late = bool(proba >= threshold)
        pred_label = 1 if is_late else 0

        # Confidence assessment
        is_confident = bool((proba < threshold - margin) or (proba >= threshold + margin))
        is_at_risk = not is_confident

        if is_at_risk:
            risk_level = "At-Risk / Uncertain"
        elif is_late:
            risk_level = "High Risk (Late Likely)"
        else:
            risk_level = "Low Risk (On-Time Likely)"

        # Compute feature explanation / contributions
        importances = self.metadata['feature_importances']
        feature_vals = X_proc.iloc[0].to_dict()
        top_factors = []
        for feat, val in feature_vals.items():
            imp = importances.get(feat, 0.0)
            score = float(imp * (val - 0.5) * 2)  # Directional impact
            top_factors.append({
                "feature": feat,
                "value": float(val),
                "importance": float(imp),
                "impact": score,
                "direction": "increases_late_risk" if score > 0 else "reduces_late_risk"
            })
        top_factors.sort(key=lambda x: abs(x["impact"]), reverse=True)

        return {
            "late_delivery_risk": pred_label,
            "probability": round(proba, 4),
            "is_late": is_late,
            "is_confident": is_confident,
            "is_at_risk": is_at_risk,
            "tier_applied": shipping_mode,
            "threshold_used": round(threshold, 2),
            "margin": margin,
            "risk_level": risk_level,
            "top_factors": top_factors[:6]
        }

    def predict_batch(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [self.predict_single(r) for r in records]

    def get_model_info(self) -> Dict[str, Any]:
        if not self.loaded:
            self.load()

        return {
            "model_type": "Tier-Specific Cascade Classifier",
            "confidence_margin": self.metadata['margin'],
            "cascade_thresholds": self.metadata['cascade_thresholds'],
            "selected_features": self.metadata['selected_30'],
            "evaluation_metrics": self.evaluation_metrics,
            "tiers": ["First Class (Logistic Regression)", "Second Class (XGBoost)", "Same Day (Gradient Boosting)", "Standard Class (LightGBM OOF-Tuned)"],
            "total_training_features": len(self.metadata['selected_30']),
            "status": "Loaded and Operational"
        }

# Singleton instance
inference_service = InferenceService()
