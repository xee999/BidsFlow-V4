import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    subText: { type: String, required: true },
    timestamp: { type: String, required: true },
    modality: { type: String, required: true },
}, { timestamps: true });

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
