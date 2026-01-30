import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET must be defined and at least 32 characters long in production.');
    } else {
        console.warn('WARNING: JWT_SECRET is not set or too short. Using a safe fallback for DEVELOPMENT ONLY.');
    }
}

// For dev only, we can use a fallback if absolutely necessary to not break local dev immediately, 
// but ideal is to force env var. Let's force env var for better habits.
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required.');
}

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findOne({ id: decoded.id });

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const roleCheck = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied: insufficient permissions' });
        }
        next();
    };
};
