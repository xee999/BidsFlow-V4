
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

async function checkBids() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Bid = mongoose.models.Bid || mongoose.model('Bid', new mongoose.Schema({ id: String, status: String, projectName: String }));
        const activeBids = await Bid.find({ status: 'Active' }, { id: 1, projectName: 1 }).lean();
        console.log(`Total Active Bids in Production: ${activeBids.length}`);
        activeBids.forEach(b => console.log(` - [${b.id}] ${b.projectName}`));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
checkBids();
