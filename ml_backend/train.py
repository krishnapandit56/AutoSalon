import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from catboost import CatBoostClassifier
import pickle
import json
import os

# Define paths
dataset_path = "../realistic_customer_dataset_8000.csv"
model_path = "catboost_model.pkl"

print("Loading dataset...")
df = pd.read_csv(dataset_path)

# ──────────────────────────────────────────────
# Features specified in user request/image
# ──────────────────────────────────────────────
# Note: The dataset has 'avg_rating', the image said 'rating'. I will map them.
if 'rating' not in df.columns and 'avg_rating' in df.columns:
    df['rating'] = df['avg_rating']

features = [
    'age', 
    'gender', 
    'city', 
    'total_visits', 
    'days_since_last_visit', 
    'avg_visit_gap_days', 
    'num_services_used', 
    'has_preferred_employee', 
    'avg_spend_per_visit', 
    'last_visit_spend', 
    'total_spend', 
    'rating', 
    'appointments_cancelled', 
    'booking_source'
]

X = df[features].copy()
y = df['churn'].copy()

# Identify categorical features for CatBoost
cat_features = ['gender', 'city', 'booking_source']

# Handle missing values
X[cat_features] = X[cat_features].fillna('Unknown')
num_cols = X.select_dtypes(include=[np.number]).columns
X[num_cols] = X[num_cols].fillna(0)

print("Splitting dataset...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ──────────────────────────────────────────────
# Train CatBoost
# ──────────────────────────────────────────────
print("Training CatBoost model...")
model = CatBoostClassifier(
    iterations=500,
    learning_rate=0.1,
    depth=6,
    loss_function='Logloss',
    random_seed=42,
    verbose=100,
    cat_features=cat_features
)

model.fit(X_train, y_train, eval_set=(X_test, y_test), early_stopping_rounds=50)

# ──────────────────────────────────────────────
# Evaluate
# ──────────────────────────────────────────────
print("Evaluating model...")
y_pred = model.predict(X_test)

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
# Save model and metrics
# ──────────────────────────────────────────────
with open(model_path, "wb") as f:
    pickle.dump(model, f)

metrics = {
    "accuracy":  f"{acc:.4f}",
    "precision": f"{prec:.4f}",
    "recall":    f"{rec:.4f}",
    "f1":        f"{f1:.4f}"
}
with open("metrics.json", "w") as f:
    json.dump(metrics, f)

print(f"\nModel saved to {model_path}")
