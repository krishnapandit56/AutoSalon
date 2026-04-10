import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csvParser from 'csv-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const twilioClient = twilio('AC5bcbea1a97271175fd382126275a1256', '746d244b6055adbb82cdc1f2b3b7c42c');

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
    const { service } = req.query;
    let slots = await Slot.find().lean();
    
    if (service) {
      const bookedService = service.toLowerCase();
      // Check bookings for this exact service to block locally
      const bookings = await Booking.find({ service: bookedService }).lean();
      const bookedSlotIds = bookings.map(b => b.slotId.toString());
      
      slots = slots.map(s => {
        if (bookedSlotIds.includes(s._id.toString())) {
          return { ...s, status: 'booked' };
        }
        return { ...s, status: 'available' };
      });
    } else {
      slots = slots.map(s => ({ ...s, status: 'available' }));
    }
    
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
    
    // Check if slot exists in DB at all
    const slot = await Slot.findById(slotId);
    
    if (!slot) {
      return res.status(400).json({ error: 'Invalid slot selection' });
    }

    const formattedService = service.toLowerCase();
    
    // Ensure this slot is not already booked for THIS specific service
    const existingBooking = await Booking.findOne({ slotId, service: formattedService });
    if (existingBooking) {
      return res.status(400).json({ error: 'This time slot is already booked for this specific service and level.' });
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

    // Create booking mapping full specific service to allow independent logic
    const booking = new Booking({ slotId, customerName, phone, service: formattedService });
    await booking.save();

    // Broadcast that THIS service has been booked at this slot
    io.emit('booking-confirmed', { slotId, service: formattedService });

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

// ─── ADVANCED ANALYTICS: Realistic Dataset ────────────────────────────────────
app.get('/api/advanced-analytics', authMiddleware, (req, res) => {
  const csvPath = path.resolve(__dirname, '../realistic_customer_dataset_8000.csv');

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({ error: 'Dataset CSV not found at: ' + csvPath });
  }

  const dayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const dayRevenue   = Object.fromEntries(dayNames.map(d => [d, 0]));
  const monthRevenue = Object.fromEntries(monthNames.map(m => [m, 0]));
  const qRevenue     = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  const rows = [];
  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', row => rows.push(row))
    .on('end', () => {
      const today = new Date();
      for (const r of rows) {
        const totalVisits   = parseInt(r.total_visits)         || 1;
        const avgGapDays    = parseFloat(r.avg_visit_gap_days) || 30;
        const daysSinceLast = parseInt(r.days_since_last_visit) || 0;
        const spendPerVisit = parseFloat(r.avg_spend_per_visit) || 0;

        let visitDate = new Date(today);
        visitDate.setDate(visitDate.getDate() - daysSinceLast);

        for (let v = 0; v < totalVisits; v++) {
          const d  = new Date(visitDate);
          const dow = dayNames[d.getDay()];
          const mon = monthNames[d.getMonth()];
          const mo  = d.getMonth() + 1;
          const q   = mo <= 3 ? 'Q1' : mo <= 6 ? 'Q2' : mo <= 9 ? 'Q3' : 'Q4';
          dayRevenue[dow]   += spendPerVisit;
          monthRevenue[mon] += spendPerVisit;
          qRevenue[q]       += spendPerVisit;
          visitDate.setDate(visitDate.getDate() - Math.round(avgGapDays));
        }
      }
      const r2 = v => Math.round(v * 100) / 100;
      const byDay     = dayNames.map(d => ({ day: d, revenue: r2(dayRevenue[d]) }));
      const byMonth   = monthNames.map(m => ({ month: m, revenue: r2(monthRevenue[m]) }));
      const byQuarter = Object.entries(qRevenue).map(([q, revenue]) => ({ quarter: q, revenue: r2(revenue) }));
      const peakDay   = byDay.reduce((a, b) => a.revenue > b.revenue ? a : b).day;
      const lowestDay = byDay.reduce((a, b) => a.revenue < b.revenue ? a : b).day;
      res.json({ byDay, byMonth, byQuarter, peakDay, lowestDay });
    })
    .on('error', err => res.status(500).json({ error: err.message }));
});

