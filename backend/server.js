import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cron from 'node-cron';
import twilio from 'twilio';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const twilioClient = twilio('AC5bcbea1a97271175fd382126275a1256', 'ea1d2c94c26aead893387f1ccc6c7d39');

import Slot from './models/Slot.js';
import Booking from './models/Booking.js';
import Inventory from './models/Inventory.js';
import Churn from './models/Churn.js';
import Admin from './models/Admin.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'supersecret_autosalon_key_2026';

// Connect to MongoDB
mongoose.connect('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Generate mock slots from 11 AM to 10 PM, 30 min intervals
const generateMockSlots = async () => {
  await Slot.deleteMany({});
  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
    let displayH = h % 12;
    if (displayH === 0) displayH = 12;
    
    if (m === 0) {
      return displayH + ampm;
    } else {
      return displayH + '.' + m + ' ' + ampm;
    }
  };

  const slots = [];
  for (let time = 660; time <= 1320; time += 30) {
    slots.push({ startTime: formatTime(time), endTime: formatTime(time + 30) });
  }
  await Slot.insertMany(slots);
  console.log('Mock slots generated matched to exact format requested.');
};
generateMockSlots();

// Delete old locks (e.g. older than 5 minutes)
const cleanUpLocks = async () => {
    const expirationTime = new Date(Date.now() - 5 * 60 * 1000);
    await Slot.updateMany(
        { status: 'locked', lockedAt: { $lt: expirationTime } },
        { $set: { status: 'free', lockedAt: null, sessionId: null } }
    );
};
setInterval(cleanUpLocks, 60 * 1000); // Check every minute

// Free all slots every day at 11:00 PM
cron.schedule('0 23 * * *', async () => {
    try {
        await Slot.updateMany({}, { $set: { status: 'free', lockedAt: null, sessionId: null } });
        await Booking.deleteMany({}); // Clears today's bookings
        console.log('Daily Reset: All slots and bookings cleared successfully at 11:00 PM.');
    } catch(err) {
        console.error('Error during daily slot reset:', err);
    }
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.admin = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// API Routes

// Admin Auth Routes
app.post('/api/admin/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await Admin.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();
    res.json({ success: true, message: 'Admin registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: 'Invalid credentials' });
    const validPass = await bcrypt.compare(password, admin.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ _id: admin._id }, JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Get all slots
app.get('/api/slots', async (req, res) => {
  try {
    const slots = await Slot.find();
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Lock a slot
app.post('/api/slots/:id/lock', async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;
    
    // Attempt to lock if it's currently free
    const slot = await Slot.findOneAndUpdate(
      { _id: id, status: 'free' },
      { status: 'locked', lockedAt: new Date(), sessionId },
      { new: true }
    );

    if (!slot) {
      return res.status(400).json({ error: 'Slot is already locked or booked' });
    }

    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Create a booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { slotId, customerName, phone, service, sessionId, age, gender, city } = req.body;
    
    // Check if person already booked
    const existingRegex = new RegExp("^" + customerName + "$", 'i');
    const existingBooking = await Booking.findOne({ customerName: existingRegex });
    if (existingBooking) {
      return res.status(400).json({ error: 'You have already booked a slot. Only one slot per person is allowed.' });
    }

    // Verify the slot is locked by this session
    const slot = await Slot.findOne({ _id: slotId, status: 'locked', sessionId });
    
    if (!slot) {
      return res.status(400).json({ error: 'Slot is not locked by you or has expired' });
    }

    // Determine service price setup
    let last_visit_spend = 0;
    if (service === 'basic') last_visit_spend = 500;
    else if (service === 'intermediate') last_visit_spend = 800;
    else if (service === 'expert') last_visit_spend = 1200;

    // Process Churn Data
    let churnData = await Churn.findOne({ phone });
    const now = new Date();

    if (churnData) {
      const diffTime = Math.abs(now - new Date(churnData.date));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const oldGapsCount = Math.max(0, churnData.total_visits - 1);
      const newGapsCount = churnData.total_visits;
      const newAvgGap = ((churnData.avg_visit_gap_days * oldGapsCount) + diffDays) / newGapsCount;
      
      const newTotalVisits = churnData.total_visits + 1;
      const newTotalSpend = churnData.total_spend + last_visit_spend;
      const newAvgSpend = newTotalSpend / newTotalVisits;

      churnData.days_since_last_visit = diffDays;
      churnData.avg_visit_gap_days = newAvgGap;
      churnData.total_visits = newTotalVisits;
      churnData.total_spend = newTotalSpend;
      churnData.avg_spend_per_visit = newAvgSpend;
      churnData.last_visit_spend = last_visit_spend;
      churnData.num_services_used = newTotalVisits;
      churnData.date = now;
      if (age) churnData.age = age;
      if (gender) churnData.gender = gender;
      if (city) churnData.city = city;
      
      await churnData.save();
    } else {
      churnData = new Churn({
        name: customerName,
        phone,
        age: age || 0,
        gender: gender || 'Unknown',
        city: city || 'nagpur',
        total_visits: 1,
        days_since_last_visit: 0,
        avg_visit_gap_days: 0,
        num_services_used: 1,
        has_preferred_employee: 0,
        avg_spend_per_visit: last_visit_spend,
        last_visit_spend: last_visit_spend,
        total_spend: last_visit_spend,
        booking_source: 'web'
      });
      await churnData.save();
    }

    // Create booking
    const booking = new Booking({ slotId, customerName, phone, service });
    await booking.save();

    // Mark slot as booked
    slot.status = 'booked';
    slot.lockedAt = null;
    slot.sessionId = null;
    await slot.save();

    try {
        const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone;
        const msg = "Hi " + customerName + "! Your AutoSalon appointment for a " + service + " service is confirmed for " + slot.startTime;
        await twilioClient.messages.create({
            body: msg,
            from: '+13185343593',
            to: formattedPhone
        });
        console.log('Confirmation SMS sent to ' + formattedPhone);
    } catch (smsErr) {
        console.error('Failed to send SMS:', smsErr.message);
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get all bookings (Admin)
app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('slotId').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Inventory Routes
app.get('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const inventory = await Inventory.find();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory', authMiddleware, async (req, res) => {
  try {
    const { name, quantity } = req.body;
    const item = new Inventory({ name, quantity });
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory/:id', authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    const item = await Inventory.findByIdAndUpdate(req.params.id, { quantity }, { new: true });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory/:id', authMiddleware, async (req, res) => {
  try {
      await Inventory.findByIdAndDelete(req.params.id);
      res.json({ success: true });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// 6. Churn Prediction Data Routes
app.post('/api/churn', authMiddleware, async (req, res) => {
  try {
    const { name, age, gender, city } = req.body;
    const data = new Churn({ name, age, gender, city });
    await data.save();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/churn', authMiddleware, async (req, res) => {
  try {
    const churnData = await Churn.find().sort({ date: -1 });
    res.json(churnData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
