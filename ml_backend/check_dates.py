import pymongo
from datetime import datetime

client = pymongo.MongoClient('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
db = client.get_database()
coll = db['bookings']

dates = [b['createdAt'] for b in coll.find({}, {'createdAt': 1}).sort('createdAt', 1)]
if dates:
    print(f"Oldest: {dates[0]}")
    print(f"Newest: {dates[-1]}")
    print(f"Total entries: {len(dates)}")
    
    # Check distribution
    day_counts = {}
    for d in dates:
        day = d.strftime('%Y-%m-%d')
        day_counts[day] = day_counts.get(day, 0) + 1
    
    print("Day counts (sample):", list(day_counts.items())[:10])
else:
    print("No dates found.")
