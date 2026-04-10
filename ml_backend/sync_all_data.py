import pymongo
from pymongo import UpdateOne

# Connect to MongoDB
client = pymongo.MongoClient('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
db = client.get_database()

print("Starting Global Data Synchronization...")

# 1. Fetch all bookings
bookings = list(db.bookings.find({}))
print(f"Total bookings to sync: {len(bookings)}")

churn_updates = []
seen_phones = {}

for b in bookings:
    name = b.get('customerName')
    phone = b.get('phone')
    if not name or not phone: continue
    
    # We want to ensure that for this phone, the name in Churns matches exactly
    clean_phone = ''.join(filter(str.isdigit, str(phone)))
    last10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
    
    # Add to bulk updates for Churns
    # We use $or to find the record the same way the server does
    churn_updates.append(
        UpdateOne(
            {'$or': [
                {'phone': phone},
                {'phone': clean_phone},
                {'phone': {'$regex': last10 + '$'}}
            ]},
            {'$set': {'name': name}},
            upsert=False # We don't want to create new records here, just fix existing ones
        )
    )

if churn_updates:
    print(f"Executing {len(churn_updates)} name updates in Churns collection...")
    # Using bulk_write for speed
    result = db.churns.bulk_write(churn_updates)
    print(f"Sync complete. Updated {result.modified_count} records.")

# 2. Final verification for 'shrik'
shrik_booking = db.bookings.find_one({'customerName': {'$regex': '^shrik$', '$options': 'i'}})
if shrik_booking:
    print(f"Found 'shrik' booking with phone {shrik_booking.get('phone')}. Searching for churn...")
    shrik_churn = db.churns.find_one({'phone': shrik_booking.get('phone')})
    if shrik_churn:
        print(f"Shrik churn record name is now: {shrik_churn.get('name')}")

print("Global Synchronization Complete.")
