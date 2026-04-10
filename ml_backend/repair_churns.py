import pymongo

# Connect to MongoDB
client = pymongo.MongoClient('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
db = client.get_database()

print("Repairing Churns collection...")
# For any record missing preferred_service, membership_type, or visit_time_preference
result = db.churns.update_many(
    {'$or': [
        {'preferred_service': {'$exists': False}},
        {'membership_type': {'$exists': False}},
        {'visit_time_preference': {'$exists': False}}
    ]},
    {'$set': {
        'preferred_service': 'Haircut', 
        'membership_type': 'None',
        'visit_time_preference': 'Afternoon'
    }}
)

print(f"Successfully repaired {result.modified_count} records.")
print("Verifying 'shrik'...")
shrik = db.churns.find_one({'name': {'$regex': '^shrik$', '$options': 'i'}})
if shrik:
    db.churns.update_one({'_id': shrik['_id']}, {'$set': {'preferred_service': 'Pedicure'}})
    print("Updated 'shrik' specific fields.")

print("Done.")
