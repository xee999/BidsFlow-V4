
export enum BidStage {
  INTAKE = 'Intake',
  QUALIFICATION = 'Qualification',
  SOLUTIONING = 'Solutioning',
  PRICING = 'Pricing',
  COMPLIANCE = 'Compliance',
  FINAL_REVIEW = 'Final Review'
}

export enum BidStatus {
  ACTIVE = 'Active',
  SUBMITTED = 'Submitted',
  WON = 'Won',
  LOST = 'Lost',
  NO_BID = 'No Bid',
  NOT_SUBMITTED = 'Not Submitted'
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export type ApprovingAuthorityRole = 'Manager Finance' | 'CFO' | 'CBO' | 'PriceCo';

export interface PreBidMeeting {
  date: string;
  time: string;
  location: string;
  isMandatory: boolean;
  notes?: string;
}

export interface Deliverable {
  item: string;
  quantity: string;
  specs?: string;
  category?: string;
}

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'in-progress' | 'complete';
  wordCount: number;
  description?: string;
  type?: 'narrative' | 'form' | 'table' | 'annexure';
}

export interface FinancialFormat {
  item: string;
  description: string;
  uom: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface ComplianceItem {
  id: string;
  requirement: string;
  status: 'Pending' | 'Complete';
  isMandatory?: boolean;
  documentName?: string;
  aiComment?: string;
  aiScore?: number;
}

export interface QualificationItem {
  id: string;
  requirement: string;
  type: 'Mandatory' | 'Required' | 'Optional';
  status: 'Pending' | 'Complete';
  aiComment?: string;
}

export type VaultCategory =
  | 'All Documents'
  | 'Case Studies'
  | 'Past Proposals'
  | 'Templates'
  | 'Credentials'
  | 'Boilerplate'
  | 'Staff Resumes'
  | 'POs & Contracts'
  | 'Legal & Tax'
  | 'Customer Acknowledgments';

export interface TechnicalDocument {
  id: string;
  name: string;
  type: string;
  category: VaultCategory | 'Technical' | 'Financial' | 'Compliance' | 'Forms' | 'Tender';
  uploadDate: string;
  aiScore?: number;
  aiMatchDetails?: string;
  vendorName?: string;
  validity?: string;
  currency?: 'PKR' | 'USD' | 'EUR';
  paymentTerms?: string;
  tags?: string[];
  summary?: string;
  winRate?: string;
  fileData?: string;
  fileSize?: string;
  timesUsed?: number;
  lastModified?: string;
}

export interface StageTransition {
  stage: BidStage;
  timestamp: string;
}

export interface BidRisk {
  category: 'Technical' | 'Financial' | 'Compliance' | 'Timeline' | 'Legal';
  description: string;
  severity: RiskLevel;
}

export type AuditChangeType = 'stage_change' | 'document_upload' | 'approval' | 'edit' | 'status_change' | 'user_action';

export interface ActivityLog {
  id: string;
  userName: string;
  userRole: string;
  userRoleName?: string;
  action: string;
  target: string;
  subText: string;
  timestamp: string;
  modality: 'sparkles' | 'zap' | 'check' | 'alert';
  // Bid-specific tracking fields
  bidId?: string;
  projectName?: string;
  changeType?: AuditChangeType;
  previousValue?: string;
  newValue?: string;
}

export interface BidNote {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  createdBy: string;
  mentionedUserIds?: string[]; // User IDs tagged with @mention
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'note' | 'event' | 'reminder';
  color: string;
  description?: string;
  createdBy: string;
}

// ============================================
// NOTIFICATION ENGINE TYPES
// ============================================

export enum NotificationType {
  // Deadline-related
  DEADLINE_24H = 'deadline_24h',
  DEADLINE_12H = 'deadline_12h',
  DEADLINE_2H = 'deadline_2h',
  DEADLINE_1H = 'deadline_1h',

  // Calendar events
  EVENT_TODAY = 'event_today',
  REMINDER_DUE = 'reminder_due',

  // Pre-bid meetings
  MEETING_TOMORROW = 'meeting_tomorrow',
  MEETING_2H = 'meeting_2h',

  // Stage tracking
  STAGE_TRANSITION = 'stage_transition',
  BID_STALLED = 'bid_stalled',

  // General
  NEW_BID = 'new_bid',
  STATUS_CHANGE = 'status_change',
  DOCUMENT_UPLOADED = 'document_uploaded',
  NOTE_ADDED = 'note_added',
  MENTION = 'mention'  // @mention in notes
}

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export interface BidNotification {
  id: string;
  userId: string;                    // Target user (or 'all' for broadcast)
  type: NotificationType;
  priority: NotificationPriority;

  // Content
  title: string;
  message: string;

  // Related entities
  bidId?: string;
  bidName?: string;
  eventId?: string;
  noteId?: string;  // For scroll-to-highlight on note mentions

  // State
  isRead: boolean;
  isDismissed: boolean;
  browserNotificationSent: boolean;

  // Timing
  createdAt: string;
  scheduledFor?: string;             // For future notifications
  expiresAt?: string;                // Auto-dismiss after this time
}

export interface NotificationPreferences {
  userId: string;

