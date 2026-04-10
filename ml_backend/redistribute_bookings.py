import pymongo
from pymongo import UpdateOne
import random
from datetime import datetime, timedelta

# Connect to MongoDB
client = pymongo.MongoClient('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
db = client.get_database()
coll = db['bookings']

print("Fetching valid names from Churns collection...")
churn_docs = list(db.churns.find({}, {'name': 1}))
valid_names = [c['name'] for c in churn_docs if 'name' in c]

if not valid_names:
    print("Warning: No names found in Churns collection. Falling back to default.")
    valid_names = ["Anonymous Customer"]

print("Fetching bookings...")
bookings = list(coll.find({}))
print(f"Total bookings to synchronize: {len(bookings)}")

if not bookings:
    print("No bookings found. Nothing to redistribute.")
    exit(0)

# Redistribution logic: Spread over last 180 days
now = datetime.now()
bulk_ops = []

print(f"Preparing bulk updates for {len(bookings)} bookings...")
for i, b in enumerate(bookings):
    # Pick a random real name from the churn profiles
    random_name = random.choice(valid_names)
    
    # Random date in last 180 days
    random_days = random.randint(1, 180)
    random_hours = random.randint(0, 23)
    random_minutes = random.randint(0, 59)
    new_date = now - timedelta(days=random_days, hours=random_hours, minutes=random_minutes)
    
    # Add to bulk operations
    bulk_ops.append(
        UpdateOne(
            {'_id': b['_id']}, 
            {'$set': {
                'customerName': random_name,
                'createdAt': new_date
            }}
        )
    )

if bulk_ops:
    print("Executing bulk write...")
    result = coll.bulk_write(bulk_ops)
    print(f"Successfully updated {result.modified_count} bookings.")

print("Synchronization complete.")
