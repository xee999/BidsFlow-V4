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
        const { email: rawEmail, password } = req.body;
        
        if (!rawEmail || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const email = rawEmail.toLowerCase().trim();
        console.log(`Login attempt for: ${email}`);

        const user = await User.findOne({ email });

        if (!user) {
            console.warn(`Login failed: User not found for ${email}`);
            // Use generic error message for security
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.password) {
            console.error(`CRITICAL: User document for ${email} is missing the password field!`);
            return res.status(500).json({ error: 'System error: User account configuration issue' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.warn(`Login failed: Incorrect password for ${email}`);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.isActive) {
            console.warn(`Login failed: Account deactivated for ${email}`);
            return res.status(401).json({ error: 'Account is deactivated' });
        }

        if (!JWT_SECRET) {
            console.error('Login failed: JWT_SECRET not configured');
            return res.status(500).json({ error: 'Internal server error' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
            expiresIn: '30m',
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 60 * 1000, // 30 minutes
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