  // Master toggle
  browserNotificationsEnabled: boolean;

  // Deadline alerts
  deadlineAlerts: {
    enabled: boolean;
    intervals: ('24h' | '12h' | '2h' | '1h')[];
    browserPopup: boolean;
  };

  // Calendar events
  calendarAlerts: {
    enabled: boolean;
    intervals: ('1d' | '1h' | '15m' | 'at_time')[];
    browserPopup: boolean;
  };

  // Pre-bid meetings
  meetingAlerts: {
    enabled: boolean;
    intervals: ('1d' | '2h')[];
    browserPopup: boolean;
  };

  // Stage progress
  stageAlerts: {
    transitions: boolean;
    stalledAlerts: boolean;
    stalledThresholdDays: number;
    browserPopup: boolean;
  };

  // Informational
  infoAlerts: {
    newBids: boolean;
    statusChanges: boolean;
    documents: boolean;
    notes: boolean;
  };
}

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  browserNotificationsEnabled: true,
  deadlineAlerts: {
    enabled: true,
    intervals: ['24h', '2h', '1h'],
    browserPopup: true
  },
  calendarAlerts: {
    enabled: true,
    intervals: ['1h', '15m', 'at_time'],
    browserPopup: true
  },
  meetingAlerts: {
    enabled: true,
    intervals: ['1d', '2h'],
    browserPopup: true
  },
  stageAlerts: {
    transitions: true,
    stalledAlerts: true,
    stalledThresholdDays: 3,
    browserPopup: false
  },
  infoAlerts: {
    newBids: true,
    statusChanges: true,
    documents: false,
    notes: false
  }
};

export interface StrategicRiskReport {
  risks: { category: string; description: string; severity: RiskLevel }[];
  mitigations: string[];
}

export interface FinalRiskReport {
  risks: string[];
  mitigations: string[];
  overallAssessment: string;
}

export interface BidRecord {
  id: string;
  customerName: string;
  projectName: string;
  deadline: string;
  receivedDate: string;
  status: BidStatus;
  currentStage: BidStage;
  riskLevel: RiskLevel;
  estimatedValue: number;
  currency: string;
  bidSecurity: string;
  requiredSolutions: string[];
  summaryRequirements: string;
  scopeOfWork: string;
  qualificationCriteria: string;
  aiQualificationSummary?: string;
  technicalQualificationChecklist: QualificationItem[];
  complianceChecklist: ComplianceItem[];
  technicalDocuments: TechnicalDocument[];
  vendorQuotations: TechnicalDocument[];
  financialFormats: FinancialFormat[];
  proposalSections?: ProposalSection[];
  noBidReason?: string;
  noBidReasonCategory?: string;
  noBidComments?: string;
  competitionPricing?: string;
  keyLearnings?: string;
  noBidStage?: string;
  daysInStages: Record<string, number>;
  stageHistory: StageTransition[];
  submissionDate?: string;
  aiQualificationScore?: number;
  jbcName: string;
  channel?: 'B2G' | 'Enterprise';
  region?: 'North' | 'South' | 'Central';
  contractDuration?: string;
  customerPaymentTerms?: string;
  vendorPaymentTerms?: string;
  tcvExclTax?: number;
  tcvInclTax?: number;
  managementApprovalStatus?: 'Pending' | 'Submitted' | 'Approved';
  pricingApprovalStatus?: 'Pending' | 'Submitted' | 'Approved';
  approvingAuthorityRole?: ApprovingAuthorityRole;
  approvingAuthority?: string;
  approvalRequestedDate?: string;
  managementApprovalDate?: string;
  identifiedRisks?: BidRisk[];
  mitigationPlan?: string[];
  strategicRiskAssessment?: StrategicRiskReport;
  solutioningAIAnalysis?: string;
  finalRiskAssessment?: FinalRiskReport;
  aiQualificationAssessment?: 'Go' | 'No-Go' | 'Needs Review';
  qualifyingFactors?: string[];
  disqualifyingFactors?: string[];
  aiConfidenceScore?: number;
  publishDate?: string;
  complexity?: 'Low' | 'Medium' | 'High';
  preBidMeeting?: PreBidMeeting;
  deliverablesSummary?: Deliverable[];
  integrityScoreBreakdown?: {
    technicalWeight: number;
    complianceWeight: number;
    commercialWeight: number;
    legalWeight: number;
  };
  phaseTargets?: Record<string, number>; // Calculated target days per phase
  notes?: BidNote[];
}

