import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';

export const registerAdmin = catchAsync(async (req, res, next) => {
    const { username, password } = req.body;

    const existing = await Admin.findOne({ username });
    if (existing) {
        return next(new AppError('Username already exists', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();

    res.status(201).json({ success: true, message: 'Admin registered successfully' });
});

export const loginAdmin = catchAsync(async (req, res, next) => {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
        return next(new AppError('Invalid credentials', 400));
    }

    const validPass = await bcrypt.compare(password, admin.password);
    if (!validPass) {
        return next(new AppError('Invalid credentials', 400));
    }

    const token = jwt.sign({ _id: admin._id }, process.env.JWT_SECRET, {
        expiresIn: '7d'
    });

    res.status(200).json({ token });
});
