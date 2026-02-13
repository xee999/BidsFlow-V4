import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
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
import { CalendarEvent } from './models/CalendarEvent.js';
import { NoBidReason } from './models/NoBidReason.js';
import { analyzeBidDocumentServer } from './middleware/ai.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import rolesRoutes from './routes/roles.js';
import { Role, seedBuiltInRoles } from './models/Role.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// Trust Proxy for Cloud Run / Load Balancer (required for rate limiting to see real IP)
app.set('trust proxy', 1);

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
            upgradeInsecureRequests: null,
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
        // Seed default no-bid reasons
        await seedDefaultNoBidReasons();
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

async function seedDefaultNoBidReasons() {
  try {
    const defaultReasons = [
      { id: 'nbr-time-limitation', label: 'Time Limitation', isDefault: true },
      { id: 'nbr-product-limitation', label: 'Product Limitation', isDefault: true },
      { id: 'nbr-low-moq', label: 'Low MOQ', isDefault: true },
      { id: 'nbr-no-response-team', label: 'No Response from Team', isDefault: true },
      { id: 'nbr-no-preferred-price', label: 'No Preferred Price', isDefault: true },
      { id: 'nbr-out-of-scope', label: 'Out of Scope', isDefault: true }
    ];

    for (const reason of defaultReasons) {
      await NoBidReason.updateOne({ id: reason.id }, { $set: reason }, { upsert: true });
    }
    console.log('✓ Default No-Bid Reasons seeded');
  } catch (err) {
    console.error('Error seeding no-bid reasons:', err);
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
// NOTE: The GET /api/bids endpoint returns metadata only (names and details)
// but excludes actual document fields to avoid Cloud Run's 32MB response limit.
// Use GET /api/bids/:id to fetch the full bid including all documents.

app.get('/api/bids', checkDbConnection, async (req, res) => {
    try {
        console.log('[/api/bids] Fetching bid metadata summaries...');

        const bids = await Bid.find()
            .select('-technicalDocuments -vendorQuotations -financialFormats -proposalSections -technicalQualificationChecklist -complianceChecklist -deliverablesSummary -notes -strategicRiskAssessment -finalRiskAssessment -solutioningAIAnalysis')
            .sort({ createdAt: -1 })
            .maxTimeMS(5000)
            .lean();

        console.log('[/api/bids] Found', bids.length, 'bids');
        res.json(bids);
    } catch (err) {
        console.error('[/api/bids] Error fetching bids:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Fetch full bid details including documents for a specific bid
app.get('/api/bids/:id', checkDbConnection, async (req, res) => {
    try {
        console.log(`[/api/bids/${req.params.id}] Fetching full bid details...`);
        const bid = await Bid.findOne({ id: req.params.id }).lean();

        if (!bid) {
            return res.status(404).json({ error: 'Bid not found' });
        }

        res.json(bid);
    } catch (err) {
        console.error(`[/api/bids/${req.params.id}] Error fetching bid details:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Validation Middleware
const validateBid = [
    body('customerName').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 200 }),
    body('projectName').trim().notEmpty().withMessage('Project name is required').isLength({ max: 300 }),
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
        console.error('Error creating bid:', err);
        res.status(400).json({ error: err.message });
    }
});

// Helper for Levenshtein Distance
const levenshteinDistance = (a, b) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

app.post('/api/bids/check-duplicate', checkDbConnection, async (req, res) => {
    try {
        const { customerName, projectName } = req.body;

        if (!customerName || !projectName) {
            return res.status(400).json({ error: 'Customer Name and Project Name are required' });
        }

        // 1. Find matched customers (case-insensitive)
        const candidates = await Bid.find({
            customerName: { $regex: new RegExp(`^${customerName}$`, 'i') }
        }).select('id customerName projectName status').lean();

        if (candidates.length === 0) {
            return res.json({ isDuplicate: false, candidates: [] });
        }

        // 2. Fuzzy Match Project Name
        const duplicates = candidates.map(bid => {
            const distance = levenshteinDistance(projectName.toLowerCase(), bid.projectName.toLowerCase());
            const maxLength = Math.max(projectName.length, bid.projectName.length);
            const similarity = 1 - (distance / maxLength);

            return { ...bid, similarity };
        }).filter(bid => bid.similarity > 0.7); // Threshold: 70% match

        res.json({
            isDuplicate: duplicates.length > 0,
            candidates: duplicates.sort((a, b) => b.similarity - a.similarity)
        });

    } catch (err) {
        console.error('Error checking duplicates:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bids/:id', checkDbConnection, async (req, res) => {
    try {
        const oldId = req.params.id.trim();
        const newId = req.body.id;

        // Check if ID is being changed and if new ID already exists
        if (newId && newId !== oldId) {
            const existingBid = await Bid.findOne({ id: newId });
            if (existingBid) {
                return res.status(409).json({ error: `Bid ID ${newId} already exists` });
            }
        }

        const bid = await Bid.findOneAndUpdate({ id: oldId }, req.body, { new: true });
        if (!bid) return res.status(404).json({ error: 'Bid not found' });

        const updatePromises = [];

        // If ID was changed, update references in other collections
        if (newId && newId !== oldId) {
            console.log(`[ID CHANGE] Queueing reference updates from ${oldId} to ${newId}`);
            updatePromises.push(
                CalendarEvent.updateMany(
                    { taggedBidIds: oldId },
                    { $set: { "taggedBidIds.$[elem]": newId } },
                    { arrayFilters: [{ "elem": oldId }] }
                ).catch(err => console.warn('Calendar ID update failed:', err.message)),
                AuditLog.updateMany({ bidId: oldId }, { $set: { bidId: newId } })
                    .catch(err => console.warn('AuditLog ID update failed:', err.message))
            );
        }

        // If deadline or projectName changed, update associated deadline calendar events
        if (req.body.deadline || req.body.projectName) {
            const updatedBidId = newId || oldId;
            const calendarUpdateData = {};
            if (req.body.deadline) calendarUpdateData.date = req.body.deadline.split('T')[0];
            if (req.body.projectName) {
                calendarUpdateData.title = `Deadline: ${req.body.projectName}`;
                calendarUpdateData.description = `Submission deadline for ${req.body.projectName} for ${req.body.customerName || 'customer'}`;
            }

            if (Object.keys(calendarUpdateData).length > 0) {
                updatePromises.push(
                    CalendarEvent.updateMany(
                        { 
                            taggedBidIds: updatedBidId,
                            id: { $regex: /^cal-deadline-/ }
                        },
                        { $set: calendarUpdateData }
                    ).catch(err => console.warn('Calendar sync failed:', err.message))
                );
            }
        }

        // Execute all side-effect updates in background
        if (updatePromises.length > 0) {
            Promise.all(updatePromises).then(() => {
                console.log(`[SYNC] Completed all secondary updates for bid ${newId || oldId}`);
            });
        }

        res.json(bid);
    } catch (err) {
        console.error('Error updating bid:', err);
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Duplicate key error: Bid ID must be unique' });
        }
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/bids/:id', checkDbConnection, async (req, res) => {
    try {
        const bidId = req.params.id.trim();
        const bid = await Bid.findOneAndDelete({ id: bidId });
        if (!bid) return res.status(404).json({ error: 'Bid not found' });

        // Cascading Deletion: Remove associated calendar events
        try {
            const deleteResult = await CalendarEvent.deleteMany({ taggedBidIds: bidId });
            console.log(`[CASCADE DELETE] Removed ${deleteResult.deletedCount} calendar events associated with bid ${bidId}`);
        } catch (cascadeErr) {
            console.warn(`[CASCADE DELETE ERROR] Failed to remove calendar events for bid ${bidId}:`, cascadeErr.message);
            // We don't fail the whole request because the bid is already gone
        }

        res.json({ message: 'Bid permanently deleted and associated events cleaned up' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =============================================================================
// Vault Assets Routes
// =============================================================================

app.get('/api/vault', checkDbConnection, async (req, res) => {
    try {
        // Exclude large fileData to stay under 32MB list limit
        const assets = await VaultAsset.find().select('-fileData').sort({ createdAt: -1 }).lean();
        res.json(assets);
    } catch (err) {
        console.error('Error fetching vault assets:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/vault/:id', checkDbConnection, async (req, res) => {
    try {
        const asset = await VaultAsset.findOne({ id: req.params.id }).lean();
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (err) {
        console.error('Error fetching vault asset details:', err);
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
        console.error('Error fetching audit logs:', err);
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
// No-Bid Reasons Routes
// =============================================================================

app.get('/api/no-bid-reasons', checkDbConnection, async (req, res) => {
    try {
        const reasons = await NoBidReason.find().sort({ createdAt: 1 }).lean();
        res.json(reasons);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/no-bid-reasons', checkDbConnection, async (req, res) => {
    try {
        const { label } = req.body;
        if (!label) return res.status(400).json({ error: 'Label is required' });
        
        const id = `nbr-${crypto.randomUUID()}`;
        const newReason = new NoBidReason({ id, label });
        await newReason.save();
        res.status(201).json(newReason);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// =============================================================================
// Calendar Events Routes
// =============================================================================

app.get('/api/calendar-events', checkDbConnection, async (req, res) => {
    try {
        const events = await CalendarEvent.find().sort({ date: 1 }).lean();
        res.json(events);
    } catch (err) {
        console.error('Error fetching calendar events:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/calendar-events', checkDbConnection, async (req, res) => {
    try {
        const event = new CalendarEvent(req.body);
        await event.save();
        res.status(201).json(event);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/calendar-events/:id', checkDbConnection, async (req, res) => {
    try {
        const event = await CalendarEvent.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/calendar-events/:id', checkDbConnection, async (req, res) => {
    try {
        const event = await CalendarEvent.findOneAndDelete({ id: req.params.id });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json({ message: 'Event deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
