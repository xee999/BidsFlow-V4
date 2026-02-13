import express from 'express';
import { Role, seedBuiltInRoles } from '../models/Role.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/roles - List all roles
router.get('/', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const roles = await Role.find().sort({ isBuiltIn: -1, name: 1 });
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// GET /api/roles/:id - Get single role
router.get('/:id', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const role = await Role.findOne({ id: req.params.id });
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        res.json(role);
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ error: 'Failed to fetch role' });
    }
});

// POST /api/roles - Create new role
router.post('/', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        // Check for duplicate name
        const existingRole = await Role.findOne({ name: name.trim() });
        if (existingRole) {
            return res.status(400).json({ error: 'A role with this name already exists' });
        }

        // Default permissions if not provided
        const defaultPermissions = {
            'bid-intake': 'none',
            'bid-stages': 'none',
            'studio': 'none',
            'vault': 'none',
            'calculator': 'none',
            'approvals': 'none',
            'reports': 'none',
            'risk-watch': 'none',
            'settings': 'none',
        };

        const newRole = await Role.create({
            id: `role-${crypto.randomUUID()}`,
            name: name.trim(),
            description: description || '',
            permissions: { ...defaultPermissions, ...permissions },
            isBuiltIn: false,
        });

        console.log(`✓ Created new role: ${newRole.name}`);
        res.status(201).json(newRole);
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// PUT /api/roles/:id - Update role
router.put('/:id', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await Role.findOne({ id: req.params.id });
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Check if modifying built-in role
        if (role.isBuiltIn) {
            // Prevent changing name of built-in roles
            if (name && name.trim() !== role.name) {
                return res.status(403).json({ error: 'Cannot change the name of built-in roles' });
            }
        } else {
            // For custom roles, check for duplicate name if name is being changed
            if (name && name.trim() !== role.name) {
                const existingRole = await Role.findOne({ name: name.trim() });
                if (existingRole) {
                    return res.status(400).json({ error: 'A role with this name already exists' });
                }
                role.name = name.trim();
            }
        }

        if (description !== undefined) {
            role.description = description;
        }

        if (permissions) {
            role.permissions = { ...role.permissions, ...permissions };
        }

        await role.save();
        console.log(`✓ Updated role: ${role.name}`);
        res.json(role);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// DELETE /api/roles/:id - Delete role
router.delete('/:id', roleCheck(['SUPER_ADMIN']), async (req, res) => {
    try {
        const role = await Role.findOne({ id: req.params.id });
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent deleting built-in roles
        if (role.isBuiltIn) {
            return res.status(403).json({ error: 'Built-in roles cannot be deleted' });
        }

        await Role.deleteOne({ id: req.params.id });
        console.log(`✓ Deleted role: ${role.name}`);
        res.json({ message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

export default router;
