import pymongo
import pandas as pd
import os

# Connect to MongoDB
try:
    client = pymongo.MongoClient('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
    db = client.get_database()
    
    booking_count = db.bookings.count_documents({})
    churn_count = db.churns.count_documents({})
    
    print(f"MongoDB Status:")
    print(f" - Bookings: {booking_count}")
    print(f" - Churns: {churn_count}")
    
    # Check if a random booking name exists in Churns
    sample_booking = db.bookings.find_one()
    if sample_booking:
        name = sample_booking.get('customerName')
        churn_match = db.churns.find_one({'name': {'$regex': f'^{name}$', '$options': 'i'}})
        print(f"Sample Check: '{name}' in Churns? {'Yes' if churn_match else 'No'}")
    
    # Check CSV
    csv_path = '../realistic_customer_dataset_8000.csv'
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        print(f"CSV Entries: {len(df)}")
    else:
        print(f"CSV not found at {csv_path}")

except Exception as e:
    print(f"Error: {e}")
