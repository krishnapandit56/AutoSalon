import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true },
  status: { type: String, enum: ['available', 'held', 'booked'], default: 'available' },
  heldBy: { type: String, default: null }, // Using sessionId or userId
  holdExpiry: { type: Date, default: null }
});

export default mongoose.model('Slot', slotSchema);
