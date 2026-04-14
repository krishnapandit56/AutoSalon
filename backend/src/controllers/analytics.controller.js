import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csvParser from 'csv-parser';
import Booking from '../models/Booking.js';
import Churn from '../models/Churn.js';
import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Advanced Analytics (CSV-based) ───────────────────────────────────────────
export const getAdvancedAnalytics = catchAsync(async (req, res, next) => {
    const csvPath = path.resolve(__dirname, '../../../realistic_customer_dataset_8000.csv');
    if (!fs.existsSync(csvPath)) {
        return next(new AppError('Dataset CSV not found at: ' + csvPath, 404));
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
                const totalVisits   = parseInt(r.total_visits) || 1;
                const avgGapDays    = parseFloat(r.avg_visit_gap_days) || 30;
                const daysSinceLast = parseInt(r.days_since_last_visit) || 0;
                const spendPerVisit = parseFloat(r.avg_spend_per_visit) || 0;
                let visitDate = new Date(today);
                visitDate.setDate(visitDate.getDate() - daysSinceLast);
                for (let v = 0; v < totalVisits; v++) {
                    const d   = new Date(visitDate);
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
        .on('error', err => next(new AppError(err.message, 500)));
});

// ─── Churn Data ────────────────────────────────────────────────────────────────
export const getChurnData = catchAsync(async (req, res) => {
    const churnData = await Churn.find().sort({ total_visits: -1 }).limit(100);
    res.status(200).json(churnData);
});

// ─── Churn Predict ─────────────────────────────────────────────────────────────
export const predictChurn = catchAsync(async (req, res, next) => {
    const { name } = req.body;
    if (!name) return next(new AppError('Customer name is required.', 400));

    const trimmedName = name.trim();
    let churnData = await Churn.findOne({
        name: { $regex: new RegExp('^' + trimmedName + '$', 'i') }
    }).lean();

    if (!churnData) {
        const recentBooking = await Booking.findOne({
            customerName: { $regex: new RegExp('^' + trimmedName + '$', 'i') }
        }).sort({ createdAt: -1 }).lean();

        if (recentBooking?.phone) {
            const cleanPhone = recentBooking.phone.replace(/\D/g, '');
            const last10 = cleanPhone.slice(-10);
            churnData = await Churn.findOne({
                $or: [{ phone: recentBooking.phone }, { phone: cleanPhone }, { phone: { $regex: last10 + '$' } }]
            }).lean();
        }
    }

    if (!churnData) {
        return res.json({ error: `Data Not Found: No metrics available for '${name}' in the database.` });
    }

    const mlPayload = {
        age: churnData.age || 25,
        gender: churnData.gender || 'Female',
        city: churnData.city || 'Nagpur',
        membership_type: churnData.membership_type || 'None',
        membership_duration_months: churnData.membership_duration_months || 0,
        loyalty_member: churnData.loyalty_member || 0,
        total_visits: churnData.total_visits || 1,
        days_since_last_visit: churnData.days_since_last_visit || 0,
        avg_visit_gap_days: churnData.avg_visit_gap_days || 0,
        num_services_used: churnData.num_services_used || 1,
        has_preferred_employee: churnData.has_preferred_employee || 0,
        employee_change_count: churnData.employee_change_count || 0,
        avg_spend_per_visit: churnData.avg_spend_per_visit || 0,
        last_visit_spend: churnData.last_visit_spend || 0,
        total_spend: churnData.total_spend || 0,
        rating: churnData.avg_rating || 3.5,
        appointments_cancelled: churnData.appointments_cancelled || 0,
        appointments_no_show: churnData.appointments_no_show || 0,
        avg_advance_booking_days: churnData.avg_advance_booking_days || 0,
        booking_source: churnData.booking_source || 'Online_App',
        visit_time_preference: churnData.visit_time_preference || 'No_Preference',
        preferred_service: churnData.preferred_service || 'Unknown',
        churn_risk_category: churnData.churn_risk_category || 'Medium',
    };

    try {
        const mlUrl = process.env.ML_BACKEND_URL || 'http://localhost:5005';
        const response = await fetch(`${mlUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mlPayload)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ML Backend error');
        }
        const result = await response.json();
        res.json(result);
    } catch (err) {
        console.error('ML Prediction Error:', err.message);
        return next(new AppError('ML Service unavailable.', 503));
    }
});

// ─── Mongo Analytics (Full Implementation) ────────────────────────────────────
export const getMongoAnalytics = catchAsync(async (req, res) => {
    const [bookings, churns, inventory] = await Promise.all([
        Booking.find().lean(),
        Churn.find().lean(),
        Inventory.find().lean(),
    ]);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayNames   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    // Build phone→churn lookup
    const churnByPhone = {};
    for (const c of churns) {
        const key = c.phone?.replace(/\D/g, '').slice(-10);
        if (key) churnByPhone[key] = c;
    }

    const enriched = bookings.map(b => {
        const key = b.phone?.replace(/\D/g, '').slice(-10) || '';
        const c   = churnByPhone[key];
        return {
            ...b,
            spend: c?.last_visit_spend || c?.avg_spend_per_visit || 500,
            age: c?.age || 25,
            gender: c?.gender || 'Female',
            city: c?.city || 'Nagpur',
            total_visits: c?.total_visits || 1,
            days_since_last_visit: c?.days_since_last_visit || 0,
            avg_visit_gap_days: c?.avg_visit_gap_days || 30,
            has_preferred_employee: c?.has_preferred_employee || 0,
            avg_spend_per_visit: c?.avg_spend_per_visit || 500,
            avg_rating: c?.avg_rating || 3.5,
            appointments_cancelled: c?.appointments_cancelled || 0,
            booking_source: c?.booking_source || 'Online_App',
        };
    });

    const totalRevenue = enriched.reduce((s, b) => s + (b.spend || 0), 0);
    const now = new Date();

    // Revenue by Day (last 7 days)
    const revenueByDay = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        const total = enriched
            .filter(b => {
                const bd = new Date(b.createdAt);
                return bd.getDate() === d.getDate() && bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear();
            })
            .reduce((s, b) => s + b.spend, 0);
        return { label, revenue: Math.round(total) };
    });

    // Revenue by Week (last 8 weeks)
    const revenueByWeek = Array.from({ length: 8 }, (_, i) => {
        const start = new Date(now);
        start.setDate(now.getDate() - (7 * (7 - i)));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);
        const total = enriched
            .filter(b => { const d = new Date(b.createdAt); return d >= start && d < end; })
            .reduce((s, b) => s + b.spend, 0);
        return { label: `W${i + 1} (${start.getDate()}/${start.getMonth() + 1})`, revenue: Math.round(total) };
    });

    // Revenue by Month
    const revenueByMonth = monthNames.map((m, idx) => {
        const total = enriched
            .filter(b => new Date(b.createdAt).getMonth() === idx)
            .reduce((s, b) => s + b.spend, 0);
        return { month: m, revenue: Math.round(total), label: m };
    });

    // Service Performance
    const svcMap = {};
    for (const b of enriched) {
        const svc = (b.service || 'Unknown').split(' ')[0];
        if (!svcMap[svc]) svcMap[svc] = { bookings: 0, revenue: 0 };
        svcMap[svc].bookings++;
        svcMap[svc].revenue += b.spend;
    }
    const servicePerformance = Object.entries(svcMap)
        .map(([name, v]) => ({ name, bookings: v.bookings, revenue: Math.round(v.revenue) }))
        .sort((a, b) => b.bookings - a.bookings);

    // Churn Risk Distribution
    const riskMap = { Low: 0, 'Low-Medium': 0, Medium: 0, High: 0 };
    for (const c of churns) {
        const r = c.churn_risk_category || 'Medium';
        if (riskMap[r] !== undefined) riskMap[r]++;
        else riskMap['Medium']++;
    }
    const churnRisk = Object.entries(riskMap).map(([risk, count]) => ({ risk, count }));

    // Booking Source Breakdown
    const sourceMap = {};
    for (const c of churns) {
        const src = c.booking_source || 'Unknown';
        sourceMap[src] = (sourceMap[src] || 0) + 1;
    }
    const bookingSource = Object.entries(sourceMap)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

    // Demand Forecasting via ML
    let demandForecast = {
        distribution: { Low: 0, Medium: 0, High: 0 },
        summary: { 'High%': 0, 'Medium%': 0, 'Low%': 0 },
        dominant_demand: 'Unknown'
    };
    try {
        const mlPayload = enriched.slice(0, 50).map(b => ({
            age: b.age, gender: b.gender, city: b.city,
            total_visits: b.total_visits, days_since_last_visit: b.days_since_last_visit,
            avg_visit_gap_days: b.avg_visit_gap_days, has_preferred_employee: b.has_preferred_employee,
            avg_spend_per_visit: b.avg_spend_per_visit, last_visit_spend: b.spend,
            total_spend: b.spend * b.total_visits, avg_rating: b.avg_rating,
            appointments_cancelled: b.appointments_cancelled, booking_source: b.booking_source,
            preferred_service: (b.service || '').split(' ')[0],
        }));

        const mlRes = await fetch(`${process.env.ML_BACKEND_URL || 'http://localhost:5005'}/predict-demand`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mlPayload)
        });
        if (mlRes.ok) {
            demandForecast = await mlRes.json();
            const multiplier = demandForecast.dominant_demand === 'High' ? 1.4
                             : demandForecast.dominant_demand === 'Medium' ? 1.1 : 0.9;
            const lastDayRev    = revenueByDay[revenueByDay.length - 1].revenue;
            const currMonthIdx  = now.getMonth();
            const nextMonthName = monthNames[(currMonthIdx + 1) % 12];
            const lastMonthRev  = revenueByMonth[currMonthIdx].revenue || (totalRevenue / 12);
            revenueByDay.push({ label: 'Tomorrow (P)', revenue: Math.round(lastDayRev * multiplier), isPredicted: true });
            revenueByMonth.push({ month: nextMonthName, revenue: Math.round(lastMonthRev * multiplier), label: `${nextMonthName} (P)`, isPredicted: true });
        }
    } catch (e) { console.error('Demand forecast error:', e.message); }

    res.json({
        totalRevenue: Math.round(totalRevenue),
        totalBookings: bookings.length,
        revenueByDay,
        revenueByWeek,
        revenueByMonth,
        visitsByMonth: monthNames.map((m, idx) => ({
            month: m,
            visits: bookings.filter(b => new Date(b.createdAt).getMonth() === idx).length
        })),
        visitsByDow: dayNames.map((d, i) => ({
            day: d,
            visits: bookings.filter(b => new Date(b.createdAt).getDay() === i).length
        })),
        servicePerformance,
        churnRisk,
        inventory,
        topCustomers: [...churns]
            .sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0))
            .slice(0, 8)
            .map(c => ({ name: c.name.split(' ')[0], totalSpend: Math.round(c.total_spend || 0) })),
        bookingSource,
        demandForecast,
    });
});
