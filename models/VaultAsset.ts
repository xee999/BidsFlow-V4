import mongoose from 'mongoose';

const VaultAssetSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    uploadDate: { type: String, required: true },
    aiScore: Number,
    aiMatchDetails: String,
    vendorName: String,
    validity: String,
    currency: String,
    paymentTerms: String,
    tags: [String],
    summary: String,
    winRate: String,
    fileData: String,
    fileSize: String,
    timesUsed: Number,
    lastModified: String,
}, { timestamps: true });

export const VaultAsset = mongoose.model('VaultAsset', VaultAssetSchema);
