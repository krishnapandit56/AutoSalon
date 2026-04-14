import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError.js';

export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return next(new AppError('Access denied. No token provided.', 401));
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = verified;
        next();
    } catch (err) {
        next(new AppError('Invalid or expired token', 400));
    }
};
