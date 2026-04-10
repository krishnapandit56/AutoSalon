import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cron from 'node-cron';
import twilio from 'twilio';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

const twilioClient = twilio('AC5bcbea1a97271175fd382126275a1256', 'ea1d2c94c26aead893387f1ccc6c7d39');

import Slot from './models/Slot.js';
import Booking from './models/Booking.js';
import Inventory from './models/Inventory.js';
import Churn from './models/Churn.js';
import Admin from './models/Admin.js';

const JWT_SECRET = 'supersecret_autosalon_key_2026';

// Service Data with 3 levels and price ranges
const SERVICES = {
  Threading: { Basic: "50-100", Intermediate: "100-200", Expert: "200-500" },
  Waxing: { Basic: "200-400", Intermediate: "400-800", Expert: "800-1500+" },
  Cleanup: { Basic: "300-500", Intermediate: "500-800", Expert: "800-1200" },
  Massage: { Basic: "800-1200", Intermediate: "1200-2500", Expert: "2500-5000+" },
  Facial: { Basic: "500-800", Intermediate: "800-1500", Expert: "1500-3000+" },
  Detan: { Basic: "400-600", Intermediate: "600-1000", Expert: "1000-2000" },
  Blowout: { Basic: "300-500", Intermediate: "500-1000", Expert: "1000-2000+" },
  Manicure: { Basic: "400-600", Intermediate: "600-1000", Expert: "1000-1500" },
  Haircut: { Basic: "200-300", Intermediate: "300-500", Expert: "500-1000+" },
  Keratin: { Basic: "2000-3500", Intermediate: "3500-6000", Expert: "6000-10000+" },
  Pedicure: { Basic: "500-700", Intermediate: "700-1200", Expert: "1200-2000" },
  Hair_Color: { Basic: "1000-2000", Intermediate: "2000-4000", Expert: "4000-8000+" }
};

