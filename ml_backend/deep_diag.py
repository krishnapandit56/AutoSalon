import requests
import json

ml_url = "http://localhost:5005/predict"

# Exact payload structure from server.js (v1.1)
payload = {
    "age": 25,
    "gender": "Female",
    "city": "Nagpur",
    "membership_type": "None",
    "membership_duration_months": 0,
    "loyalty_member": 0,
    "total_visits": 1,
    "days_since_last_visit": 0,
    "avg_visit_gap_days": 0,
    "num_services_used": 1,
    "has_preferred_employee": 0,
    "employee_change_count": 0,
    "avg_spend_per_visit": 500.0,
    "last_visit_spend": 500.0,
    "total_spend": 500.0,
    "rating": 3.5,
    "appointments_cancelled": 0,
    "appointments_no_show": 0,
    "avg_advance_booking_days": 0,
    "booking_source": "Online_App",
    "visit_time_preference": "Afternoon",
    "preferred_service": "Pedicure",
    "churn_risk_category": "Medium"
}

print(f"Sending test payload to {ml_url}...")
try:
    response = requests.post(ml_url, json=payload, timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Body: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error connecting to ML Backend: {e}")
