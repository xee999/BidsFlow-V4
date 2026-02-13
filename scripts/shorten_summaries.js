
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Bid } from '../models/Bid.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ path: '.env.production' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.API_KEY);

async function shortenSummary(text) {
    if (!text || text.split(/\s+/).length <= 70) return text;
    
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Shorten the following strategic brief for a bid to be between 50 and 70 words. Keep it professional and preserve key details like eligibility, bid security, and technical requirements.
        
        TEXT:
        ${text}
        
        SHORTENED TEXT:`;
        
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (e) {
        console.error('AI Shortening failed:', e.message);
        return text;
    }
}

async function run() {
    try {
        console.log('Connecting to production DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        const bids = await Bid.find({});
        console.log(`Checking ${bids.length} bids...`);
        
        let updatedCount = 0;
        for (const bid of bids) {
            const wordCount = bid.summaryRequirements ? bid.summaryRequirements.split(/\s+/).filter(Boolean).length : 0;
            if (wordCount > 75) {
                console.log(`Shortening brief for [${bid.id}] ${bid.projectName} (${wordCount} words)...`);
                const newSummary = await shortenSummary(bid.summaryRequirements);
                const newWordCount = newSummary.split(/\s+/).filter(Boolean).length;
                
                await Bid.updateOne({ _id: bid._id }, { $set: { summaryRequirements: newSummary } });
                console.log(`✅ Updated to ${newWordCount} words.`);
                updatedCount++;
            }
        }
        
        console.log(`Done! Updated ${updatedCount} bids.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
