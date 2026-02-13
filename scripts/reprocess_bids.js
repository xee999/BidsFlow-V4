
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.staging', override: true });
import { Bid } from './models/Bid.js';
import { analyzeBidDocumentServer } from './middleware/ai.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function reprocessBids() {
    console.log('Starting automated AI re-extraction for 20 bids...');
    try {
        console.log('Using URI:', MONGODB_URI ? MONGODB_URI.substring(0, 20) + '...' : 'UNDEFINED');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
        console.log('Connected to MongoDB');

        // 1. Identify the 20 target bids (fetch only IDs first to save memory)
        const targetIds = await Bid.find({
            projectName: { $exists: true, $ne: "" },
            "technicalDocuments.0": { $exists: true },
            $or: [
                { summaryRequirements: { $exists: false } },
                { summaryRequirements: null },
                { summaryRequirements: "" },
                { summaryRequirements: "No summary." },
                { summaryRequirements: "No project summary extracted." },
                { summaryRequirements: "Extraction in progress..." }
            ]
        }).select('id').lean();

        console.log(`Found ${targetIds.length} bids to reprocess.`);

        const results = {
            success: [],
            failed: []
        };

        for (const target of targetIds) {
            // Fetch full record for this specific bid
            const bid = await Bid.findOne({ id: target.id });
            if (!bid) continue;
            console.log(`\n--- Processing Bid: ${bid.projectName} [${bid.id}] ---`);
            
            try {
                // Find the first PDF in technicalDocuments
                const doc = bid.technicalDocuments.find(d => 
                    (d.name?.toLowerCase().endsWith('.pdf')) || 
                    (d.fileName?.toLowerCase().endsWith('.pdf')) ||
                    (d.type?.toLowerCase().includes('pdf')) ||
                    (d.fileData && d.fileData.startsWith('JVBERi')) // PDF header
                );

                if (!doc || !doc.fileData) {
                    throw new Error('No PDF data found in technicalDocuments');
                }

                const docName = doc.name || doc.fileName || 'document.pdf';
                console.log(`Extracting info from: ${docName}...`);
                
                // Clean base64 data (remove prefix if exists)
                let cleanData = doc.fileData;
                if (cleanData.includes(';base64,')) {
                    cleanData = cleanData.split(';base64,')[1];
                }
                
                // 2. Call AI Analysis
                const aiResult = await analyzeBidDocumentServer(docName, cleanData);
                
                if (!aiResult) {
                    throw new Error('AI returned empty result');
                }

                // 3. Prepare Updates
                const updates = {
                    summaryRequirements: aiResult.summaryRequirements,
                    scopeOfWork: aiResult.scopeOfWork,
                    complexity: aiResult.complexity,
                    estimatedValue: aiResult.estimatedValue || bid.estimatedValue,
                    currency: aiResult.currency || bid.currency,
                    deadline: aiResult.deadline || bid.deadline,
                    requiredSolutions: aiResult.requiredSolutions || bid.requiredSolutions,
                    aiQualificationSummary: aiResult.aiQualificationSummary,
                    publishDate: aiResult.publishDate,
                    preBidMeeting: aiResult.preBidMeeting,
                    deliverablesSummary: aiResult.deliverablesSummary,
                    technicalQualificationChecklist: aiResult.technicalQualificationChecklist,
                    complianceChecklist: aiResult.complianceList, // Mapping name change in AI output
                    financialFormats: aiResult.financialFormats,
                    jbcName: "System", // As requested
                    currentStage: "Intake", // Reset to intake since we just got info
                };

                // 4. Update ID logic
                let newId = bid.id;
                if (newId.startsWith('bid-')) {
                    newId = newId.replace('bid-', '');
                    console.log(`Renaming ID from ${bid.id} to ${newId}`);
                }

                // If ID changed, we need to handle uniqueness. 
                // Since 'id' is our primary key in the app logic, we update it.
                updates.id = newId;

                // 5. Update Database
                await Bid.findOneAndUpdate({ _id: bid._id }, { $set: updates });
                
                console.log(`✅ Successfully updated: ${newId}`);
                results.success.push(newId);

                // Wait 2 seconds between bids to respect AI rate limits
                console.log('Cooldown for 2s...');
                await new Promise(r => setTimeout(r, 2000));

            } catch (err) {
                console.error(`❌ Failed to process ${bid.id}:`, err.message);
                results.failed.push({ id: bid.id, error: err.message });
            }
        }

        console.log('\n=======================================');
        console.log('REPROCESSING COMPLETE');
        console.log(`Successes: ${results.success.length}`);
        console.log(`Failures: ${results.failed.length}`);
        console.log('=======================================');

        if (results.failed.length > 0) {
            console.log('Failed IDs:', results.failed);
        }

        process.exit(0);
    } catch (err) {
        console.error('Reprocessing failed:', err);
        process.exit(1);
    }
}

reprocessBids();
