
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

export interface ActivityLog {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  target: string;
  subText: string;
  timestamp: string;
  modality: 'sparkles' | 'zap' | 'check' | 'alert';
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
}

export interface User {
  id: string;
  name: string;
  role: 'BidsTeam' | 'Sales' | 'Management' | 'Technical';
}
