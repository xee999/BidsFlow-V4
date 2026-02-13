import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

const BidSchema = new mongoose.Schema({
    customerName: String,
    projectName: String,
}, { strict: false });

const Bid = mongoose.model('Bid', BidSchema);

async function cleanup() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const bids = await Bid.find({
            $or: [
                { customerName: /&amp;/ },
                { projectName: /&amp;/ }
            ]
        });

        console.log(`Found ${bids.length} bids with escaped ampersands.`);

        for (const bid of bids) {
            let updated = false;
            if (bid.customerName && bid.customerName.includes('&amp;')) {
                console.log(`Fixing customerName: "${bid.customerName}"`);
                bid.customerName = bid.customerName.replace(/&amp;/g, '&');
                updated = true;
            }
            if (bid.projectName && bid.projectName.includes('&amp;')) {
                console.log(`Fixing projectName: "${bid.projectName}"`);
                bid.projectName = bid.projectName.replace(/&amp;/g, '&');
                updated = true;
            }

            if (updated) {
                await bid.save();
                console.log(`Updated bid: ${bid._id}`);
            }
        }

        console.log('Cleanup complete.');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanup();
