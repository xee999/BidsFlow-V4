import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { authMiddleware } from '../middleware/auth.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Rate limiting for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP per window
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Helper to get role with permissions
async function getUserWithRole(user) {
    const roleData = await Role.findOne({ id: user.role });
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleName: roleData ? roleData.name : user.role,
        avatar: user.avatar,
        avatarType: user.avatarType,
        permissions: roleData ? roleData.permissions : null
    };
}

// Login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Use generic error message for security
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.password) {
            console.error(`CRITICAL: User document for ${email} is missing the password field!`);
            return res.status(500).json({ error: 'System error: User account configuration issue' });
        }

        if (!(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        if (!JWT_SECRET) {
            console.error('Login failed: JWT_SECRET not configured');
            return res.status(500).json({ error: 'Internal server error' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
            expiresIn: '24h',
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        const userWithRole = await getUserWithRole(user);
        res.json({ user: userWithRole });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Current User Info
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userWithRole = await getUserWithRole(req.user);
        res.json({ user: userWithRole });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

export default router;
