import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { type: String, enum: ['free', 'locked', 'booked'], default: 'free' },
  lockedAt: { type: Date, default: null },
  sessionId: { type: String, default: null } // To identify who locked it
});

export default mongoose.model('Slot', slotSchema);
