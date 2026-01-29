import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:secretpassword@localhost:27017/bidsflow?authSource=admin';

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['SUPER_ADMIN', 'BID_TEAM', 'VIEWER'], default: 'VIEWER' },
    isActive: { type: Boolean, default: true },
    avatar: { type: String },
    avatarType: { type: String, enum: ['icon', 'image'] },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

async function reactivateUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.model('User', UserSchema);

        // Reactivate admin
        const adminResult = await User.updateOne(
            { email: 'admin@bidsflow.com' },
            { $set: { isActive: true } }
        );
        console.log('Admin reactivation result:', adminResult);

        // Check if hamza exists
        let hamza = await User.findOne({ email: 'hamza@bidsflow.com' });
        if (!hamza) {
            // Create hamza user
            const hashedPassword = await bcrypt.hash('Bids@4ever', 10);
            hamza = new User({
                id: `user-hamza-${Date.now()}`,
                email: 'hamza@bidsflow.com',
                password: hashedPassword,
                name: 'Bids Management User',
                role: 'SUPER_ADMIN',
                isActive: true
            });
            await hamza.save();
            console.log('Created hamza user');
        } else {
            await User.updateOne(
                { email: 'hamza@bidsflow.com' },
                { $set: { isActive: true } }
            );
            console.log('Reactivated hamza user');
        }

        // List all users
        const allUsers = await User.find({}, '-password');
        console.log('\nAll users:');
        allUsers.forEach(u => console.log(`- ${u.email} (${u.role}) - Active: ${u.isActive}`));

        await mongoose.disconnect();
        console.log('\nDone!');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

reactivateUsers();
