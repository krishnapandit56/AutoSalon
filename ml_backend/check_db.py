import pymongo
client = pymongo.MongoClient('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
db = client.get_database()
print("Collections:", db.list_collection_names())
for coll in db.list_collection_names():
    print(f"Count in {coll}: {db[coll].count_documents({})}")
