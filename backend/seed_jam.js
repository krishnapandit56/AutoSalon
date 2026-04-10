import mongoose from 'mongoose';
import Churn from './models/Churn.js';

mongoose.connect('mongodb+srv://krishnapandit52005:AutoSalon@autosaloncluster.qetbmgu.mongodb.net/salon_db?appName=AutoSalonCluster')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Create the test record
    const jamData = new Churn({
        name: 'jam forest',
        phone: '5987556324',
        age: 28,
        gender: 'Male',
        city: 'Nagpur',
        membership_type: 'None',
        membership_duration_months: 0,
        loyalty_member: 0,
        total_visits: 3,
        days_since_last_visit: 15,
        avg_visit_gap_days: 45,
        num_services_used: 2,
        has_preferred_employee: 1,
        employee_change_count: 0,
        avg_spend_per_visit: 800,
        last_visit_spend: 800,
        total_spend: 2400,
        avg_rating: 4.0,
        num_complaints: 0,
        feedback_given: 1,
        offers_redeemed: 0,
        referrals_made: 0,
        sms_response_rate: 0.5,
        products_purchased: 0,
        appointments_cancelled: 0,
        appointments_no_show: 0,
        avg_advance_booking_days: 2,
        booking_source: 'Online_App',
        visit_time_preference: 'Evening',
        churn_risk_category: 'Medium'
    });

    await jamData.save();
    console.log('Successfully created Churn record for "jam forest"!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
