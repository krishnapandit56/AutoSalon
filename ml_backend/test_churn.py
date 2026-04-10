import requests
import json

url = "http://localhost:5005/predict"
payload = {
    "age": 30,
    "gender": "Female",
    "city": "Nagpur",
    "total_visits": 5,
    "avg_rating": 4.2
}

try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)
