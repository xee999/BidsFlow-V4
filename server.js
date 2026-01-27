import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Bid } from './models/Bid.ts';
import { VaultAsset } from './models/VaultAsset.ts';
import { AuditLog } from './models/AuditLog.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Increase payload limit for base64 file data
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection Logic
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('MONGODB_URI not provided. Skipping DB connection.');
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// Bids
app.get('/api/bids', async (req, res) => {
    try {
        const bids = await Bid.find().sort({ createdAt: -1 });
        res.json(bids);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bids', async (req, res) => {
    try {
        const bid = new Bid(req.body);
        await bid.save();
        res.status(201).json(bid);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/bids/:id', async (req, res) => {
    try {
        const bid = await Bid.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!bid) return res.status(404).json({ error: 'Bid not found' });
        res.json(bid);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/bids/:id', async (req, res) => {
    try {
        const bid = await Bid.findOneAndDelete({ id: req.params.id });
        if (!bid) return res.status(404).json({ error: 'Bid not found' });
        res.json({ message: 'Bid deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Vault Assets
app.get('/api/vault', async (req, res) => {
    try {
        const assets = await VaultAsset.find().sort({ createdAt: -1 });
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vault', async (req, res) => {
    try {
        const asset = new VaultAsset(req.body);
        await asset.save();
        res.status(201).json(asset);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/vault/:id', async (req, res) => {
    try {
        const asset = await VaultAsset.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/vault/:id', async (req, res) => {
    try {
        const asset = await VaultAsset.findOneAndDelete({ id: req.params.id });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json({ message: 'Asset deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Audit Logs
app.get('/api/audit', async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/audit', async (req, res) => {
    try {
        const log = new AuditLog(req.body);
        await log.save();
        res.status(201).json(log);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// All other requests serve the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
