import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
  .then(async () => {
    console.log('Connected to MongoDB');
    const result = await mongoose.connection.collection('churns').deleteMany({});
    console.log('Deleted ' + result.deletedCount + ' records from churns collection.');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
