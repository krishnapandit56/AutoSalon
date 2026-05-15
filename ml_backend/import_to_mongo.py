import pandas as pd
from pymongo import MongoClient
import numpy as np

# ── Config ──────────────────────────────────────────────────────────────────
MONGO_URI = "mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster"
CSV_PATH  = "../realistic_customer_dataset_8000_v2.csv"

def import_data():
    try:
        print("Reading v2 CSV...")
        df = pd.read_csv(CSV_PATH)
        print(f"Loaded {len(df)} rows.")
        print(f"Columns: {list(df.columns)}\n")

        # ── Identity fields ──────────────────────────────────────────────────
        # Use customer_id as the name field (e.g. CUST00001)
        df['name'] = df['customer_id']

        # Generate deterministic phone numbers from customer_id index
        df['phone'] = df['customer_id'].apply(
            lambda cid: "+91" + str(int(cid.replace("CUST", ""))).zfill(10)
        )

        # ── All fields that map directly from CSV ────────────────────────────
        direct_fields = [
            'age', 'gender', 'city',
            'booking_source',
            'membership_type', 'membership_duration_months', 'loyalty_member',
            'total_visits', 'days_since_last_visit', 'avg_visit_gap_days',
            'preferred_service',                    # ← new in v2
            'num_services_used', 'has_preferred_employee', 'employee_change_count',
            'avg_spend_per_visit', 'last_visit_spend', 'total_spend',
            'products_purchased', 'product_spend',
            'avg_rating', 'num_complaints', 'feedback_given',
            'offers_redeemed', 'referrals_made', 'sms_response_rate',
            'sms_sent', 'sms_responses',
            'appointments_cancelled', 'appointments_no_show',
            'avg_advance_booking_days',
            'visit_time_preference',
            'churn_risk_category',
            'churn',
        ]

        # ── Ensure all expected columns exist with safe defaults ─────────────
        string_cols = ['gender', 'city', 'membership_type', 'booking_source',
                       'visit_time_preference', 'churn_risk_category', 'preferred_service']
        for col in direct_fields:
            if col not in df.columns:
                print(f"  WARNING: Column '{col}' not in v2 CSV, filling with default")
                df[col] = 'Unknown' if col in string_cols else 0

        # ── Normalise string columns ─────────────────────────────────────────
        df['membership_type']          = df['membership_type'].fillna('None')
        df['membership_duration_months'] = df['membership_duration_months'].fillna(0)
        df['preferred_service']        = df['preferred_service'].fillna('Unknown')
        df['churn_risk_category']      = df['churn_risk_category'].fillna('Medium')
        df['booking_source']           = df['booking_source'].fillna('Walk-in')
        df['visit_time_preference']    = df['visit_time_preference'].fillna('No_Preference')

        # ── Build documents ──────────────────────────────────────────────────
        output_fields = ['name', 'phone', 'customer_id'] + direct_fields
        # Only use columns that actually exist in df
        output_fields = [f for f in output_fields if f in df.columns]
        data_to_import = df[output_fields].to_dict('records')

        # Clean NaN / numpy types (pymongo can't handle them)
        for record in data_to_import:
            for key, value in list(record.items()):
                if isinstance(value, float) and np.isnan(value):
                    record[key] = 0
                elif isinstance(value, (np.integer,)):
                    record[key] = int(value)
                elif isinstance(value, (np.floating,)):
                    record[key] = float(value)

        # ── Connect & import ─────────────────────────────────────────────────
        print("Connecting to MongoDB Atlas...")
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
        db = client.get_database()
        collection = db['churns']

        print("Clearing existing churn data...")
        deleted = collection.delete_many({})
        print(f"  Deleted {deleted.deleted_count} old records.")

        print(f"Inserting {len(data_to_import)} v2 records...")
        result = collection.insert_many(data_to_import)
        print(f"\n✅ Import successful! {len(result.inserted_ids)} records inserted.")
        print(f"Sample record keys: {list(data_to_import[0].keys())}")
        print(f"Sample record: {data_to_import[0]}")

        client.close()

    except Exception as e:
        print(f"❌ Error during import: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import_data()
