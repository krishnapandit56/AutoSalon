import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
import xgboost as xgb
from sklearn.model_selection import RandomizedSearchCV
import pickle
import json
import os

# Define paths relative to the ml_backend folder
dataset_path = "../realistic_customer_dataset_8000.csv"
model_path = "xgboost_model.pkl"
encoders_path = "encoders.pkl"

print("Loading dataset...")
if dataset_path.endswith('.xlsx'):
    df = pd.read_excel(dataset_path)
else:
    df = pd.read_csv(dataset_path)

# ──────────────────────────────────────────────
# Feature Engineering
# ──────────────────────────────────────────────
# Visits per month — engagement rate signal
df['visits_per_month'] = df['total_visits'] / (df['membership_duration_months'].fillna(0) + 1)

# Cancel + no-show rate relative to total visits (historical behavior, not outcome)
df['cancel_rate'] = df['appointments_cancelled'] / (df['total_visits'] + 1)
df['noshow_rate']  = df['appointments_no_show']  / (df['total_visits'] + 1)

# SMS responsiveness
df['sms_response_rate'] = df['sms_response_rate'].fillna(0)

# ──────────────────────────────────────────────
# Features to use (predictive, non-leaky)
# ──────────────────────────────────────────────
features = [
    # Demographics
    'age', 'gender', 'city',

    # Membership / loyalty
    'membership_type', 'membership_duration_months', 'loyalty_member',

    # Visit behaviour
    'total_visits', 'visits_per_month', 'num_services_used',
    'has_preferred_employee', 'employee_change_count',

    # Financial (pre-outcome averages only — NOT total_spend / last_visit_spend)
    'avg_spend_per_visit',

    # Satisfaction / feedback
    'avg_rating', 'num_complaints', 'feedback_given',

    # Engagement signals
    'offers_redeemed', 'referrals_made', 'sms_response_rate',
    'products_purchased',

    # Historical appointment patterns (behaviour, not outcome)
    'appointments_cancelled', 'appointments_no_show',
    'cancel_rate', 'noshow_rate',
    'avg_advance_booking_days',

    # Booking channel
    'booking_source',

    # Time / preference
    'visit_time_preference',

    # Risk label already synthesised from non-leaky signals in the dataset
    'churn_risk_category',
]

X = df[features].copy()
y = df['churn'].copy()

# ──────────────────────────────────────────────
# Missing value imputation
# ──────────────────────────────────────────────
num_cols = X.select_dtypes(include=[np.number]).columns
X[num_cols] = X[num_cols].fillna(X[num_cols].median())

cat_cols = ['gender', 'city', 'membership_type', 'booking_source',
            'visit_time_preference', 'churn_risk_category']
for col in cat_cols:
    X[col] = X[col].fillna('Unknown')

# ──────────────────────────────────────────────
# Encode categoricals
# ──────────────────────────────────────────────
encoders = {}
for col in cat_cols:
    le = LabelEncoder()
    unique_vals = list(X[col].astype(str).unique())
    if 'Unknown' not in unique_vals:
        unique_vals.append('Unknown')
    le.fit(unique_vals)
    X[col] = le.transform(X[col].astype(str))
    encoders[col] = le

print("Splitting dataset...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ──────────────────────────────────────────────
# Train XGBoost with RandomizedSearchCV
# ──────────────────────────────────────────────
scale_pos_wght = sum(y_train == 0) / sum(y_train == 1) if sum(y_train == 1) > 0 else 1

clf = xgb.XGBClassifier(
    random_state=42,
    eval_metric='logloss',
    use_label_encoder=False
)

param_grid = {
    'max_depth':         [4, 6, 8, 10],
    'learning_rate':     [0.01, 0.05, 0.1, 0.15],
    'n_estimators':      [200, 300, 500],
    'colsample_bytree':  [0.7, 0.8, 1.0],
    'subsample':         [0.7, 0.8, 1.0],
    'min_child_weight':  [1, 3, 5],
    'gamma':             [0, 0.1, 0.3],
    'scale_pos_weight':  [1, scale_pos_wght],
}

print("Running RandomizedSearchCV over 30 iterations...")
rs = RandomizedSearchCV(
    clf, param_distributions=param_grid,
    n_iter=30, scoring='accuracy', cv=5,
    random_state=42, n_jobs=-1, verbose=1
)
rs.fit(X_train, y_train)

model = rs.best_estimator_
print("Best parameters found:", rs.best_params_)

# ──────────────────────────────────────────────
# Evaluate
# ──────────────────────────────────────────────
print("Evaluating model...")
y_pred       = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

acc  = accuracy_score(y_test, y_pred)
prec = precision_score(y_test, y_pred)
rec  = recall_score(y_test, y_pred)
f1   = f1_score(y_test, y_pred)

print("\n--- Model Metrics ---")
print(f"Accuracy:  {acc:.4f}")
print(f"Precision: {prec:.4f}")
print(f"Recall:    {rec:.4f}")
print(f"F1 Score:  {f1:.4f}")
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# ──────────────────────────────────────────────
# Save model, encoders and metrics
# ──────────────────────────────────────────────
with open(model_path, "wb") as f:
    pickle.dump(model, f)

with open(encoders_path, "wb") as f:
    pickle.dump(encoders, f)

metrics = {
    "accuracy":  f"{acc:.4f}",
    "precision": f"{prec:.4f}",
    "recall":    f"{rec:.4f}",
    "f1":        f"{f1:.4f}"
}
with open("metrics.json", "w") as f:
    json.dump(metrics, f)

print(f"\nModel saved to {model_path} and encoders to {encoders_path}")
