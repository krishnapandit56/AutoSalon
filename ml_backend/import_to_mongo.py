import pandas as pd
from pymongo import MongoClient
import numpy as np

# MongoDB Connection String
MONGO_URI = "mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster"
CSV_PATH = "../realistic_customer_dataset_8000.csv"

def import_data():
    try:
        print("Reading CSV...")
        df = pd.read_csv(CSV_PATH)
        print(f"Loaded {len(df)} rows with columns: {list(df.columns)}")

        # --- Build the documents to match Churn schema + ML features ---

        # Identity fields
        df['name'] = df['customer_id']
        # Generate deterministic phone numbers from customer_id index
        df['phone'] = df['customer_id'].apply(
            lambda cid: "+91" + str(int(cid.replace("CUST", ""))).zfill(10)
        )

        # All fields that map directly from CSV to MongoDB (matching ML model features)
        direct_fields = [
            'age', 'gender', 'city',
            'booking_source',
            'membership_type', 'membership_duration_months', 'loyalty_member',
            'total_visits', 'days_since_last_visit', 'avg_visit_gap_days',
            'num_services_used', 'has_preferred_employee', 'employee_change_count',
            'avg_spend_per_visit', 'last_visit_spend', 'total_spend',
            'avg_rating', 'num_complaints', 'feedback_given',
            'offers_redeemed', 'referrals_made', 'sms_response_rate',
            'products_purchased',
            'appointments_cancelled', 'appointments_no_show',
            'avg_advance_booking_days',
            'visit_time_preference',
            'churn_risk_category',
        ]

        # Ensure all expected columns exist with safe defaults
        for col in direct_fields:
            if col not in df.columns:
                print(f"  WARNING: Column '{col}' not in CSV, filling with default")
                if col in ['gender', 'city', 'membership_type', 'booking_source',
                           'visit_time_preference', 'churn_risk_category']:
                    df[col] = 'Unknown'
                else:
                    df[col] = 0

        # Fill NaN for membership_type (no membership = "None")
        df['membership_type'] = df['membership_type'].fillna('None')
        df['membership_duration_months'] = df['membership_duration_months'].fillna(0)

        # Build final list of fields for MongoDB
        output_fields = ['name', 'phone', 'customer_id'] + direct_fields
        data_to_import = df[output_fields].to_dict('records')

        # Clean NaN values (pymongo doesn't handle numpy NaN well)
        for record in data_to_import:
            for key, value in record.items():
                if isinstance(value, float) and np.isnan(value):
                    record[key] = 0

        print(f"Connecting to MongoDB...")
        client = MongoClient(MONGO_URI)
        db = client.get_database()
        collection = db['churns']  # Mongoose pluralizes 'Churn' to 'churns'

        print("Cleaning existing churn data...")
        collection.delete_many({})

        print(f"Importing {len(data_to_import)} records...")
        collection.insert_many(data_to_import)

        print(f"Import successful! {len(data_to_import)} records inserted.")
        print(f"Sample record keys: {list(data_to_import[0].keys())}")

    except Exception as e:
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import_data()
