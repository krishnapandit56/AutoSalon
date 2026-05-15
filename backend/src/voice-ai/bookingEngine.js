// ─── BOOKING ENGINE ──────────────────────────────────────────────────────────
// Handles all database logic: slot checking, booking creation, SMS confirmation.
// Reuses the same MongoDB models as the existing booking system.

import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import Churn from '../models/Churn.js';
import twilio from 'twilio';
import { normalizeTime } from './intentParser.js';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// All valid slot times (11am-10pm, 30 min intervals)
const ALL_SLOTS = [
  '11am', '11.30 am', '12pm', '12.30 pm', '1pm', '1.30 pm',
  '2pm', '2.30 pm', '3pm', '3.30 pm', '4pm', '4.30 pm',
  '5pm', '5.30 pm', '6pm', '6.30 pm', '7pm', '7.30 pm',
  '8pm', '8.30 pm', '9pm', '9.30 pm', '10pm'
];

// ─── Normalize for flexible matching ─────────────────────────────────────────
const canonical = (str) =>
  (str || '').toLowerCase().replace(/\s+/g, '').replace(':', '.');

/**
 * Find a Slot document by time string (flexible matching).
 */
export const findSlotByTime = async (timeStr) => {
  if (!timeStr) return null;

  const normalized = normalizeTime(timeStr) || timeStr;
  const targetKey  = canonical(normalized);

  // Fetch all slots (only 23 docs — fast) and match canonically
  const allSlots = await Slot.find({}).lean();

  const match = allSlots.find(s => canonical(s.time) === targetKey);
  if (match) return await Slot.findById(match._id);

  // Wider fallback: strip am/pm and match just the hour
  const hourOnly = targetKey.replace(/[ap]m$/, '');
  const hourMatch = allSlots.find(s => canonical(s.time).replace(/[ap]m$/, '') === hourOnly);
  if (hourMatch) return await Slot.findById(hourMatch._id);

  console.warn(`[BookingEngine] Could not find slot for "${timeStr}" (normalized: "${normalized}", key: "${targetKey}")`);
  console.warn(`[BookingEngine] Available slot keys: ${allSlots.map(s => canonical(s.time)).join(', ')}`);
  return null;
};

/**
 * Check if a specific slot is available.
 * Uses slot.status as the source of truth (avoids false positives from
 * historical CSV bookings in the Booking collection).
 */
export const checkSlotAvailability = async (timeStr, _service) => {
  const slot = await findSlotByTime(timeStr);

  if (!slot) {
    // Slot not in DB — log it, but don't block the caller
    console.warn(`[BookingEngine] Slot not found for "${timeStr}" — treating as available`);
    return { available: true, reason: 'Slot not in DB — assumed available', slot: null };
  }

  // Check holdExpiry — if held but expired, treat as available
  if (slot.status === 'held' && slot.holdExpiry && new Date() > new Date(slot.holdExpiry)) {
    console.log(`[BookingEngine] Slot "${slot.time}" hold expired — available`);
    return { available: true, slot };
  }

  if (slot.status === 'booked') {
    console.log(`[BookingEngine] Slot "${slot.time}" is booked`);
    return { available: false, reason: 'Already booked', slot };
  }

  if (slot.status === 'held') {
    console.log(`[BookingEngine] Slot "${slot.time}" is held`);
    return { available: false, reason: 'Slot is currently held', slot };
  }

  console.log(`[BookingEngine] Slot "${slot.time}" is available (status: ${slot.status})`);
  return { available: true, slot };
};

/**
 * Get list of available slot times for a service (uses slot.status).
 */
export const getAvailableSlots = async (_service) => {
  const allSlots = await Slot.find({
    $or: [
      { status: 'available' },
      { status: 'held', holdExpiry: { $lt: new Date() } }, // expired holds
    ]
  }).lean();

  return allSlots.map(s => s.time).slice(0, 5);
};

/**
 * Get 3 alternative available slot times near the requested time.
 */
