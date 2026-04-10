from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

model_path   = "xgboost_model.pkl"
encoders_path = "encoders.pkl"

print("Loading model and encoders...")
try:
    with open(model_path, "rb") as f:
        model = pickle.load(f)
    with open(encoders_path, "rb") as f:
        encoders = pickle.load(f)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Make sure to run train.py first: {e}")
    model    = None
    encoders = {}

# Must match train.py exactly
features = [
    'age', 'gender', 'city',
    'membership_type', 'membership_duration_months', 'loyalty_member',
    'total_visits', 'visits_per_month', 'num_services_used',
    'has_preferred_employee', 'employee_change_count',
    'avg_spend_per_visit',
    'avg_rating', 'num_complaints', 'feedback_given',
    'offers_redeemed', 'referrals_made', 'sms_response_rate',
    'products_purchased',
    'appointments_cancelled', 'appointments_no_show',
    'cancel_rate', 'noshow_rate',
    'avg_advance_booking_days',
    'booking_source',
    'visit_time_preference',
    'churn_risk_category',
]

categorical_cols = ['gender', 'city', 'membership_type',
                    'booking_source', 'visit_time_preference', 'churn_risk_category']


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Recreate the same engineered columns used during training."""
    membership_months = pd.to_numeric(df.get('membership_duration_months', 0), errors='coerce').fillna(0)
    total_visits       = pd.to_numeric(df.get('total_visits', 1), errors='coerce').fillna(1)
    cancelled          = pd.to_numeric(df.get('appointments_cancelled', 0), errors='coerce').fillna(0)
    noshow             = pd.to_numeric(df.get('appointments_no_show', 0), errors='coerce').fillna(0)

    df['visits_per_month'] = total_visits / (membership_months + 1)
    df['cancel_rate']      = cancelled  / (total_visits + 1)
    df['noshow_rate']      = noshow     / (total_visits + 1)
    return df


@app.route('/predict', methods=['POST'])
def predict():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded. Run train.py first.'}), 503

        data = request.json
        print("Received prediction request:", data)

        df = pd.DataFrame([data])

        # Build engineered features
        df = engineer_features(df)

        # Ensure all expected columns exist
        for col in features:
            if col not in df.columns:
                df[col] = None

        df = df[features].copy()

        # Fill missing numeric values with 0
        for col in df.columns:
            if col not in categorical_cols:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # Encode categoricals — map unseen labels to 'Unknown'
        for col in categorical_cols:
            le = encoders.get(col)
            if le:
                series = df[col].astype(str).tolist()
                mapped = [x if x in le.classes_ else 'Unknown' for x in series]
                df[col] = le.transform(mapped)

        # Final feature selection and numeric confirmation
        X = df[features].apply(pd.to_numeric, errors='coerce').fillna(0)

        prediction       = model.predict(X)[0]
        prediction_proba = model.predict_proba(X)[0][1]

        return jsonify({
            'churn':      int(prediction),
            'churn_risk': round(float(prediction_proba) * 100, 2)
        })

    except Exception as e:
        print("Prediction error:", str(e))
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    print("Starting Flask prediction server on port 5005...")
    app.run(host='0.0.0.0', port=5005, debug=True)
