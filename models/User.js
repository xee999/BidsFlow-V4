import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: {
        type: String,
        required: true,
        default: 'VIEWER'
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    avatar: { type: String }, // Base64 image data
    avatarType: { type: String, enum: ['icon', 'image'], default: 'image' },
}, { timestamps: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Index for quick lookups
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const User = mongoose.model('User', UserSchema);
