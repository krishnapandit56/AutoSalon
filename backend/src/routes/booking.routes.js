import express from 'express';
import { getSlots, holdSlot, confirmBooking, getAllBookings } from '../controllers/booking.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Public routes for customers
router.get('/slots', getSlots);
router.post('/hold-slot', holdSlot);
router.post('/confirm-booking', confirmBooking);

// Protected routes for admins
router.get('/all', authMiddleware, getAllBookings);

export default router;
