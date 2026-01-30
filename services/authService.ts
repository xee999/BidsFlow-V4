
const API_BASE = '/api/auth';

export const authService = {
    login: async (email: string, password: string) => {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Login failed');
        }
        return res.json();
    },
    logout: async () => {
        const res = await fetch(`${API_BASE}/logout`, { method: 'POST' });
        if (!res.ok) throw new Error('Logout failed');
        return res.json();
    },
    me: async () => {
        const res = await fetch(`${API_BASE}/me`);
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
    }
};

export const userService = {
    getAll: async () => {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },
    create: async (userData: any) => {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create user');
        }
        return res.json();
    },
    update: async (id: string, userData: any) => {
        const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!res.ok) throw new Error('Failed to update user');
        return res.json();
    },
    delete: async (id: string) => {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to deactivate user');
        return res.json();
    }
};

// Role management service
export const roleService = {
    getAll: async () => {
        const res = await fetch('/api/roles');
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch roles');
        }
        return res.json();
    },
    getById: async (id: string) => {
        const res = await fetch(`/api/roles/${id}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch role');
        }
        return res.json();
    },
    create: async (roleData: { name: string; description?: string; permissions?: Record<string, string> }) => {
        const res = await fetch('/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roleData),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create role');
        }
        return res.json();
    },
    update: async (id: string, roleData: { name?: string; description?: string; permissions?: Record<string, string> }) => {
        const res = await fetch(`/api/roles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roleData),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update role');
        }
        return res.json();
    },
    delete: async (id: string) => {
        const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete role');
        }
        return res.json();
    }
};
