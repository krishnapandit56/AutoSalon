import mongoose from 'mongoose';

const churnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: Date, default: Date.now },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  city: { type: String, default: 'Unknown' },
  total_visits: { type: Number, default: 0 },
  days_since_last_visit: { type: Number, default: 0 },
  avg_visit_gap_days: { type: Number, default: 0 },
  num_services_used: { type: Number, default: 0 },
  has_preferred_employee: { type: Number, default: 0 },
  avg_spend_per_visit: { type: Number, default: 0 },
  last_visit_spend: { type: Number, default: 0 },
  total_spend: { type: Number, default: 0 },
  rating: { type: Number, default: null },
  appointments_cancelled: { type: Number, default: 0 },
  booking_source: { type: String, default: 'web' }
});

export default mongoose.model('Churn', churnSchema);
