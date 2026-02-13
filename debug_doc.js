
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Bid } from './models/Bid.js';

dotenv.config({ path: '.env.staging' });

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    const b = await Bid.findOne({ id: "bid-82017" }).select("technicalDocuments").lean();
    if (b && b.technicalDocuments) {
        console.log('Docs found:', b.technicalDocuments.length);
        b.technicalDocuments.forEach((d, i) => {
            console.log(`Doc ${i}:`, {
                name: d.name,
                fileName: d.fileName,
                type: d.type,
                hasData: !!d.fileData,
                dataLength: d.fileData ? d.fileData.length : 0
            });
        });
    } else {
        console.log('Bid not found or no docs');
    }
    process.exit(0);
}
debug();
