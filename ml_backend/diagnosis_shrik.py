import pymongo

# Connect to MongoDB
client = pymongo.MongoClient('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
db = client.get_database()

name_to_check = 'shrik'

print(f"--- Diagnosing '{name_to_check}' ---")

# 1. Check Booking
booking = db.bookings.find_one({'customerName': {'$regex': f'^{name_to_check}$', '$options': 'i'}})
if booking:
    print(f"Booking Found: Name='{booking.get('customerName')}', Phone='{booking.get('phone')}', Service='{booking.get('service')}'")
else:
    print("Booking NOT found.")

# 2. Check Churn Entry
churn_entry = db.churns.find_one({'name': {'$regex': f'^{name_to_check}$', '$options': 'i'}})
if churn_entry:
    print(f"Churn Entry Found: Name='{churn_entry.get('name')}', Phone='{churn_entry.get('phone')}'")
    # Check for required ML fields
    required_fields = ['age', 'gender', 'city', 'total_visits', 'total_spend', 'avg_rating']
    missing = [f for f in required_fields if f not in churn_entry]
    if missing:
        print(f"!!! Missing ML Fields in Churn entry: {missing}")
else:
    print("Churn entry NOT found by name.")
    if booking:
        phone = booking.get('phone')
        churn_by_phone = db.churns.find_one({'phone': phone})
        if churn_by_phone:
            print(f"Churn entry FOUND BY PHONE instead: Name='{churn_by_phone.get('name')}', Phone='{phone}'")
        else:
            print(f"Churn entry NOT found by phone '{phone}' either.")

print("--- End Diagnosis ---")
