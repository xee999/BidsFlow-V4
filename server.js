import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

// MongoDB Connection Logic
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('Connected to MongoDB at', MONGODB_URI))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('MONGODB_URI not provided. Skipping DB connection.');
}

app.use(express.json());

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes placeholder
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// All other requests serve the React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
