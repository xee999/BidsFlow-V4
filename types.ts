
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
  NO_BID = 'No Bid'
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
  | 'settings'
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
  { id: 'settings', label: 'Settings' },
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
    'settings': 'edit',
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
    'settings': 'none',
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
    'settings': 'none',
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
