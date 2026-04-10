import pandas as pd
from pymongo import MongoClient
import os

# MongoDB Connection String
MONGO_URI = "mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster"
CSV_PATH = "../realistic_customer_dataset_8000.csv"

def import_data():
    try:
        print("Reading CSV...")
        df = pd.read_csv(CSV_PATH)
        
        # Mapping CSV columns to MongoDB Churn model fields
        # Note: CSV doesn't have 'phone' or 'name', so we use 'customer_id'
        df['name'] = df['customer_id']
        # Create a mock phone number based on row index for testing
        df['phone'] = df.index.map(lambda i: f"+91{str(i).zfill(10)}")
        
        # Convert some columns to match model names if different
        # CSV 'avg_rating' -> Model 'rating'
        df['rating'] = df['avg_rating']
        
        # Select and rename columns to match the Churn schema
        # Model fields: name, phone, age, gender, city, total_visits, days_since_last_visit, 
        # avg_visit_gap_days, num_services_used, has_preferred_employee, avg_spend_per_visit, 
        # last_visit_spend, total_spend, rating, appointments_cancelled, booking_source
        
        model_fields = [
            'name', 'phone', 'age', 'gender', 'city', 'total_visits', 
            'days_since_last_visit', 'avg_visit_gap_days', 'num_services_used', 
            'has_preferred_employee', 'avg_spend_per_visit', 'last_visit_spend', 
            'total_spend', 'rating', 'appointments_cancelled', 'booking_source'
        ]
        
        # Ensure all columns exist, fill missing with defaults
        for field in model_fields:
            if field not in df.columns:
                df[field] = 0 if 'spend' in field or 'visit' in field or 'days' in field or 'count' in field else 'Unknown'

        data_to_import = df[model_fields].to_dict('records')
        
        print(f"Connecting to MongoDB...")
        client = MongoClient(MONGO_URI)
        db = client.get_database()
        collection = db['churns'] # Mongoose pluralizes 'Churn' to 'churns'
        
        print("Cleaning existing churn data...")
        collection.delete_many({})
        
        print(f"Importing {len(data_to_import)} records...")
        collection.insert_many(data_to_import)
        
        print("Import successful!")
        
    except Exception as e:
        print(f"Error during import: {e}")

if __name__ == "__main__":
    import_data()
