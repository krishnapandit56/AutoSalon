from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

model_path = "catboost_model.pkl"

print("Loading CatBoost model...")
try:
    with open(model_path, "rb") as f:
        model = pickle.load(f)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Make sure to run train.py first: {e}")
    model = None

# Features must match train.py exactly
features = [
    'age', 'gender', 'city', 'total_visits', 'days_since_last_visit', 
    'avg_visit_gap_days', 'num_services_used', 'has_preferred_employee', 
    'avg_spend_per_visit', 'last_visit_spend', 'total_spend', 'rating', 
    'appointments_cancelled', 'booking_source'
]

categorical_cols = ['gender', 'city', 'booking_source']

def get_risk_level(prob):
    """Categorize probability into Risk Levels."""
    if prob > 0.70:
        return "High Risk"
    elif prob > 0.30:
        return "Medium"
    else:
        return "Low Risk"

@app.route('/predict', methods=['POST'])
def predict():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded. Run train.py first.'}), 503

        data = request.json
        print("Received prediction request:", data)

        # Handle 'rating' / 'avg_rating' aliasing from backend
        if 'avg_rating' in data and 'rating' not in data:
            data['rating'] = data['avg_rating']

        df = pd.DataFrame([data])

        # Ensure all expected columns exist
        for col in features:
            if col not in df.columns:
                if col in categorical_cols:
                    df[col] = 'Unknown'
                else:
                    df[col] = 0

        # Select and order features
        X = df[features].copy()

        # Handle numeric conversion for safety
        num_cols = [c for c in features if c not in categorical_cols]
        X[num_cols] = X[num_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
        X[categorical_cols] = X[categorical_cols].astype(str).fillna('Unknown')

        prediction = model.predict(X)[0]
        prediction_proba = model.predict_proba(X)[0][1]
        
        risk_level = get_risk_level(prediction_proba)

        return jsonify({
            'churn': int(prediction),
            'churn_risk': round(float(prediction_proba) * 100, 2),
            'risk_level': risk_level
        })

    except Exception as e:
        print("Prediction error:", str(e))
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    print("Starting Flask CatBoost server on port 5005...")
    app.run(host='0.0.0.0', port=5005, debug=True)