// Connect to MongoDB
mongoose.connect('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
  .then(async () => {
    console.log('Connected to MongoDB');
    // Only clear orphaned held slots on startup
    const oldHeldSlots = await Slot.countDocuments({ status: 'held' });
    if(oldHeldSlots > 0) {
        await Slot.updateMany({ status: 'held' }, { $set: { status: 'available', heldBy: null, holdExpiry: null } });
        console.log(`Startup Cleanup: Freed frozen slots.`);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Generate mock slots from 11 AM to 10 PM, 30 min intervals
const generateMockSlots = async () => {
  const existingCount = await Slot.countDocuments();
  if (existingCount > 0) return;
  
  await Slot.deleteMany({});
  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
    let displayH = h % 12;
    if (displayH === 0) displayH = 12;
    return m === 0 ? displayH + ampm : displayH + '.' + m + ' ' + ampm;
  };

  const slots = [];
  for (let time = 660; time <= 1320; time += 30) {
    slots.push({ time: formatTime(time) });
  }
  await Slot.insertMany(slots);
  console.log('Mock slots generated.');
};
generateMockSlots();

// Auto-release expired holds (5 minutes)
const cleanUpHolds = async () => {
    const now = new Date();
    const expiredSlots = await Slot.find({ status: 'held', holdExpiry: { $lt: now } });
    if (expiredSlots.length > 0) {
        for (const slot of expiredSlots) {
            await Slot.updateOne({ _id: slot._id }, { $set: { status: 'available', heldBy: null, holdExpiry: null } });
            io.emit('slot-updated', { slotId: slot._id, status: 'available' });
        }
        console.log(`Cleanup: Released ${expiredSlots.length} expired holds.`);
    }
};
setInterval(cleanUpHolds, 30 * 1000); // Check every 30 seconds

// Reset all available/held slots daily at 11:00 PM (keep Booked for history)
cron.schedule('0 23 * * *', async () => {
    try {
        await Slot.updateMany({ status: { $ne: 'booked' } }, { $set: { status: 'available', heldBy: null, holdExpiry: null } });
        console.log('Daily Reset: Slots freed successfully.');
    } catch(err) {
        console.error('Error during daily slot reset:', err);
    }
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => console.log('User disconnected'));
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

// 1. Get all slots
app.get('/api/slots', async (req, res) => {
  try {
    const slots = await Slot.find();
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Hold a slot (Atomic)
app.post('/api/hold-slot', async (req, res) => {
  try {
    const { slotId, userId } = req.body;
    const holdExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const slot = await Slot.findOneAndUpdate(
      { _id: slotId, status: 'available' },
      { status: 'held', heldBy: userId, holdExpiry },
      { new: true }
    );

    if (!slot) {
      return res.status(400).json({ error: 'Slot already booked or held' });
    }

    io.emit('slot-updated', { slotId, status: 'held', heldBy: userId, holdExpiry });
    res.json(slot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Confirm Booking
app.post('/api/confirm-booking', async (req, res) => {
  try {
    const { slotId, userId, customerName, phone, service, age, gender, city } = req.body;
    
    // Check if slot is held by this user
    const slot = await Slot.findOne({ _id: slotId, status: 'held', heldBy: userId });
    
    if (!slot) {
      return res.status(400).json({ error: 'Slot is not held by you or has expired' });
    }

    // Determine service price (mocking avg based on level)
    let last_visit_spend = 500;
    if (service.includes('Intermediate')) last_visit_spend = 800;
    else if (service.includes('Expert')) last_visit_spend = 1500;

    // Determine visit time preference from slot time
    let visit_time_preference = 'No_Preference';
    try {
      const timeStr = slot.time.toLowerCase();
      const isPm = timeStr.includes('pm');
      const hour = parseInt(timeStr);
      if (!isPm || hour === 12) visit_time_preference = 'Morning';
      else if (hour >= 1 && hour < 4) visit_time_preference = 'Afternoon';
      else if (hour >= 4 && hour < 7) visit_time_preference = 'Evening';
      else visit_time_preference = 'Evening';
    } catch(e) {}

    // Normalize phone for lookup
    const cleanPhone = phone.replace(/\D/g, '');
    const last10 = cleanPhone.slice(-10);
    
    let churnData = await Churn.findOne({
      $or: [
        { phone: phone },
        { phone: cleanPhone },
        { phone: { $regex: last10 + '$' } }
      ]
    });
    const now = new Date();

    if (churnData) {
      const diffTime = Math.abs(now - new Date(churnData.date));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      churnData.days_since_last_visit = diffDays;
      churnData.total_visits += 1;
      churnData.total_spend += last_visit_spend;
      churnData.avg_spend_per_visit = churnData.total_spend / churnData.total_visits;
      churnData.last_visit_spend = last_visit_spend;
      churnData.date = now;
      churnData.visit_time_preference = visit_time_preference;
      if (age) churnData.age = age;
      if (gender) churnData.gender = gender;
      if (city) churnData.city = city;
      await churnData.save();
    } else {
      // Create a new churn record with ALL fields the ML model needs
      churnData = new Churn({
        name: customerName,
        phone,
        age: age || 25,
        gender: gender || 'Female',
        city: city || 'Nagpur',
        membership_type: 'None',
        membership_duration_months: 0,
        loyalty_member: 0,
        total_visits: 1,
        days_since_last_visit: 0,
        avg_visit_gap_days: 0,
        num_services_used: 1,
        has_preferred_employee: 0,
        employee_change_count: 0,
        avg_spend_per_visit: last_visit_spend,
        last_visit_spend: last_visit_spend,
        total_spend: last_visit_spend,
        avg_rating: 3.5,
        num_complaints: 0,
        feedback_given: 0,
        offers_redeemed: 0,
        referrals_made: 0,
        sms_response_rate: 0,
        products_purchased: 0,
        appointments_cancelled: 0,
        appointments_no_show: 0,
        avg_advance_booking_days: 0,
        booking_source: 'Online_App',
        visit_time_preference: visit_time_preference,
        churn_risk_category: 'Medium',
      });
      await churnData.save();
    }

    // Create booking
    const booking = new Booking({ slotId, customerName, phone, service: service.split(' - ')[0].toLowerCase() });
    await booking.save();

    // Mark slot as booked
    slot.status = 'booked';
    slot.heldBy = null;
    slot.holdExpiry = null;
    await slot.save();

    io.emit('slot-updated', { slotId, status: 'booked' });

    try {
        const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone;
        const msg = `Hi ${customerName}! Your AutoSalon appointment for ${service} is confirmed for ${slot.time}.`;
        await twilioClient.messages.create({
            body: msg,
            from: '+13185343593',
            to: formattedPhone
        });
    } catch (smsErr) {
        console.error('Failed to send SMS:', smsErr.message);
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().populate('slotId').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/churn', authMiddleware, async (req, res) => {
  try {
    const churnData = await Churn.find().sort({ total_visits: -1 }).limit(100);
    res.json(churnData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/churn/predict', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required.' });

    console.log(`Predicting churn for: ${name}`);

    // Search by name (case-insensitive regex)
    let churnData = await Churn.findOne({ 
        name: { $regex: new RegExp('^' + name + '$', 'i') } 
    }).lean();
    
    if (!churnData) {
        console.log(`Data not found for: ${name}`);
        return res.json({ error: `Data Not Found: No metrics available for '${name}' in the database.` });
    }

    console.log(`Found data for ${name}. Metrics: visits=${churnData.total_visits}, spend=${churnData.avg_spend_per_visit}`);

    // Build a CLEAN object with ONLY the fields the ML model expects
    const mlPayload = {
      age: churnData.age || 25,
      gender: churnData.gender || 'Female',
      city: churnData.city || 'Nagpur',
      membership_type: churnData.membership_type || 'None',
      membership_duration_months: churnData.membership_duration_months || 0,
      loyalty_member: churnData.loyalty_member || 0,
      total_visits: churnData.total_visits || 1,
      num_services_used: churnData.num_services_used || 1,
      has_preferred_employee: churnData.has_preferred_employee || 0,
      employee_change_count: churnData.employee_change_count || 0,
      avg_spend_per_visit: churnData.avg_spend_per_visit || 0,
      avg_rating: churnData.avg_rating || 3.5,
      num_complaints: churnData.num_complaints || 0,
      feedback_given: churnData.feedback_given || 0,
      offers_redeemed: churnData.offers_redeemed || 0,
      referrals_made: churnData.referrals_made || 0,
      sms_response_rate: churnData.sms_response_rate || 0,
      products_purchased: churnData.products_purchased || 0,
      appointments_cancelled: churnData.appointments_cancelled || 0,
      appointments_no_show: churnData.appointments_no_show || 0,
      avg_advance_booking_days: churnData.avg_advance_booking_days || 0,
      booking_source: churnData.booking_source || 'Online_App',
      visit_time_preference: churnData.visit_time_preference || 'No_Preference',
      churn_risk_category: churnData.churn_risk_category || 'Medium',
    };

    const response = await fetch('http://localhost:5005/predict', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(mlPayload)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to ML Backend.');
    }

    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Prediction Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
httpServer.listen(PORT, () => console.log('Server running on port ' + PORT));
