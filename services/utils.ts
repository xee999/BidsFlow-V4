import { BidRecord, BidStage } from '../types';

/**
 * Utility functions for BidsFlow
 */

/**
 * Converts a duration string (e.g., "2.5 years", "24 months", "30 days") into a numeric number of days.
 * Returns the original string if it's already a number or if parsing fails.
 */
export const convertToDays = (durationStr: string): string => {
    if (!durationStr) return '';

    const trimmed = durationStr.toLowerCase().trim();

    // If it's already just a number, assume it's days (for backward compatibility or explicit entry)
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return trimmed;
    }

    // Handle patterns like "2.5 years", "2 years", "1 year"
    const yearMatch = trimmed.match(/^(\d+(\.\d+)?)\s*y(ear)?s?$/);
    if (yearMatch) {
        const years = parseFloat(yearMatch[1]);
        return Math.round(years * 365).toString();
    }

    // Handle patterns like "24 months", "12 months", "1 month"
    const monthMatch = trimmed.match(/^(\d+(\.\d+)?)\s*m(onth)?s?$/);
    if (monthMatch) {
        const months = parseFloat(monthMatch[1]);
        return Math.round(months * 30.4368).toString();
    }

    // Handle patterns like "2 weeks", "1 week"
    const weekMatch = trimmed.match(/^(\d+(\.\d+)?)\s*w(eek)?s?$/);
    if (weekMatch) {
        const weeks = parseFloat(weekMatch[1]);
        return Math.round(weeks * 7).toString();
    }

    // Handle patterns like "30 days", "1 day"
    const dayMatch = trimmed.match(/^(\d+(\.\d+)?)\s*d(ay)?s?$/);
    if (dayMatch) {
        return dayMatch[1];
    }

    return durationStr;
};

/**
 * Converts a duration string (e.g., "2.5 years", "24 months", "730 days") into a numeric number of years.
 * Returns the original string if parsing fails.
 */
export const convertToYears = (durationStr: string): string => {
    if (!durationStr) return '';

    const trimmed = durationStr.toLowerCase().trim();

    // Handle patterns like "2.5 years", "2 years", "1 year"
    const yearMatch = trimmed.match(/^(\d+(\.\d+)?)\s*y(ear)?s?$/);
    if (yearMatch) {
        return yearMatch[1];
    }

    // Handle patterns like "24 months", "12 months", "1 month"
    const monthMatch = trimmed.match(/^(\d+(\.\d+)?)\s*m(onth)?s?$/);
    if (monthMatch) {
        const months = parseFloat(monthMatch[1]);
        const years = months / 12;
        return (Math.round(years * 10) / 10).toString(); // Round to 1 decimal place
    }

    // Handle patterns like "730 days", "365 days"
    const dayMatch = trimmed.match(/^(\d+(\.\d+)?)\s*d(ay)?s?$/);
    if (dayMatch) {
        const days = parseFloat(dayMatch[1]);
        const years = days / 365;
        return (Math.round(years * 10) / 10).toString();
    }

    // If it's already just a number, assume it's years (or if it's very large, treat as days?)
    // But per user request, new RFP fields should show years. 
    // If the input is "2.5", it's likely years in the new context.
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const val = parseFloat(trimmed);
        if (val > 100) { // Likely days
            const years = val / 365;
            return (Math.round(years * 10) / 10).toString();
        }
        return trimmed;
    }

    return durationStr;
};

/**
 * Sanitizes an AI-extracted date string to ensure it's in YYYY-MM-DD format 
 * for HTML5 date inputs, or returns an empty string if invalid.
 */
export const sanitizeDateValue = (dateStr: string | null | undefined): string => {
    if (!dateStr || dateStr.toUpperCase() === 'N/A' || dateStr.toLowerCase() === 'null' || dateStr.toUpperCase() === 'TBD') {
        return '';
    }

    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Handle ISO strings (e.g. 2026-02-05T00:00:00Z) by string splitting to avoid timezone shift
    // This assumes the intention of "2026-02-05..." is always 5th Feb regardless of 'T' or 'Z'
    if (dateStr.includes('T') && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return dateStr.split('T')[0];
    }

    // Try to parse natural language (e.g. "Oct 05, 2026")
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    // Use local time components to avoid UTC shift for natural language inputs
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

/**
 * Sanitizes an AI-extracted time string to ensure it's in HH:mm format 
 * for HTML5 time inputs, or returns an empty string if invalid.
 */
export const sanitizeTimeValue = (timeStr: string | null | undefined): string => {
    if (!timeStr || timeStr.toUpperCase() === 'N/A' || timeStr.toLowerCase() === 'null' || timeStr.toUpperCase() === 'TBD') {
        return '';
    }

    // Check if it's already HH:mm or HH:mm:ss
    if (/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(timeStr)) {
        return timeStr.substring(0, 5);
    }

    // Handle "10:00 AM" format
    const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = ampmMatch[2];
        const ampm = ampmMatch[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    return '';
};

/**
 * Calculates the integrity score of a bid based on its checklists and status.
 */
export const calculateIntegrity = (bid: BidRecord) => {
    const weights = bid.integrityScoreBreakdown || { technicalWeight: 30, complianceWeight: 30, commercialWeight: 30, legalWeight: 10 };
    const techItems = bid.technicalQualificationChecklist || [];
    const compItems = bid.complianceChecklist || [];
    const finItems = bid.financialFormats || [];
    const techScore = techItems.length > 0 ? (techItems.filter(i => i.status === 'Complete').length / techItems.length) * weights.technicalWeight : 0;
    const compScore = compItems.length > 0 ? (compItems.filter(i => i.status === 'Complete').length / compItems.length) * weights.complianceWeight : 0;
    const commScore = finItems.length > 0 ? (finItems.filter(i => (i.unitPrice ?? 0) > 0).length / finItems.length) * weights.commercialWeight : 0;
    const legalScore = (bid.managementApprovalStatus === 'Approved' ? 1 : 0) * weights.legalWeight;

    const checklistScore = Math.round(techScore + compScore + commScore + legalScore);

    // Stage Baseline Logic to ensure minimum progress per stage
    const stageBaselines: Record<string, number> = {
        [BidStage.INTAKE]: 5,
        [BidStage.QUALIFICATION]: 20,
        [BidStage.SOLUTIONING]: 40,
        [BidStage.PRICING]: 60,
        [BidStage.COMPLIANCE]: 80,
        [BidStage.FINAL_REVIEW]: 90
    };

    const baseline = stageBaselines[bid.currentStage] || 0;

    // Return the higher of the two to show progress even if checklists are empty
    return Math.max(baseline, checklistScore);
};

/**
 * Returns a color code based on the integrity score.
 * Uses a subtle/pastel palette for better aesthetics.
 */
export const getIntegrityColor = (score: number): string => {
    if (score >= 90) return '#86EFAC'; // Green-300 (Subtle)
    if (score >= 60) return '#FCD34D'; // Amber-300 (Subtle)
    if (score >= 30) return '#FDBA74'; // Orange-300 (Subtle)
    return '#FCA5A5'; // Red-300 (Subtle)
};
