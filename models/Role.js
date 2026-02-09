import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    permissions: {
        'bid-intake': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'bid-stages': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'studio': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'vault': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'calculator': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'approvals': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'reports': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'risk-watch': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'settings': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'edit_bids': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
        'delete-manager': { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
    },
    isBuiltIn: { type: Boolean, default: false },
}, { timestamps: true });


RoleSchema.index({ isBuiltIn: 1 });

export const Role = mongoose.model('Role', RoleSchema);

export const BUILT_IN_ROLES = [
    {
        id: 'SUPER_ADMIN',
        name: 'Super Admin',
        description: 'Full system access with all permissions',
        permissions: {
            'bid-intake': 'edit',
            'bid-stages': 'edit',
            'studio': 'edit',
            'vault': 'edit',
            'calculator': 'edit',
            'approvals': 'edit',
            'reports': 'edit',
            'risk-watch': 'edit',
            'settings': 'edit',
            'edit_bids': 'edit',
            'delete-manager': 'edit',
        },
        isBuiltIn: true,
    },
    {
        id: 'BID_TEAM',
        name: 'Bids Team',
        description: 'Bid operations access for proposal management',
        permissions: {
            'bid-intake': 'edit',
            'bid-stages': 'edit',
            'studio': 'edit',
            'vault': 'edit',
            'calculator': 'edit',
            'approvals': 'edit',
            'reports': 'view',
            'risk-watch': 'view',
            'settings': 'none',
            'edit_bids': 'edit',
            'delete-manager': 'none',
        },
        isBuiltIn: true,
    },
    {
        id: 'VIEWER',
        name: 'Viewer',
        description: 'Read-only access to view bids and reports',
        permissions: {
            'bid-intake': 'none',
            'bid-stages': 'view',
            'studio': 'none',
            'vault': 'view',
            'calculator': 'none',
            'approvals': 'view',
            'reports': 'view',
            'risk-watch': 'view',
            'settings': 'none',
            'edit_bids': 'none',
            'delete-manager': 'none',
        },
        isBuiltIn: true,
    },
];

export const seedBuiltInRoles = async () => {
    try {
        // Map of Legacy ID -> New Standard ID
        const legacyIdMap = {
            'role-master-admin': 'SUPER_ADMIN',
            'role-super-admin': 'SUPER_ADMIN',
            'role-bid-team': 'BID_TEAM',
            'role-viewer': 'VIEWER'
        };

        // 1. Perform Migration of Legacy IDs
        for (const [legacyId, newId] of Object.entries(legacyIdMap)) {
            const legacyRole = await Role.findOne({ id: legacyId });
            if (legacyRole) {
                // Check if target ID already exists to avoid collision
                const targetExists = await Role.findOne({ id: newId });
                if (!targetExists) {
                    await Role.updateOne({ id: legacyId }, { $set: { id: newId } });
                    console.log(`✓ Migrated role ${legacyId} to ${newId}`);
                } else {
                    // If both exist (rare), delete the legacy one to prefer the new one
                    await Role.deleteOne({ id: legacyId });
                    console.log(`✓ Removed legacy role ${legacyId} (standard ${newId} already exists)`);
                }
            }
        }

        // 2. Handle Name Collisions (Case where ID is different but name matches)
        // This handles cases where 'role-super-admin' might not exist but a role named 'Super Admin' with 'role-xxx' ID does.
        for (const roleData of BUILT_IN_ROLES) {
            const existingByName = await Role.findOne({ name: roleData.name });
            if (existingByName && existingByName.id !== roleData.id) {
                // Check if the slot for the correct ID is taken
                const existingById = await Role.findOne({ id: roleData.id });
                if (existingById) {
                    // Both exist: Correct ID and Correct Name (but different doc).
                    // We should keep the one with the Correct ID, and delete the name collision?
                    // Or just rename the collision? Better to delete/merge.
                    // Since built-in roles are static, we assume the one with matching Name but wrong ID is legacy.
                    await Role.deleteOne({ _id: existingByName._id });
                    console.log(`✓ Removed duplicate role by name: ${roleData.name} (ID: ${existingByName.id})`);
                } else {
                    // Only the name match exists. Update its ID to the standard ID.
                    await Role.updateOne({ _id: existingByName._id }, { $set: { id: roleData.id, isBuiltIn: true } });
                    console.log(`✓ Aligned role ID for: ${roleData.name} -> ${roleData.id}`);
                }
            }
        }

        // 3. Upsert Roles (Standard Seeding)
        for (const roleData of BUILT_IN_ROLES) {
            await Role.findOneAndUpdate(
                { id: roleData.id },
                roleData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`✓ Seeded built-in role: ${roleData.name}`);
        }
    } catch (error) {
        console.error('Error seeding built-in roles:', error);
    }
};
