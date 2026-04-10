import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  service: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Booking', bookingSchema);
