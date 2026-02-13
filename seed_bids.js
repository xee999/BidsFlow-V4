import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Bid } from './models/Bid.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const JBC_NAMES = ['Hamza', 'Zeeshan', 'Sarah', 'Ahmed', 'Ayesha', 'Bilal'];
const REGIONS = ['North', 'South', 'Central'];
const CHANNELS = ['B2G', 'Enterprise'];
const SOLUTIONS = ['Cloud', 'Security', 'Infrastructure', 'Software Development', 'Managed Services', 'IoT', 'Connectivity', 'ERP', 'CRM', 'Hardware', 'Professional Services'];
const CUSTOMERS = ['Jazz', 'Government of Pakistan', 'State Bank', 'Telenor', 'Ministry of IT', 'K-Electric', 'Lucky Cement', 'Engro', 'Fauji Fertilizer', 'Standard Chartered'];
const STATUSES = ['Active', 'Submitted', 'Won', 'Lost', 'No Bid'];
const STAGES = ['Intake', 'Qualification', 'Solutioning', 'Pricing', 'Compliance', 'Final Review'];
const COMPLEXITIES = ['Low', 'Medium', 'High'];

async function seed() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI not found in environment');
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Optional: clear existing bids? No, user just wants to add.
        // await Bid.deleteMany({}); 

        const bids = [];
        const now = new Date();

        for (let i = 0; i < 30; i++) {
            const receivedDate = new Date();
            receivedDate.setDate(now.getDate() - Math.floor(Math.random() * 90)); // Randomized in last 3 months
            
            const deadline = new Date(receivedDate);
            deadline.setDate(deadline.getDate() + 15 + Math.floor(Math.random() * 30)); // 15-45 days later
            
            const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
            let submissionDate = null;
            if (['Submitted', 'Won', 'Lost'].includes(status)) {
                submissionDate = new Date(deadline);
                submissionDate.setDate(deadline.getDate() - Math.floor(Math.random() * 5));
            }

            const currentStage = status === 'Active' ? STAGES[Math.floor(Math.random() * STAGES.length)] : STAGES[STAGES.length - 1];
            
            const bid = {
                id: `82${Math.floor(100 + Math.random() * 900)}`,
                customerName: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
                projectName: `Project ${SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)]} ${i + 1}`,
                deadline: deadline.toISOString().split('T')[0],
                receivedDate: receivedDate.toISOString().split('T')[0],
                publishDate: new Date(receivedDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: status,
                currentStage: currentStage,
                riskLevel: COMPLEXITIES[Math.floor(Math.random() * COMPLEXITIES.length)],
                estimatedValue: Math.floor(500000 + Math.random() * 5000000),
                currency: 'PKR',
                requiredSolutions: [SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)], SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)]],
                jbcName: JBC_NAMES[Math.floor(Math.random() * JBC_NAMES.length)],
                region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
                channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
                complexity: COMPLEXITIES[Math.floor(Math.random() * COMPLEXITIES.length)],
                submissionDate: submissionDate ? submissionDate.toISOString().split('T')[0] : null,
                aiQualificationScore: Math.floor(60 + Math.random() * 35),
                aiConfidenceScore: Math.floor(70 + Math.random() * 25),
                aiQualificationAssessment: Math.random() > 0.3 ? 'Go' : 'No-Go',
                noBidReason: status === 'No Bid' ? 'Time Limitation' : null,
                noBidReasonCategory: status === 'No Bid' ? 'Resource Limitation' : null,
                noBidStage: status === 'No Bid' ? STAGES[Math.floor(Math.random() * 3)] : null,
            };

            // Generate some stage history
            const stageHistory = [];
            let currentTimestamp = new Date(receivedDate);
            for (let j = 0; j <= STAGES.indexOf(currentStage); j++) {
                stageHistory.push({
                    stage: STAGES[j],
                    timestamp: currentTimestamp.toISOString(),
                    user: 'System Seed'
                });
                currentTimestamp = new Date(currentTimestamp.getTime() + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000);
            }
            bid.stageHistory = stageHistory;

            bids.push(bid);
        }

        await Bid.insertMany(bids);
        console.log(`Successfully seeded ${bids.length} bids`);

        mongoose.connection.close();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();
