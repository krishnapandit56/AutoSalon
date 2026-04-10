import requests
import json

url = "http://localhost:5005/predict"
payload = {
    "name": "shrik",
    "age": 25,
    "gender": "Female",
    "city": "Nagpur",
    "total_visits": 2,
    "days_since_last_visit": 5,
    "avg_visit_gap_days": 30,
    "num_services_used": 1,
    "has_preferred_employee": 1,
    "avg_spend_per_visit": 325,
    "last_visit_spend": 325,
    "total_spend": 650,
    "avg_rating": 4.5,
    "appointments_cancelled": 0,
    "booking_source": "Online_App"
}

try:
    print(f"Testing Churn Prediction for 'shrik'...")
    response = requests.post(url, json=payload, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Result: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
