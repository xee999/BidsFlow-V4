import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import { authMiddleware } from './middleware/auth.js';
import { Bid } from './models/Bid.js';
import { VaultAsset } from './models/VaultAsset.js';
import { AuditLog } from './models/AuditLog.js';
import { User } from './models/User.js';
import { analyzeBidDocumentServer } from './middleware/ai.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import { Role, seedBuiltInRoles } from './models/Role.js';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// TODO: Revert this to process.env.MONGODB_URI after updating Cloud Run secrets
const MONGODB_URI = process.env.MONGODB_URI_OVERRIDE || 'mongodb://bidsflow_user:Smart%404ever@34.172.151.20:27017/bidsflow';

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ?
        process.env.ALLOWED_ORIGINS.split(',') :
        ['http://localhost:5173', 'https://bidsflow-app.run.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Increase payload limit for base64 file data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true })); // HIGH-005: Limit Request Sizes
app.use(cookieParser());

// Request logging middleware (Non-production only for detailed logs)
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
});

// MongoDB Connection Logic - HIGH-006: DB Connection Recovery
const connectDB = async () => {
    if (!MONGODB_URI) {
        console.warn('MONGODB_URI not provided. Skipping DB connection.');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });
        console.log('Connected to MongoDB');

        // Create default admin user if none exists
        await createDefaultAdmin();
        // Seed built-in roles
        await seedBuiltInRoles();
    } catch (err) {
        console.error('MongoDB connection error:', err);
        // Retry logic handled by mongoose usually, but explicit retry for initial connection failure
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected! Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected.');
});

connectDB();

// Create default admin user on first startup
async function createDefaultAdmin() {
    try {
        // Migration: Update any existing MASTER_ADMIN roles to SUPER_ADMIN
        const migrationResult = await User.updateMany(
            { role: 'MASTER_ADMIN' },
            { $set: { role: 'SUPER_ADMIN' } }
        );
        if (migrationResult.modifiedCount > 0) {
            console.log(`✓ Migrated ${migrationResult.modifiedCount} users from MASTER_ADMIN to SUPER_ADMIN`);
        }

        const adminExists = await User.findOne({ role: 'SUPER_ADMIN' });

        if (!adminExists) {
            // Generate a strong random password or use env var
            const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');

            const defaultAdmin = new User({
                id: `user-${crypto.randomUUID()}`,
                email: 'admin@bidsflow.com',
                password: adminPassword,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                isActive: true,
            });
            await defaultAdmin.save();

            if (process.env.NODE_ENV !== 'production') {
                console.log('⚠️  SECURITY: Default admin created.');
                console.log('   Email: admin@bidsflow.com');
                console.log(`   Password: ${adminPassword}`); // Only show in non-prod
                console.log('⚠️  IMPORTANT: Change this password immediately!');
            } else {
                console.log('Default admin user created. Check secure logs for details or reset password.');
            }
        }
    } catch (err) {
        console.error('Error creating default admin:', err);
    }
}

// Middleware to check DB connection
const checkDbConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            error: 'Database disconnected',
            details: 'The server is unable to connect to the database. Please ensure MongoDB is running.'
        });
    }
    next();
};

// =============================================================================
// API Routes
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// AI Analysis Proxy
// AI Analysis Proxy - Secured
app.post('/api/ai/analyze-bid', authMiddleware, async (req, res) => {
    try {
        const { fileName, fileContentBase64 } = req.body;
        if (!fileContentBase64) {
            return res.status(400).json({ error: 'File content is required' });
        }

        // Basic size check before processing (though limit is 50mb, we might want to be stricter here)
        // 15MB limit for PDFs
        if (fileContentBase64.length > 15 * 1024 * 1024 * 1.37) { // ~15MB in base64
            return res.status(413).json({ error: 'File too large. Maximum 15MB.' });
        }

        console.log(`AI analysis requested by ${req.user.email} for: ${fileName}`);

        const result = await analyzeBidDocumentServer(fileName, fileContentBase64);
        res.json(result);
    } catch (err) {
        console.error('Server-side AI analysis error:', err);
        res.status(500).json({ error: err.message || 'AI analysis failed on server' });
    }
});

// =============================================================================
// Authentication & User Management Routes
// =============================================================================

app.use('/api/auth', checkDbConnection, authRoutes);
app.use('/api/users', checkDbConnection, userRoutes);
app.use('/api/roles', checkDbConnection, rolesRoutes);

// =============================================================================
// Bids Routes
// =============================================================================

app.get('/api/bids', checkDbConnection, async (req, res) => {
    try {
        const bids = await Bid.find().sort({ createdAt: -1 });
        res.json(bids);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validation Middleware
const validateBid = [
    body('customerName').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 200 }).escape(),
    body('projectName').trim().notEmpty().withMessage('Project name is required').isLength({ max: 300 }).escape(),
    body('deadline').optional().isISO8601().toDate().withMessage('Invalid deadline date'),
    body('estimatedValue').optional().isNumeric().withMessage('Estimated value must be a number'),
    body('status').optional().isIn(['Active', 'Submitted', 'Won', 'Lost', 'No Bid']).withMessage('Invalid status'),
    body('currency').optional().isIn(['PKR', 'USD', 'EUR']).withMessage('Invalid currency'),
];

app.post('/api/bids', checkDbConnection, validateBid, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const bid = new Bid(req.body);
        await bid.save();
        res.status(201).json(bid);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/bids/:id', checkDbConnection, async (req, res) => {
    try {
        const bid = await Bid.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!bid) return res.status(404).json({ error: 'Bid not found' });
        res.json(bid);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/bids/:id', checkDbConnection, async (req, res) => {
    try {
        const bid = await Bid.findOneAndDelete({ id: req.params.id });
        if (!bid) return res.status(404).json({ error: 'Bid not found' });
        res.json({ message: 'Bid permanently deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// Vault Assets Routes
// =============================================================================

app.get('/api/vault', checkDbConnection, async (req, res) => {
    try {
        const assets = await VaultAsset.find().sort({ createdAt: -1 });
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vault', checkDbConnection, async (req, res) => {
    try {
        const asset = new VaultAsset(req.body);
        await asset.save();
        res.status(201).json(asset);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/vault/:id', checkDbConnection, async (req, res) => {
    try {
        const asset = await VaultAsset.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/vault/:id', checkDbConnection, async (req, res) => {
    try {
        const asset = await VaultAsset.findOneAndDelete({ id: req.params.id });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json({ message: 'Asset deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// Audit Logs Routes
// =============================================================================

app.get('/api/audit', checkDbConnection, async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).lean();

        // Fetch all roles to create a lookup map
        const roles = await Role.find({});
        const roleMap = roles.reduce((acc, role) => {
            acc[role.id] = role.name;
            return acc;
        }, {});

        // Enrich logs with role names
        const enrichedLogs = logs.map(log => ({
            ...log,
            userRoleName: roleMap[log.userRole] || log.userRole
        }));

        res.json(enrichedLogs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/audit', checkDbConnection, async (req, res) => {
    try {
        const log = new AuditLog(req.body);
        await log.save();
        res.status(201).json(log);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// =============================================================================
// Static Files & Catch-all
// =============================================================================

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// All other requests serve the React app
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
