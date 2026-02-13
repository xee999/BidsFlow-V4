import mongoose from 'mongoose';

const NoBidReasonSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
}, { timestamps: true });

export const NoBidReason = mongoose.model('NoBidReason', NoBidReasonSchema);