// User Role Types
export type UserRole = 'SUPER_ADMIN' | 'BID_TEAM' | 'VIEWER' | string;

export type AvatarIcon = 'initials' | 'briefcase' | 'user' | 'shield' | 'building' | 'star' | 'rocket' | 'crown';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  roleName?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  avatar?: string; // Base64 image data or AvatarIcon name
  avatarType?: 'icon' | 'image'; // Whether avatar is a preset icon or custom image
  permissions?: SectionPermissions;
}

// Role display names for UI
export const USER_ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  BID_TEAM: 'Bids Team',
  VIEWER: 'Viewer',
};

// Permission definitions
export type Permission =
  | 'view_dashboard'
  | 'view_bids'
  | 'create_bids'
  | 'edit_bids'
  | 'delete_bids'
  | 'manage_approvals'
  | 'view_vault'
  | 'edit_vault'
  | 'use_proposal_studio'
  | 'view_reports'
  | 'view_settings'
  | 'manage_users'
  | 'view_audit_logs';

// Role-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'view_dashboard', 'view_bids', 'create_bids', 'edit_bids', 'delete_bids',
    'manage_approvals', 'view_vault', 'edit_vault', 'use_proposal_studio',
    'view_reports', 'view_settings', 'manage_users', 'view_audit_logs'
  ],
  BID_TEAM: [
    'view_dashboard', 'view_bids', 'create_bids', 'edit_bids',
    'manage_approvals', 'view_vault', 'edit_vault', 'use_proposal_studio',
    'view_reports', 'view_audit_logs'
  ],
  VIEWER: [
    'view_dashboard', 'view_bids', 'view_vault', 'view_reports'
  ],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

// ============================================
// GRANULAR ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================

// Section identifiers for permission control
export type AppSection =
  | 'bid-intake'
  | 'bid-stages'
  | 'studio'
  | 'vault'
  | 'calculator'
  | 'approvals'
  | 'reports'
  | 'risk-watch'
  | 'calendar'
  | 'settings'
  | 'edit_bids'
  | 'delete-manager';

// All available sections (for iteration)
export const APP_SECTIONS: { id: AppSection; label: string }[] = [
  { id: 'bid-intake', label: 'Bid Intake' },
  { id: 'bid-stages', label: 'Bid Stages / Lifecycle' },
  { id: 'studio', label: 'Proposal Studio' },
  { id: 'vault', label: 'Corporate Vault' },
  { id: 'calculator', label: 'Margin Calculator' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'reports', label: 'Reports' },
  { id: 'risk-watch', label: 'Risk Watch' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'settings', label: 'Settings' },
  { id: 'edit_bids', label: 'Edit Bids' },
  { id: 'delete-manager', label: 'Delete Manager' },
];

// Permission levels per section
export type PermissionLevel = 'none' | 'view' | 'edit';

// Section permission mapping
export type SectionPermissions = Record<AppSection, PermissionLevel>;

// Custom Role definition
export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: SectionPermissions;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

// Default permissions for built-in roles
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, SectionPermissions> = {
  SUPER_ADMIN: {
    'bid-intake': 'edit',
    'bid-stages': 'edit',
    'studio': 'edit',
    'vault': 'edit',
    'calculator': 'edit',
    'approvals': 'edit',
    'reports': 'edit',
    'risk-watch': 'edit',
    'calendar': 'edit',
    'settings': 'edit',
    'edit_bids': 'edit',
    'delete-manager': 'edit',
  },
  BID_TEAM: {
    'bid-intake': 'edit',
    'bid-stages': 'edit',
    'studio': 'edit',
    'vault': 'edit',
    'calculator': 'edit',
    'approvals': 'edit',
    'reports': 'view',
    'risk-watch': 'view',
    'calendar': 'edit',
    'settings': 'none',
    'edit_bids': 'edit',
    'delete-manager': 'none',
  },
  VIEWER: {
    'bid-intake': 'none',
    'bid-stages': 'view',
    'studio': 'none',
    'vault': 'view',
    'calculator': 'none',
    'approvals': 'view',
    'reports': 'view',
    'risk-watch': 'view',
    'calendar': 'view',
    'settings': 'none',
    'edit_bids': 'none',
    'delete-manager': 'none',
  },
};

// Helper: Check if user has at least view access to a section
export const canViewSection = (permissions: SectionPermissions, section: AppSection): boolean => {
  return permissions[section] === 'view' || permissions[section] === 'edit';
};

// Helper: Check if user has edit access to a section
export const canEditSection = (permissions: SectionPermissions, section: AppSection): boolean => {
  return permissions[section] === 'edit';
};

// Helper: Get permissions for a built-in role
export const getBuiltInRolePermissions = (role: UserRole): SectionPermissions => {
  return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.VIEWER;
};