// ─── MONGO ANALYTICS DASHBOARD ────────────────────────────────────────────────
app.get('/api/mongo-analytics', authMiddleware, async (req, res) => {
  try {
    const [bookings, churns, inventory] = await Promise.all([
      Booking.find().lean(),
      Churn.find().lean(),
      Inventory.find().lean(),
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // ── Revenue helpers (use churn.avg_spend_per_visit as proxy per booking) ──
    const churnByPhone = {};
    for (const c of churns) {
      const key = c.phone?.replace(/\D/g,'').slice(-10);
      if (key) churnByPhone[key] = c;
    }

    const enriched = bookings.map(b => {
      const key = b.phone?.replace(/\D/g,'').slice(-10) || '';
      const c   = churnByPhone[key];
      return { ...b, spend: c?.last_visit_spend || c?.avg_spend_per_visit || 500 };
    });

    // ── Total Revenue ──
    const totalRevenue = enriched.reduce((s, b) => s + b.spend, 0);

    // ── Revenue by Day (last 7 days) ──
    const now = new Date();
    const revenueByDay = Array.from({length: 7}, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
      const total = enriched
        .filter(b => new Date(b.createdAt).toDateString() === d.toDateString())
        .reduce((s, b) => s + b.spend, 0);
      return { label, revenue: Math.round(total) };
    });

    // ── Revenue by Week (last 8 weeks) ──
    const revenueByWeek = Array.from({length: 8}, (_, i) => {
      const start = new Date(now); start.setDate(start.getDate() - (7 * (7 - i)));
      const end   = new Date(start); end.setDate(end.getDate() + 7);
      const total = enriched
        .filter(b => { const d = new Date(b.createdAt); return d >= start && d < end; })
        .reduce((s, b) => s + b.spend, 0);
      return {
        label: `W${i + 1} ${start.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`,
        revenue: Math.round(total)
      };
    });

    // ── Revenue by Month (12 months) ──
    const revenueByMonth = monthNames.map((m, idx) => {
      const total = enriched
        .filter(b => new Date(b.createdAt).getMonth() === idx)
        .reduce((s, b) => s + b.spend, 0);
      return { month: m, revenue: Math.round(total) };
    });

    // ── Visits by Month ──
    const visitsByMonth = monthNames.map((m, idx) => ({
      month: m,
      visits: bookings.filter(b => new Date(b.createdAt).getMonth() === idx).length
    }));

    // ── Visits by Day of week (all time) ──
    const visitsByDow = dayNames.map((d, i) => ({
      day: d,
      visits: bookings.filter(b => new Date(b.createdAt).getDay() === i).length
    }));

    // ── Service Performance ──
    const svcMap = {};
    for (const b of bookings) {
      const svc = (b.service || 'Unknown').split(' ')[0]; // strip "Basic/Expert"
      if (!svcMap[svc]) svcMap[svc] = { bookings: 0, revenue: 0 };
      svcMap[svc].bookings++;
    }
    for (const b of enriched) {
      const svc = (b.service || 'Unknown').split(' ')[0];
      if (svcMap[svc]) svcMap[svc].revenue += b.spend;
    }
    const servicePerformance = Object.entries(svcMap)
      .map(([name, v]) => ({ name, bookings: v.bookings, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.bookings - a.bookings);

    // ── Churn Risk Distribution ──
    const riskMap = { Low: 0, 'Low-Medium': 0, Medium: 0, High: 0 };
    for (const c of churns) {
      const r = c.churn_risk_category || 'Medium';
      if (riskMap[r] !== undefined) riskMap[r]++;
      else riskMap['Medium']++;
    }
    const churnRisk = Object.entries(riskMap).map(([risk, count]) => ({ risk, count }));

    // ── Top Customers by Total Spend ──
    const topCustomers = [...churns]
      .sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0))
      .slice(0, 8)
      .map(c => ({ name: c.name.split(' ')[0], totalSpend: Math.round(c.total_spend || 0) }));

    // ── Avg Rating by Service (from churn.avg_rating) ──
    const ratingByCity = {};
    for (const c of churns) {
      if (!c.city) continue;
      if (!ratingByCity[c.city]) ratingByCity[c.city] = { total: 0, count: 0 };
      ratingByCity[c.city].total += c.avg_rating || 0;
      ratingByCity[c.city].count++;
    }
    const cityRatings = Object.entries(ratingByCity)
      .map(([city, v]) => ({ city, avgRating: parseFloat((v.total / v.count).toFixed(2)) }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 8);

    // ── Booking Source Breakdown ──
    const sourceMap = {};
    for (const c of churns) {
      const src = c.booking_source || 'Unknown';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    }
    const bookingSource = Object.entries(sourceMap)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totalRevenue: Math.round(totalRevenue),
      totalBookings: bookings.length,
      totalCustomers: churns.length,
      revenueByDay,
      revenueByWeek,
      revenueByMonth,
      visitsByMonth,
      visitsByDow,
      servicePerformance,
      churnRisk,
      inventory,
      topCustomers,
      cityRatings,
      bookingSource,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
httpServer.listen(PORT, () => console.log('Server running on port ' + PORT));
