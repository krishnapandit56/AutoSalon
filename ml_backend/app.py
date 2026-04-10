import pickle
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ─── MODELS ──────────────────────────────────────────────────────────────────
churn_model_path = "catboost_model.pkl"
demand_model_path = "xgboost_demand_model.pkl"
demand_encoder_path = "demand_encoders.pkl"

print("Loading Models...")

# 1. Churn Model (CatBoost)
try:
    with open(churn_model_path, "rb") as f:
        churn_model = pickle.load(f)
    print("Churn model (CatBoost) loaded.")
except Exception as e:
    print(f"Churn model failed: {e}")
    churn_model = None

# 2. Demand Model (XGBoost)
try:
    with open(demand_model_path, "rb") as f:
        demand_model = pickle.load(f)
    with open(demand_encoder_path, "rb") as f:
        demand_encoders = pickle.load(f)
    print("Demand model (XGBoost) loaded.")
except Exception as e:
    print(f"Demand model failed: {e}")
    demand_model = None

# ─── FEATURES ────────────────────────────────────────────────────────────────

churn_features = [
    'age', 'gender', 'city', 'total_visits', 'days_since_last_visit', 
    'avg_visit_gap_days', 'num_services_used', 'has_preferred_employee', 
    'avg_spend_per_visit', 'last_visit_spend', 'total_spend', 'rating', 
    'appointments_cancelled', 'booking_source'
]

demand_features = [
    'age', 'gender', 'city', 'total_visits', 'days_since_last_visit',
    'avg_visit_gap_days', 'has_preferred_employee', 'avg_spend_per_visit',
    'last_visit_spend', 'total_spend', 'avg_rating', 'appointments_cancelled',
    'booking_source', 'preferred_service'
]

categorical_cols = ['gender', 'city', 'booking_source', 'preferred_service']

def get_risk_level(prob):
    if prob > 0.70: return "High Risk"
    elif prob > 0.30: return "Medium"
    else: return "Low Risk"

# ─── ENDPOINTS ───────────────────────────────────────────────────────────────

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if churn_model is None:
            return jsonify({'error': 'Churn model not loaded.'}), 503
        
        data = request.json
        if 'avg_rating' in data and 'rating' not in data:
            data['rating'] = data['avg_rating']

        df = pd.DataFrame([data])
        
        # DYNAMIC ALIGNMENT: Use features from the loaded model object
        try:
            # CatBoost stores feature names in .feature_names_
            model_features = churn_model.feature_names_
        except:
            # Fallback to hardcoded list if model lacks metadata
            model_features = [
                'age', 'gender', 'city', 'total_visits', 'days_since_last_visit', 
                'avg_visit_gap_days', 'num_services_used', 'has_preferred_employee', 
                'avg_spend_per_visit', 'last_visit_spend', 'total_spend', 'rating', 
                'appointments_cancelled', 'booking_source'
            ]

        # Categorical columns for this model
        cat_cols = ['gender', 'city', 'booking_source']

        # Aligned features: ensures all required columns exist, fills missing with 0
        X = df.reindex(columns=model_features).fillna(0)
        
        # Data types conversion
        num_cols = [c for c in model_features if c not in cat_cols]
        if num_cols:
            X[num_cols] = X[num_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
        
        # Ensure categorical are strings and have a value
        X[cat_cols] = X[cat_cols].astype(str).replace(['0', '0.0', 'nan', 'None'], 'Unknown').fillna('Unknown')

        # Predict
        prediction = churn_model.predict(X)[0]
        prediction_proba = churn_model.predict_proba(X)[0][1]
        
        return jsonify({
            'churn': int(prediction),
            'churn_risk': round(float(prediction_proba) * 100, 2),
            'risk_level': get_risk_level(prediction_proba)
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400

@app.route('/predict-demand', methods=['POST'])
def predict_demand():
    try:
        if demand_model is None:
            return jsonify({'error': 'Demand model not loaded.'}), 503

        data = request.json
        if isinstance(data, dict):
            data = [data]
        
        df = pd.DataFrame(data)
        if 'avg_rating' in df.columns and 'rating' not in df.columns:
            df['rating'] = df['avg_rating']
        elif 'rating' not in df.columns:
            df['rating'] = 3.5

        # Feature alignment for Demand model (XGBoost)
        X = df.reindex(columns=demand_features).fillna(0)
        
        # Encoding categorical columns
        demand_cat_cols = ['gender', 'city', 'booking_source', 'preferred_service']
        for col in demand_cat_cols:
            if col in demand_encoders:
                le = demand_encoders[col]
                X[col] = X[col].astype(str).map(lambda x: x if x in le.classes_ else le.classes_[0])
                X[col] = le.transform(X[col])

        # Convert numeric
        num_cols = [c for c in demand_features if c not in demand_cat_cols]
        X[num_cols] = X[num_cols].apply(pd.to_numeric, errors='coerce').fillna(0)

        # Predict
        preds_encoded = demand_model.predict(X)
        target_le = demand_encoders['target']
        preds = target_le.inverse_transform(preds_encoded)

        # Count distribution
        results = pd.Series(preds).value_counts().to_dict()
        for cat in ['Low', 'Medium', 'High']:
            if cat not in results: results[cat] = 0

        total = sum(results.values())
        return jsonify({
            'distribution': {k: int(v) for k, v in results.items()},
            'summary': {
                'High%': round((results['High'] / total) * 100, 1) if total > 0 else 0,
                'Medium%': round((results['Medium'] / total) * 100, 1) if total > 0 else 0,
                'Low%': round((results['Low'] / total) * 100, 1) if total > 0 else 0,
            },
            'dominant_demand': str(max(results, key=results.get)) if total > 0 else 'Unknown'
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    print("Starting Flask ML Backend on port 5005...")
    app.run(host='0.0.0.0', port=5005, debug=False)
