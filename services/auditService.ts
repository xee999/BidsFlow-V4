import { ActivityLog, AuditChangeType, UserRole } from '../types';

// Generate unique ID for activity logs
const generateId = (): string => {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Format timestamp
// Format timestamp
const formatTimestamp = (): string => {
    return new Date().toISOString();
};

// Get modality based on change type
const getModality = (changeType: AuditChangeType): ActivityLog['modality'] => {
    switch (changeType) {
        case 'stage_change':
            return 'zap';
        case 'document_upload':
            return 'sparkles';
        case 'approval':
            return 'check';
        case 'status_change':
            return 'alert';
        case 'user_action':
            return 'check';
        case 'edit':
            return 'sparkles';
        default:
            return 'check';
    }
};

export interface AuditLogParams {
    userName: string;
    userRole: UserRole;
    action: string;
    target: string;
    subText: string;
    changeType: AuditChangeType;
    bidId?: string;
    projectName?: string;
    previousValue?: string;
    newValue?: string;
}

// Create activity log entry
export const createAuditLog = (params: AuditLogParams): ActivityLog => {
    return {
        id: generateId(),
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        target: params.target,
        subText: params.subText,
        timestamp: formatTimestamp(),
        modality: getModality(params.changeType),
        bidId: params.bidId,
        projectName: params.projectName,
        changeType: params.changeType,
        previousValue: params.previousValue,
        newValue: params.newValue,
    };
};

// Pre-defined log creators for common actions
export const auditActions = {
    // Bid lifecycle events
    bidCreated: (userName: string, userRole: UserRole, projectName: string, bidId: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Created Bid',
            target: projectName,
            subText: `New bid opportunity created`,
            changeType: 'edit',
            bidId,
            projectName,
        }),

    stageChanged: (userName: string, userRole: UserRole, projectName: string, bidId: string, fromStage: string, toStage: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Stage Change',
            target: projectName,
            subText: `Moved to ${toStage}`,
            changeType: 'stage_change',
            bidId,
            projectName,
            previousValue: fromStage,
            newValue: toStage,
        }),

    statusChanged: (userName: string, userRole: UserRole, projectName: string, bidId: string, fromStatus: string, toStatus: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Status Update',
            target: projectName,
            subText: `Bid status changed`,
            changeType: 'status_change',
            bidId,
            projectName,
            previousValue: fromStatus,
            newValue: toStatus,
        }),

    // Document events
    documentUploaded: (userName: string, userRole: UserRole, projectName: string, bidId: string, docName: string, docType: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Upload',
            target: docName,
            subText: `${docType} document uploaded to ${projectName}`,
            changeType: 'document_upload',
            bidId,
            projectName,
        }),

    rfpUploaded: (userName: string, userRole: UserRole, projectName: string, bidId: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'RFP Upload',
            target: projectName,
            subText: `Tender document uploaded for analysis`,
            changeType: 'document_upload',
            bidId,
            projectName,
        }),

    // Approval events
    approvalSubmitted: (userName: string, userRole: UserRole, projectName: string, bidId: string, approvalType: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Submitted',
            target: projectName,
            subText: `${approvalType} submitted for approval`,
            changeType: 'approval',
            bidId,
            projectName,
        }),

    approvalGranted: (userName: string, userRole: UserRole, projectName: string, bidId: string, approvalType: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Approved',
            target: projectName,
            subText: `${approvalType} approved`,
            changeType: 'approval',
            bidId,
            projectName,
        }),

    // User events
    userLogin: (userName: string, userRole: UserRole): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Login',
            target: 'System',
            subText: `User logged into BidsFlow`,
            changeType: 'user_action',
        }),

    userCreated: (adminName: string, adminRole: UserRole, newUserName: string, newUserRole: string): ActivityLog =>
        createAuditLog({
            userName: adminName,
            userRole: adminRole,
            action: 'User Created',
            target: newUserName,
            subText: `New ${newUserRole} account created`,
            changeType: 'user_action',
        }),

    userDeactivated: (adminName: string, adminRole: UserRole, targetUserName: string): ActivityLog =>
        createAuditLog({
            userName: adminName,
            userRole: adminRole,
            action: 'Deactivated',
            target: targetUserName,
            subText: `User account deactivated`,
            changeType: 'user_action',
        }),

    userActivated: (adminName: string, adminRole: UserRole, targetUserName: string): ActivityLog =>
        createAuditLog({
            userName: adminName,
            userRole: adminRole,
            action: 'Activated',
            target: targetUserName,
            subText: `User account reactivated`,
            changeType: 'user_action',
        }),

    passwordChanged: (userName: string, userRole: UserRole): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Password',
            target: userName,
            subText: `Password updated successfully`,
            changeType: 'user_action',
        }),

    // AI events
    aiAnalysisTriggered: (userName: string, userRole: UserRole, projectName: string, bidId: string, analysisType: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'AI Analysis',
            target: projectName,
            subText: `${analysisType} triggered`,
            changeType: 'edit',
            bidId,
            projectName,
        }),
    bidUpdated: (userName: string, userRole: UserRole, projectName: string, changeDetails: string): ActivityLog =>
        createAuditLog({
            userName,
            userRole,
            action: 'Updated Bid',
            target: projectName,
            subText: changeDetails,
            changeType: 'edit',
            projectName,
        }),
};

// LocalStorage key for audit logs
const AUDIT_STORAGE_KEY = 'bidsflow_audit_logs';

// Load audit logs from localStorage
export const loadAuditLogs = (): ActivityLog[] => {
    try {
        const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load audit logs:', e);
    }
    return [];
};

// Save audit logs to localStorage
export const saveAuditLogs = (logs: ActivityLog[]): void => {
    try {
        // Keep only last 500 entries to prevent storage overflow
        const trimmedLogs = logs.slice(-500);
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmedLogs));
    } catch (e) {
        console.error('Failed to save audit logs:', e);
    }
};

// Export audit logs as CSV
export const exportAuditLogsCSV = (logs: ActivityLog[]): string => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Target', 'Project', 'Change Type', 'From', 'To', 'Details'];
    const rows = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.userName,
        log.userRole,
        log.action,
        log.target,
        log.projectName || '-',
        log.changeType || '-',
        log.previousValue || '-',
        log.newValue || '-',
        log.subText
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

    return [headers.join(','), ...rows].join('\n');
};
