import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os

# Paths
dataset_path = "../realistic_customer_dataset_8000.csv"
model_path = "xgboost_demand_model.pkl"
encoder_path = "demand_encoders.pkl"

print("Loading dataset for Demand Forecasting...")
df = pd.read_csv(dataset_path)

# Derive demand_category from num_services_used
# num_services_used range is 1-5.
# Low: 1-2, Medium: 3-4, High: 5
def categorize_demand(v):
    if v <= 2: return 'Low'
    if v <= 4: return 'Medium'
    return 'High'

df['demand_category'] = df['num_services_used'].apply(categorize_demand)

# Features for demand forecasting
# We use preferred_service as it directly impacts demand per service
features = [
    'age', 'gender', 'city', 'total_visits', 'days_since_last_visit',
    'avg_visit_gap_days', 'has_preferred_employee', 'avg_spend_per_visit',
    'last_visit_spend', 'total_spend', 'avg_rating', 'appointments_cancelled',
    'booking_source', 'preferred_service'
]

X = df[features].copy()
y = df['demand_category'].copy()

# Categorical columns
categorical_cols = ['gender', 'city', 'booking_source', 'preferred_service']

# Label Encoding
encoders = {}
for col in categorical_cols:
    le = LabelEncoder()
    X[col] = le.fit_transform(X[col].astype(str))
    encoders[col] = le

# Map targets to numeric
target_le = LabelEncoder()
y_encoded = target_le.fit_transform(y)
encoders['target'] = target_le

print("Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)

print("Training XGBoost Demand Classifier...")
model = xgb.XGBClassifier(
    n_estimators=200,
    max_depth=6,
    learning_rate=0.1,
    objective='multi:softprob',
    num_class=3,
    random_state=42
)

model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"Demand model accuracy: {acc:.4f}")
print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=target_le.classes_))

# Save model and encoders
with open(model_path, 'wb') as f:
    pickle.dump(model, f)

with open(encoder_path, 'wb') as f:
    pickle.dump(encoders, f)

print(f"Demand model saved to {model_path}")
