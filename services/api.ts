import { BidRecord, TechnicalDocument, ActivityLog } from '../types.ts';

const API_BASE = '/api';

export const bidApi = {
    getAll: async (): Promise<BidRecord[]> => {
        const res = await fetch(`${API_BASE}/bids`);
        if (!res.ok) throw new Error('Failed to fetch bids');
        return res.json();
    },
    create: async (bid: BidRecord): Promise<BidRecord> => {
        const res = await fetch(`${API_BASE}/bids`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bid),
        });
        if (!res.ok) throw new Error('Failed to create bid');
        return res.json();
    },
    update: async (bid: BidRecord): Promise<BidRecord> => {
        const res = await fetch(`${API_BASE}/bids/${bid.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bid),
        });
        if (!res.ok) throw new Error('Failed to update bid');
        return res.json();
    },
    remove: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/bids/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete bid');
    },
};

export const vaultApi = {
    getAll: async (): Promise<TechnicalDocument[]> => {
        const res = await fetch(`${API_BASE}/vault`);
        if (!res.ok) throw new Error('Failed to fetch vault assets');
        return res.json();
    },
    create: async (asset: TechnicalDocument): Promise<TechnicalDocument> => {
        const res = await fetch(`${API_BASE}/vault`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset),
        });
        if (!res.ok) throw new Error('Failed to create vault asset');
        return res.json();
    },
    update: async (asset: TechnicalDocument): Promise<TechnicalDocument> => {
        // We can add a PUT route for vault if needed, or use the post route if it handles upserts.
        // For now, let's assume we have a PUT /api/vault/:id route (I'll add it to server.js).
        const res = await fetch(`${API_BASE}/vault/${asset.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(asset),
        });
        if (!res.ok) throw new Error('Failed to update vault asset');
        return res.json();
    },
};

export const auditApi = {
    getAll: async (): Promise<ActivityLog[]> => {
        const res = await fetch(`${API_BASE}/audit`);
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        return res.json();
    },
    create: async (log: ActivityLog): Promise<ActivityLog> => {
        const res = await fetch(`${API_BASE}/audit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(log),
        });
        if (!res.ok) throw new Error('Failed to create audit log');
        return res.json();
    },
};
