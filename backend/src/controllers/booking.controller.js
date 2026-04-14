import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import Churn from '../models/Churn.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import { getIO } from '../sockets/socket.js';
import { sendBookingConfirmation } from '../utils/sms.js';

export const getSlots = catchAsync(async (req, res) => {
    const { service } = req.query;
    let slots = await Slot.find().lean();
    
    if (service) {
        const bookedService = service.toLowerCase();
        const bookings = await Booking.find({ service: bookedService }).lean();
        const bookedSlotIds = bookings.map(b => b.slotId.toString());
        
        slots = slots.map(s => ({
            ...s, 
            status: bookedSlotIds.includes(s._id.toString()) ? 'booked' : 'available'
        }));
    } else {
        slots = slots.map(s => ({ ...s, status: 'available' }));
    }
    
    res.status(200).json(slots);
});

export const holdSlot = catchAsync(async (req, res, next) => {
    const { slotId, userId } = req.body;
    const holdExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const slot = await Slot.findOneAndUpdate(
        { _id: slotId, status: 'available' },
        { status: 'held', heldBy: userId, holdExpiry },
        { new: true }
    );

    if (!slot) return next(new AppError('Slot already booked or held', 400));

    getIO().emit('slot-updated', { slotId, status: 'held', heldBy: userId, holdExpiry });
    res.status(200).json(slot);
});

export const confirmBooking = catchAsync(async (req, res, next) => {
    const { slotId, userId, customerName, phone, service, age, gender, city } = req.body;
    
    const slot = await Slot.findById(slotId);
    if (!slot) return next(new AppError('Invalid slot selection', 400));

    const formattedService = service.toLowerCase();
    
    const existingBooking = await Booking.findOne({ slotId, service: formattedService });
    if (existingBooking) {
        return next(new AppError('This time slot is already booked for this specific service and level.', 400));
    }

    // -- CHURN UPDATE LOGIC --
    let last_visit_spend = 500;
    if (service.includes('Intermediate')) last_visit_spend = 800;
    else if (service.includes('Expert')) last_visit_spend = 1500;

    let visit_time_preference = 'Evening';
    try {
        const timeStr = slot.time.toLowerCase();
        const isPm = timeStr.includes('pm');
        const hour = parseInt(timeStr);
        if (!isPm || hour === 12) visit_time_preference = 'Morning';
        else if (hour >= 1 && hour < 4) visit_time_preference = 'Afternoon';
    } catch(e) {}

    const cleanPhone = phone.replace(/\\D/g, '');
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
        
        churnData.name = customerName;
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
        churnData = new Churn({
            name: customerName,
            phone, age: age || 25, gender: gender || 'Female', city: city || 'Nagpur',
            membership_type: 'None', membership_duration_months: 0, loyalty_member: 0,
            total_visits: 1, days_since_last_visit: 0, avg_visit_gap_days: 0,
            num_services_used: 1, has_preferred_employee: 0, employee_change_count: 0,
            avg_spend_per_visit: last_visit_spend, last_visit_spend: last_visit_spend,
            total_spend: last_visit_spend, avg_rating: 3.5, num_complaints: 0,
            feedback_given: 0, offers_redeemed: 0, referrals_made: 0, sms_response_rate: 0,
            products_purchased: 0, appointments_cancelled: 0, appointments_no_show: 0,
            avg_advance_booking_days: 0, booking_source: 'Online_App',
            visit_time_preference: visit_time_preference, preferred_service: service,
            churn_risk_category: 'Medium', date: now
        });
        await churnData.save();
    }

    const booking = new Booking({ slotId, customerName, phone, service: formattedService });
    await booking.save();

    getIO().emit('booking-confirmed', { slotId, service: formattedService });
    
    // Async SMS send without blocking the API response
    sendBookingConfirmation(phone, customerName, service, slot.time);

    res.status(201).json(booking);
});

export const getAllBookings = catchAsync(async (req, res) => {
    const bookings = await Booking.find().populate('slotId').sort({ createdAt: -1 });
    res.status(200).json(bookings);
});
