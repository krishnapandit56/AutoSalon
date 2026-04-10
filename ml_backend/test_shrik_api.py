import requests

url = "http://localhost:5000/api/churn/predict"
# Note: This requires a token. I'll use a script to call it locally if I can find a token or bypass it.
# Actually, I'll call the ML backend directly to see if it's an ML error.

ml_url = "http://localhost:5005/predict"
payload = {
    "name": "shrik",
    "age": 25,
    "gender": "Female",
    "city": "Nagpur",
    "total_visits": 1,
    "days_since_last_visit": 0,
    "avg_visit_gap_days": 0,
    "num_services_used": 1,
    "has_preferred_employee": 0,
    "avg_spend_per_visit": 500,
    "last_visit_spend": 500,
    "total_spend": 500,
    "rating": 3.5,
    "appointments_cancelled": 0,
    "booking_source": "Online_App"
}

print(f"Testing ML backend directly for 'shrik'...")
try:
    res = requests.post(ml_url, json=payload)
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Connection failed: {e}")
