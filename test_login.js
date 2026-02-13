
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function test() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'admin@bidsflow.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            hasPassword: !!user.password
        });

        // We don't know the password, but we can check if it hashes correctly or try a known one if we find it in env
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (adminPassword) {
            const isMatch = await user.comparePassword(adminPassword);
            console.log(`Password match with ADMIN_PASSWORD: ${isMatch}`);
        } else {
            console.log('ADMIN_PASSWORD not set in .env');
        }

        const allUsers = await User.find({}, 'email role isActive');
        console.log('All users:', allUsers);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