export const getAlternativeSlots = async (requestedTime, service) => {
  const available = await getAvailableSlots(service);
  return available.slice(0, 3);
};

/**
 * Create a complete voice booking in MongoDB (same logic as /api/confirm-booking).
 */
export const createVoiceBooking = async (data) => {
  const { service, tier, slotId, slot, name, age, gender, city, phone } = data;
  const fullService     = `${service} ${tier}`;
  const formattedService = fullService.toLowerCase();

  // Double-check slot still available using status field
  const slotDoc = slot || await Slot.findById(slotId);
  if (!slotDoc) throw new Error('Slot not found');

  if (slotDoc.status === 'booked') {
    throw new Error('Slot was just booked by someone else');
  }

  // Determine price based on tier
  let last_visit_spend = 500;
  if (tier === 'Intermediate') last_visit_spend = 800;
  else if (tier === 'Expert')  last_visit_spend = 1500;

  // Determine visit time preference
  let visit_time_preference = 'No_Preference';
  try {
    const timeStr = slotDoc.time.toLowerCase();
    const isPm    = timeStr.includes('pm');
    const hour    = parseInt(timeStr);
    if (!isPm || hour === 12) visit_time_preference = 'Morning';
    else if (hour >= 1 && hour < 4) visit_time_preference = 'Afternoon';
    else visit_time_preference = 'Evening';
  } catch (e) {}

  // Normalize phone
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const last10     = cleanPhone.slice(-10);

  // Update or create Churn record
  const now = new Date();
  let churnData = await Churn.findOne({
    $or: [
      { phone },
      { phone: cleanPhone },
      { phone: { $regex: last10 + '$' } }
    ]
  });

  if (churnData) {
    const diffDays = Math.floor(Math.abs(now - new Date(churnData.date)) / (1000 * 60 * 60 * 24));
    churnData.name               = name;
    churnData.days_since_last_visit = diffDays;
    churnData.total_visits       += 1;
    churnData.total_spend        += last_visit_spend;
    churnData.avg_spend_per_visit = churnData.total_spend / churnData.total_visits;
    churnData.last_visit_spend   = last_visit_spend;
    churnData.date               = now;
    churnData.visit_time_preference = visit_time_preference;
    if (age)    churnData.age    = age;
    if (gender) churnData.gender = gender;
    if (city)   churnData.city   = city;
    churnData.booking_source     = 'Voice_Call';
    churnData.is_new_customer    = churnData.total_visits <= 1;
    await churnData.save();
  } else {
    churnData = new Churn({
      name, phone,
      age: age || 25,
      gender: gender || 'Female',
      city: city || 'Nagpur',
      membership_type: 'None',
      total_visits: 1,
      days_since_last_visit: 0,
      avg_spend_per_visit: last_visit_spend,
      last_visit_spend,
      total_spend: last_visit_spend,
      avg_rating: 3.5,
      booking_source: 'Voice_Call',
      visit_time_preference,
      preferred_service: service,
      churn_risk_category: 'Medium',
      is_new_customer: true,
    });
    await churnData.save();
  }

  // Save booking
  const booking = new Booking({
    slotId: slotDoc._id,
    customerName: name,
    phone,
    service: formattedService
  });
  await booking.save();

  // ── Mark slot as booked ──────────────────────────────────────────────────
  await Slot.findByIdAndUpdate(slotDoc._id, { status: 'booked', heldBy: null, holdExpiry: null });
  console.log(`[BookingEngine] Slot "${slotDoc.time}" marked as booked`);

  // Send SMS confirmation
  try {
    const slotTime      = slotDoc?.time || data.slot_time;
    const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone.replace(/\D/g, '');
    await twilioClient.messages.create({
      body: `Hi ${name}! Your AutoSalon appointment for ${fullService} is confirmed for ${slotTime}. See you soon! 💇`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    console.log(`[BookingEngine] SMS sent to ${formattedPhone}`);
  } catch (smsErr) {
    console.error('[BookingEngine] SMS failed:', smsErr.message);
    // Don't throw — booking is still saved
  }

  return booking;
};
