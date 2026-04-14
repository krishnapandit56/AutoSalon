import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import adminRoutes from './routes/admin.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(mongoSanitize());

// Rate Limiting (apply to all /api/ requests)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api', bookingRoutes);        // /api/slots, /api/confirm-booking...
app.use('/api/inventory', inventoryRoutes);
app.use('/api', analyticsRoutes);      // /api/churn, /api/mongo-analytics...

// Catch-All Error Handler
app.use(errorHandler);

export default app;
