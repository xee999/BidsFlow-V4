import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    date: { type: String, required: true }, // ISO date string YYYY-MM-DD
    type: { type: String, enum: ['event', 'reminder', 'note'], default: 'event' },
    color: { type: String, required: true },
    description: { type: String },
    mentionedUserIds: [String],
    taggedBidIds: [String],
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now }
});

export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
