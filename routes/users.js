import express from 'express';
import { User } from '../models/User.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';

const router = express.Router();

// Basic authentication for all user routes
router.use(authMiddleware);

import { Role } from '../models/Role.js';

// Get all users - requires SUPER_ADMIN
router.get('/', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const users = await User.find({}, '-password').lean();
        // Enrich with role names
        const usersWithRoles = await Promise.all(users.map(async (user) => {
            const roleData = await Role.findOne({ id: user.role });
            return {
                ...user,
                roleName: roleData ? roleData.name : user.role
            };
        }));
        res.json(usersWithRoles);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create user - requires SUPER_ADMIN
router.post('/', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const newUser = new User({
            id: `user-${Date.now()}`,
            email,
            password,
            name,
            role: role || 'VIEWER'
        });

        await newUser.save();

        const userResponse = newUser.toObject();
        delete userResponse.password;

        // Fetch role name for response
        const roleData = await Role.findOne({ id: newUser.role });
        userResponse.roleName = roleData ? roleData.name : newUser.role;

        res.status(201).json(userResponse);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update user (Own profile or admin update)
router.put('/:id', async (req, res) => {
    try {
        const { name, role, isActive, password, avatar, avatarType } = req.body;
        const user = await User.findOne({ id: req.params.id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Security check: Only allow self-update or SUPER_ADMIN
        // Convert both to strings for safe comparison
        const requestUserId = String(req.user.id);
        const targetUserId = String(req.params.id);

        console.log('Profile update attempt:', { requestUserId, targetUserId, role: req.user.role });

        if (req.user.role !== 'SUPER_ADMIN' && requestUserId !== targetUserId) {
            return res.status(403).json({ error: 'Not authorized to update this profile' });
        }

        // Handle profile fields (allowed for self and admin)
        if (name) user.name = name;
        if (avatar !== undefined) user.avatar = avatar;
        if (avatarType !== undefined) user.avatarType = avatarType;
        if (password) user.password = password;

        // Handle admin-only fields
        if (req.user.role === 'SUPER_ADMIN') {
            if (role) user.role = role;
            if (isActive !== undefined) user.isActive = isActive;
        }

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;
        res.json(userResponse);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete (Deactivate) user - requires SUPER_ADMIN
router.delete('/:id', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        const user = await User.findOne({ id: req.params.id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await User.deleteOne({ id: req.params.id });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to deactivate user' });
    }
});

export default router;
