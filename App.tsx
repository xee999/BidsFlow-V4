
import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import BidIntake from './components/BidIntake.tsx';
import BidLifecycle from './components/BidLifecycle.tsx';
import ReportsView from './components/ReportsView.tsx';
import RiskWatchView from './components/RiskWatchView.tsx';
import ApprovalsView from './components/ApprovalsView.tsx';
import ProposalStudio from './components/ProposalStudio.tsx';
import CorporateVault from './components/CorporateVault.tsx';
import MarginCalculator from './components/MarginCalculator.tsx';
import AllBids from './components/AllBids.tsx';
import { BidRecord, BidStatus, BidStage, RiskLevel, User, ActivityLog, TechnicalDocument } from './types.ts';
import { NAV_ITEMS, SOLUTION_OPTIONS } from './constants.tsx';
import { Search, X, Calendar, Filter, Clock, Send, Trophy, ZapOff, Ban, Briefcase, ChevronDown, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { bidApi, vaultApi, auditApi } from './services/api.ts';
import { useEffect, useRef } from 'react';

// PRE-LOADED DATA: Dow University SMS Services Bid
// Fixed: Added missing required properties 'vendorQuotations', 'daysInStages', and 'stageHistory'
// PRE-LOADED DATA: Strategic Pipeline Demonstration
const INITIAL_BIDS: BidRecord[] = [
  {
    id: 'DUHS-SMS-2026',
    customerName: 'Dow University of Health Sciences (DUHS)',
    projectName: 'HIRING OF BUSINESS SMS SERVICES (NIT-187)',
    deadline: '2026-02-15',
    receivedDate: '2026-01-10',
    status: BidStatus.ACTIVE,
    currentStage: BidStage.SOLUTIONING,
    riskLevel: RiskLevel.LOW,
    estimatedValue: 100000000,
    currency: 'PKR',
    bidSecurity: 'PKR 2,000,000 (Fixed)',
    requiredSolutions: ['CPaaS', 'Cloud Solutions'],
    summaryRequirements: 'The customer requires a PTA-approved service provider to supply a bulk SMS and WhatsApp messaging solution. The system must support approx. 6 million SMS and 3.5 million WhatsApp messages per year with 24/7 availability and Tier-III data center hosting.',
    scopeOfWork: 'Provision of cloud-based web portal, API integration for DUHS CRM, 2-way communication, and support for MNP numbers.',
    qualificationCriteria: '5+ years in business, Valid NTN/SST (Active), PTA GSM/CVAS License, 3+ similar projects in last 5 years, Avg turnover > 40M.',
    jbcName: 'John Doe',
    channel: 'B2G',
    region: 'South',
    contractDuration: '24 Months',
    customerPaymentTerms: '45 Days',
    tcvExclTax: 46229770,
    tcvInclTax: 54088831,
    managementApprovalStatus: 'Submitted',
    approvingAuthorityRole: 'CBO',
    approvingAuthority: 'Sarah Khalid',
    approvalRequestedDate: '2026-01-25',
    publishDate: '2026-01-05',
    complexity: 'High',
    vendorQuotations: [],
    daysInStages: {
      [BidStage.INTAKE]: 5,
      [BidStage.QUALIFICATION]: 7,
      [BidStage.SOLUTIONING]: 3
    },
    stageHistory: [
      { stage: BidStage.INTAKE, timestamp: '2026-01-10T10:00:00Z' },
      { stage: BidStage.QUALIFICATION, timestamp: '2026-01-15T14:30:00Z' },
      { stage: BidStage.SOLUTIONING, timestamp: '2026-01-22T09:15:00Z' }
    ],
    identifiedRisks: [
      { category: 'Financial', description: 'Currency fluctuation impact on imported components', severity: RiskLevel.MEDIUM },
      { category: 'Compliance', description: 'Strict SLA requirements with heavy penalties', severity: RiskLevel.LOW }
    ],
    mitigationPlan: [
      'Hedge currency risk via bank forward contracts',
      'Include price escalation clause in contract',
      'Deploy redundant SMS gateways to ensure 99.9% uptime'
    ],
    financialFormats: [
      { item: 'SMS (ITM-013158)', description: 'Bulk SMS Services', uom: 'MSG', quantity: 6000000, unitPrice: 4.12275, totalPrice: 24736500 },
      { item: 'Transactional WhatsApp (ITM-047931)', description: 'Utility/Auth Messages', uom: 'MSG', quantity: 3000000, unitPrice: 2.92715, totalPrice: 8781458 },
      { item: 'Marketing WhatsApp (ITM-047931)', description: 'Promotional Messages', uom: 'MSG', quantity: 500000, unitPrice: 25.42363, totalPrice: 12711812.5 }
    ],
    complianceChecklist: [
      { id: 'comp-1', requirement: 'Valid NTN / Active Taxpayer Status', status: 'Complete', isMandatory: true, aiComment: 'Verified via FBR Portal' },
      { id: 'comp-2', requirement: 'Valid Sindh Sales Tax (SST-SRB)', status: 'Complete', isMandatory: true, aiComment: 'Active status confirmed' },
      { id: 'comp-3', requirement: '5+ Years in Business', status: 'Complete', isMandatory: true, aiComment: 'Incorporated 2012' },
      { id: 'comp-4', requirement: 'PTA GSM/CVAS License', status: 'Complete', isMandatory: true, aiComment: 'Valid for current region' },
      { id: 'comp-5', requirement: 'Integrity Pact (Annexure-J)', status: 'Pending', isMandatory: true }
    ],
    technicalQualificationChecklist: [
      { id: 'tech-q1', requirement: '3 Similar Projects (Last 5 Years)', type: 'Mandatory', status: 'Complete', aiComment: 'Matched with PITB and K-Electric' },
      { id: 'tech-q2', requirement: 'Average Turnover > 40M', type: 'Mandatory', status: 'Complete', aiComment: '3-year avg exceeds 150M' },
      { id: 'tech-q3', requirement: 'Tier-III Data Center Hosting', type: 'Mandatory', status: 'Complete', aiComment: 'Jazz DC meets specifications' }
    ],
    technicalDocuments: [
      { id: 'doc-tender', name: 'DUHS_Tender_NIT_187.pdf', category: 'Tender', type: 'PDF', uploadDate: '29/12/2025', tags: ['RFP', 'Mandatory'] },
      { id: 'doc-tech', name: 'Jazz_Technical_Proposal_v1.pdf', category: 'Technical', type: 'PDF', uploadDate: '05/01/2026', tags: ['Solution', 'Architecture'], summary: 'Infobip-powered CPaaS integration for DUHS.' },
      { id: 'doc-fin', name: 'Jazz_Financial_Proposal.pdf', category: 'Financial', type: 'PDF', uploadDate: '05/01/2026', tags: ['Commercial', 'BOQ'], summary: 'Annualized TCV of 46.2M PKR.' }
    ],
    proposalSections: [
      { id: 'sec-1', title: 'Technical Knock Down Criteria & Evaluation', content: '### EVALUATION COMPLIANCE\nJazz Business confirms full compliance with all mandatory requirements listed in Section 9.4 of the RFP.\n\n- **Project Experience:** 10+ years in SMS operations.\n- **Data Center:** Hosting in local Tier-III certified facility.\n- **Uptime SLA:** 99.9% guaranteed availability.', status: 'complete', wordCount: 45 },
      { id: 'sec-2', title: 'Technical Specifications / Scope of Work', content: 'The proposed solution utilizes the global Infobip messaging engine, integrated directly with Jazz core mobile networks for ultra-low latency delivery.\n\n| Feature | Jazz Offering | Compliance |\n| :--- | :--- | :--- |\n| Throughput | 1000+ SMS/Min | Yes |\n| 2-Way SMS | Supported | Yes |\n| API Language | PHP, Java, .Net | Yes |', status: 'complete', wordCount: 52 }
    ]
  },
  {
    id: 'ENT-CLOUD-2026',
    customerName: 'HBL (Habib Bank Limited)',
    projectName: 'Enterprise Hybrid Cloud Expansion',
    deadline: '2026-03-10',
    receivedDate: '2026-01-05',
    publishDate: '2025-12-20',
    status: BidStatus.ACTIVE,
    currentStage: BidStage.PRICING,
    complexity: 'High',
    riskLevel: RiskLevel.HIGH,
    estimatedValue: 250000000,
    currency: 'PKR',
    bidSecurity: '2% of Bid Value',
    requiredSolutions: ['Cloud Solutions', 'System Integration'],
    summaryRequirements: 'Bank-wide hybrid cloud expansion requiring Tier-IV data center presence and multi-region failover.',
    scopeOfWork: 'Azure Stack Hub implementation, 24/7 Managed Services, and Security Operations Center (SOC) integration.',
    qualificationCriteria: 'Tier-1 Service Provider, CSP Tier-1 Status, SOC2 Type II Certified.',
    jbcName: 'Sarah Ahmed',
    managementApprovalStatus: 'Submitted',
    approvingAuthorityRole: 'CFO',
    approvingAuthority: 'Mohsin Khan',
    approvalRequestedDate: '2026-01-27',
    identifiedRisks: [
      { category: 'Technical', description: 'Complexity of Tier-IV DC integration for Azure Stack Hub', severity: RiskLevel.HIGH },
      { category: 'Legal', description: 'Specific data residency clauses required by State Bank', severity: RiskLevel.MEDIUM }
    ],
    mitigationPlan: [
      'Onboard Azure Stack Hub certified specialists from region',
      'Phased implementation with clear roll-back points for zero-downtime migration',
      'Legal review of contract terms by specialized fintech counsel'
    ],
    disqualifyingFactors: ['Non-compliance with SOC2 Type II audit requirement in initial submission'],
    daysInStages: {
      [BidStage.INTAKE]: 4,
      [BidStage.QUALIFICATION]: 10,
      [BidStage.SOLUTIONING]: 12,
      [BidStage.PRICING]: 2
    },
    stageHistory: [
      { stage: BidStage.INTAKE, timestamp: '2026-01-05T09:00:00Z' },
      { stage: BidStage.QUALIFICATION, timestamp: '2026-01-09T11:00:00Z' },
      { stage: BidStage.SOLUTIONING, timestamp: '2026-01-19T10:00:00Z' },
      { stage: BidStage.PRICING, timestamp: '2026-01-31T09:00:00Z' }
    ],
    financialFormats: [],
    complianceChecklist: [],
    technicalQualificationChecklist: [],
    technicalDocuments: [],
    vendorQuotations: []
  },
  {
    id: 'GOV-CONNECT-2026',
    customerName: 'FBR (Federal Board of Revenue)',
    projectName: 'Nationwide SD-WAN Connectivity',
    deadline: '2026-02-28',
    receivedDate: '2026-01-20',
    publishDate: '2026-01-15',
    status: BidStatus.ACTIVE,
    currentStage: BidStage.QUALIFICATION,
    complexity: 'Medium',
    riskLevel: RiskLevel.MEDIUM,
    estimatedValue: 450000000,
    currency: 'PKR',
    bidSecurity: 'PKR 10,000,000',
    requiredSolutions: ['Fixed Connectivity'],
    summaryRequirements: 'SD-WAN connectivity for 1200+ FBR sites across Pakistan.',
    scopeOfWork: 'Hardware supply, link installation, and centralized management console provision.',
    qualificationCriteria: 'Country-wide fiber footprint, 1100+ field engineers, ISO certified.',
    jbcName: 'Ali Raza',
    managementApprovalStatus: 'Approved',
    approvingAuthorityRole: 'CBO',
    approvingAuthority: 'Farhan Ali',
    approvalRequestedDate: '2026-01-22',
    managementApprovalDate: '2026-01-24',
    identifiedRisks: [
      { category: 'Timeline', description: 'Aggressive rollout schedule for 1200 sites across multiple remote regions', severity: RiskLevel.HIGH },
      { category: 'Compliance', description: 'Mandatory ISO 20000 certification for service management', severity: RiskLevel.LOW }
    ],
    mitigationPlan: [
      'Parallel deployment teams activated in 4 major regions (North, South, Central 1, Central 2)',
      'Pre-configuration of all SD-WAN hardware at central Jazz hub before shipping',
      'Dedicated logistics partner for field equipment delivery'
    ],
    daysInStages: {
      [BidStage.INTAKE]: 2,
      [BidStage.QUALIFICATION]: 5
    },
    stageHistory: [
      { stage: BidStage.INTAKE, timestamp: '2026-01-20T08:00:00Z' },
      { stage: BidStage.QUALIFICATION, timestamp: '2026-01-22T09:00:00Z' }
    ],
    financialFormats: [],
    complianceChecklist: [],
    technicalQualificationChecklist: [],
    technicalDocuments: [],
    vendorQuotations: []
  },
  {
    id: 'SEC-INTEG-2026',
    customerName: 'State Bank of Pakistan',
    projectName: 'Project Omega: Cybersecurity Fusion',
    deadline: '2026-01-30',
    receivedDate: '2025-12-01',
    publishDate: '2025-11-20',
    status: BidStatus.ACTIVE, // Keep active to test "Critical Action" in Approvals View
    currentStage: BidStage.FINAL_REVIEW,
    complexity: 'High',
    riskLevel: RiskLevel.HIGH,
    estimatedValue: 850000000,
    currency: 'PKR',
    bidSecurity: 'PKR 15,000,000',
    requiredSolutions: ['Managed Security', 'System Integration'],
    summaryRequirements: 'National-level cybersecurity fusion center for SBP with multi-agency SOC integration.',
    scopeOfWork: 'SIEM/SOAR deployment, 24/7 Red Teaming, and AI-driven threat intelligence platform.',
    qualificationCriteria: 'PCI-DSS, ISO 27001, Tier-1 Cybersecurity Provider Status.',
    jbcName: 'Imran Khan',
    managementApprovalStatus: 'Submitted',
    approvingAuthorityRole: 'CBO',
    approvingAuthority: 'Sarah Khalid',
    approvalRequestedDate: '2026-01-20',
    identifiedRisks: [
      { category: 'Technical', description: 'Integration with 14 different legacy banking systems', severity: RiskLevel.HIGH },
      { category: 'Compliance', description: 'Data sovereignty concerns for external cloud storage', severity: RiskLevel.HIGH }
    ],
    mitigationPlan: [
      'Utilize specialized SOC middleware for legacy integration',
      'Implement localized on-premise AI training to avoid data export',
      'Dual-factor encryption for all data-at-rest'
    ],
    daysInStages: {
      [BidStage.INTAKE]: 3,
      [BidStage.QUALIFICATION]: 7,
      [BidStage.SOLUTIONING]: 20,
      [BidStage.PRICING]: 10,
      [BidStage.COMPLIANCE]: 5,
      [BidStage.FINAL_REVIEW]: 2
    },
    stageHistory: [
      { stage: BidStage.INTAKE, timestamp: '2025-12-01T09:00:00Z' },
      { stage: BidStage.QUALIFICATION, timestamp: '2025-12-04T10:00:00Z' },
      { stage: BidStage.SOLUTIONING, timestamp: '2025-12-11T09:00:00Z' },
      { stage: BidStage.PRICING, timestamp: '2025-12-31T14:00:00Z' },
      { stage: BidStage.COMPLIANCE, timestamp: '2026-01-10T11:00:00Z' },
      { stage: BidStage.FINAL_REVIEW, timestamp: '2026-01-15T15:00:00Z' }
    ],
    financialFormats: [],
    complianceChecklist: [],
    technicalQualificationChecklist: [],
    technicalDocuments: [],
    vendorQuotations: []
  },
  {
    id: 'MOB-FIBER-WON',
    customerName: 'Mobilink Microfinance Bank',
    projectName: 'Nationwide Branch Fiber Connectivity',
    deadline: '2025-12-15',
    receivedDate: '2025-11-01',
    status: BidStatus.WON,
    submissionDate: '2025-12-10',
    currentStage: BidStage.FINAL_REVIEW,
    riskLevel: RiskLevel.LOW,
    estimatedValue: 120000000,
    currency: 'PKR',
    bidSecurity: 'PKR 2,400,000',
    summaryRequirements: 'Fiber connectivity for 200+ branches.',
    scopeOfWork: 'Laying fiber and O&M.',
    qualificationCriteria: 'Proven track record in telecom infra.',
    requiredSolutions: ['Fixed Connectivity'],
    jbcName: 'Zeeshan Ali',
    daysInStages: { [BidStage.INTAKE]: 2, [BidStage.QUALIFICATION]: 4, [BidStage.SOLUTIONING]: 10, [BidStage.PRICING]: 5, [BidStage.COMPLIANCE]: 3, [BidStage.FINAL_REVIEW]: 2 },
    stageHistory: [{ stage: BidStage.INTAKE, timestamp: '2025-11-01T09:00:00Z' }],
    financialFormats: [], complianceChecklist: [], technicalQualificationChecklist: [], technicalDocuments: [], vendorQuotations: []
  },
  {
    id: 'ALF-SOC-LOST',
    customerName: 'Bank Alfalah',
    projectName: 'Managed Security Services (SOC)',
    deadline: '2025-12-20',
    receivedDate: '2025-11-15',
    status: BidStatus.LOST,
    submissionDate: '2025-12-18',
    currentStage: BidStage.FINAL_REVIEW,
    riskLevel: RiskLevel.HIGH,
    estimatedValue: 85000000,
    currency: 'PKR',
    bidSecurity: 'PKR 1,700,000',
    summaryRequirements: '24/7 Managed SOC services.',
    scopeOfWork: 'Security monitoring and incident response.',
    qualificationCriteria: 'ISO 27001 certified SOC.',
    requiredSolutions: ['Managed Security'],
    jbcName: 'Farhan Ahmad',
    daysInStages: { [BidStage.INTAKE]: 5, [BidStage.QUALIFICATION]: 10, [BidStage.SOLUTIONING]: 15 },
    stageHistory: [{ stage: BidStage.INTAKE, timestamp: '2025-11-15T09:00:00Z' }],
    financialFormats: [], complianceChecklist: [], technicalQualificationChecklist: [], technicalDocuments: [], vendorQuotations: []
  },
  {
    id: 'SINDH-NO-BID',
    customerName: 'Sindh Police',
    projectName: 'Safe City Surveillance Phase 3',
    deadline: '2026-01-10',
    receivedDate: '2025-12-20',
    status: BidStatus.NO_BID,
    noBidReason: 'Unfavorable payment terms (180 days credit) and high penalty clauses exceeding 20% of contract value.',
    noBidReasonCategory: 'Commercial Risk',
    currentStage: BidStage.QUALIFICATION,
    riskLevel: RiskLevel.HIGH,
    estimatedValue: 1500000000,
    currency: 'PKR',
    bidSecurity: 'PKR 30,000,000',
    summaryRequirements: 'City-wide AI surveillance system.',
    scopeOfWork: 'Supply and installation of 5000+ AI cameras.',
    qualificationCriteria: 'Experience with Safe City projects.',
    requiredSolutions: ['System Integration'],
    jbcName: 'John Doe',
    daysInStages: { [BidStage.INTAKE]: 3, [BidStage.QUALIFICATION]: 7 },
    stageHistory: [{ stage: BidStage.INTAKE, timestamp: '2025-12-20T09:00:00Z' }],
    financialFormats: [], complianceChecklist: [], technicalQualificationChecklist: [], technicalDocuments: [], vendorQuotations: []
  }
];

const INITIAL_VAULT_ASSETS: TechnicalDocument[] = [
  { id: 'v1', name: 'Jazz Business ISO 27001 Certificate', category: 'Credentials', type: 'PDF', uploadDate: '01/01/2024', summary: 'Global information security standards.' },
  { id: 'v2', name: 'K-Electric SMS Case Study', category: 'Case Studies', type: 'PDF', uploadDate: '15/08/2023', summary: 'Implementation of high-volume alert system for 2.5M users.' },
  { id: 'v3', name: 'SMS Gateway API Documentation', category: 'Templates', type: 'PDF', uploadDate: '10/10/2023', summary: 'Standard REST API integration guide.' }
];

const DEFAULT_USER: User = {
  id: 'user-1',
  name: 'Zeeshan',
  role: 'BidsTeam'
};

const INITIAL_AUDIT_TRAIL: ActivityLog[] = [
  { id: 'act-1', userName: 'System', userRole: 'Technical', action: 'pre-loaded', target: 'DUHS Opportunity', subText: 'Auto-synchronized with Repository', timestamp: 'Just now', modality: 'sparkles' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser] = useState<User>(DEFAULT_USER);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [vaultAssets, setVaultAssets] = useState<TechnicalDocument[]>([]);
  const [auditTrail, setAuditTrail] = useState<ActivityLog[]>([]);
  const [viewingBidId, setViewingBidId] = useState<string | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialStatusFilter, setInitialStatusFilter] = useState<string>('All');

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedBids, fetchedVault, fetchedAudit] = await Promise.all([
          bidApi.getAll(),
          vaultApi.getAll(),
          auditApi.getAll()
        ]);

        // Seed with initial data if DB is empty (for demo/onboarding)
        if (fetchedBids.length === 0) {
          await Promise.all(INITIAL_BIDS.map(b => bidApi.create(b)));
          setBids(INITIAL_BIDS);
        } else {
          setBids(fetchedBids);
        }

        if (fetchedVault.length === 0) {
          await Promise.all(INITIAL_VAULT_ASSETS.map(a => vaultApi.create(a)));
          setVaultAssets(INITIAL_VAULT_ASSETS);
        } else {
          setVaultAssets(fetchedVault);
        }

        if (fetchedAudit.length === 0) {
          await Promise.all(INITIAL_AUDIT_TRAIL.map(l => auditApi.create(l)));
          setAuditTrail(INITIAL_AUDIT_TRAIL);
        } else {
          setAuditTrail(fetchedAudit);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        // Fallback to initial data if API fails
        setBids(INITIAL_BIDS);
        setVaultAssets(INITIAL_VAULT_ASSETS);
        setAuditTrail(INITIAL_AUDIT_TRAIL);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleUpdateBid = async (updatedBid: BidRecord) => {
    try {
      setBids(prev => prev.map(b => b.id === updatedBid.id ? updatedBid : b));
      await bidApi.update(updatedBid);
    } catch (err) {
      console.error('Failed to update bid:', err);
    }
  };

  const handleInitiateBid = async (newBid: BidRecord) => {
    try {
      setBids(prev => [newBid, ...prev]);
      await bidApi.create(newBid);
      setShowIntake(false);
      setViewingBidId(newBid.id);

      // Log activity
      const log: ActivityLog = {
        id: `act-${Date.now()}`,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'initiated',
        target: newBid.projectName,
        subText: 'New bid opportunity created',
        timestamp: 'Just now',
        modality: 'zap'
      };
      setAuditTrail(prev => [log, ...prev]);
      await auditApi.create(log);
    } catch (err) {
      console.error('Failed to initiate bid:', err);
    }
  };

  // Update vault assets in DB when changed
  const handleSetVaultAssets = async (assets: TechnicalDocument[]) => {
    setVaultAssets(assets);
    // Note: In a real app, we'd only sync the new/updated asset. 
    // Here we're using the hook directly in CorporateVault, so we might need a more granular approach.
    // For now, let's assume assets are added via a specific action or handle it here.
  };

  const handleNavigateToFilter = (status: string) => {
    setInitialStatusFilter(status);
    setActiveTab('all-bids');
  };

  if (viewingBidId) {
    const currentBid = bids.find(b => b.id === viewingBidId);
    if (currentBid) return <BidLifecycle bid={currentBid} onUpdate={handleUpdateBid} onClose={() => setViewingBidId(null)} />;
  }

  return (
    <div className="flex bg-[#F1F5F9] min-h-screen overflow-x-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      <main className={clsx("flex-1 min-h-screen transition-all duration-300 ease-in-out", isSidebarCollapsed ? "ml-20" : "ml-64")}>
        {showIntake ? (
          <BidIntake onCancel={() => setShowIntake(false)} onInitiate={handleInitiateBid} />
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && (
              <Dashboard bids={bids} user={currentUser} auditTrail={auditTrail} onNewBid={() => setShowIntake(true)} onViewBid={setViewingBidId} onNavigateToFilter={handleNavigateToFilter} />
            )}

            {activeTab === 'all-bids' && (
              <AllBids bids={bids} onViewBid={setViewingBidId} initialStatus={initialStatusFilter} />
            )}

            {activeTab === 'studio' && <ProposalStudio bids={bids} onUpdateBid={handleUpdateBid} vaultAssets={vaultAssets} />}
            {activeTab === 'vault' && <CorporateVault assets={vaultAssets} setAssets={setVaultAssets} />}
            {activeTab === 'calculator' && <MarginCalculator bids={bids} onUpdate={handleUpdateBid} />}
            {activeTab === 'reports' && <ReportsView bids={bids} />}
            {activeTab === 'risk-watch' && <RiskWatchView bids={bids} onViewBid={setViewingBidId} />}
            {activeTab === 'approvals' && <ApprovalsView bids={bids} onViewBid={setViewingBidId} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
