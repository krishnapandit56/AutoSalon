import mongoose from 'mongoose';

const churnSchema = new mongoose.Schema({
  // Identity
  name: { type: String, required: true },
  phone: { type: String, required: true },
  customer_id: { type: String, default: null },
  date: { type: Date, default: Date.now },

  // Demographics
  age: { type: Number, default: 25 },
  gender: { type: String, default: 'Female' },
  city: { type: String, default: 'Nagpur' },

  // Membership / Loyalty
  membership_type: { type: String, default: 'None' },
  membership_duration_months: { type: Number, default: 0 },
  loyalty_member: { type: Number, default: 0 },

  // Visit behaviour
  total_visits: { type: Number, default: 0 },
  days_since_last_visit: { type: Number, default: 0 },
  avg_visit_gap_days: { type: Number, default: 0 },
  num_services_used: { type: Number, default: 1 },
  has_preferred_employee: { type: Number, default: 0 },
  employee_change_count: { type: Number, default: 0 },

  // Financial
  avg_spend_per_visit: { type: Number, default: 0 },
  last_visit_spend: { type: Number, default: 0 },
  total_spend: { type: Number, default: 0 },

  // Satisfaction / feedback
  avg_rating: { type: Number, default: 3.5 },
  num_complaints: { type: Number, default: 0 },
  feedback_given: { type: Number, default: 0 },

  // Engagement signals
  offers_redeemed: { type: Number, default: 0 },
  referrals_made: { type: Number, default: 0 },
  sms_response_rate: { type: Number, default: 0 },
  products_purchased: { type: Number, default: 0 },

  // Appointment patterns
  appointments_cancelled: { type: Number, default: 0 },
  appointments_no_show: { type: Number, default: 0 },
  avg_advance_booking_days: { type: Number, default: 0 },

  // Booking channel & preference
  booking_source: { type: String, default: 'Online_App' },
  visit_time_preference: { type: String, default: 'No_Preference' },

  // Risk (synthesised label from dataset)
  churn_risk_category: { type: String, default: 'Medium' },
});

export default mongoose.model('Churn', churnSchema);
