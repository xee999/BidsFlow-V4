
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
import { BidRecord, BidStatus, BidStage, RiskLevel, User, ActivityLog, TechnicalDocument } from './types.ts';
import { NAV_ITEMS, SOLUTION_OPTIONS } from './constants.tsx';
import { Search, X, Calendar, Filter, Clock, Send, Trophy, ZapOff, Ban, Briefcase, ChevronDown, Zap } from 'lucide-react';
import { clsx } from 'clsx';

// PRE-LOADED DATA: Dow University SMS Services Bid
// Fixed: Added missing required properties 'vendorQuotations', 'daysInStages', and 'stageHistory'
const INITIAL_BIDS: BidRecord[] = [
  {
    id: 'DUHS-SMS-2026',
    customerName: 'Dow University of Health Sciences (DUHS)',
    projectName: 'HIRING OF BUSINESS SMS SERVICES (NIT-187)',
    deadline: '2026-01-19',
    receivedDate: '2025-12-29',
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
    managementApprovalStatus: 'Pending',
    
    // Missing required fields
    vendorQuotations: [],
    daysInStages: {
      [BidStage.INTAKE]: 5,
      [BidStage.QUALIFICATION]: 7,
      [BidStage.SOLUTIONING]: 3
    },
    stageHistory: [
      { stage: BidStage.INTAKE, timestamp: '2025-12-29T10:00:00Z' },
      { stage: BidStage.QUALIFICATION, timestamp: '2026-01-03T14:30:00Z' },
      { stage: BidStage.SOLUTIONING, timestamp: '2026-01-10T09:15:00Z' }
    ],

    // Exact Financial BOQ from Jazz Proposal
    financialFormats: [
      { item: 'SMS (ITM-013158)', description: 'Bulk SMS Services', uom: 'MSG', quantity: 6000000, unitPrice: 4.12275, totalPrice: 24736500 },
      { item: 'Transactional WhatsApp (ITM-047931)', description: 'Utility/Auth Messages', uom: 'MSG', quantity: 3000000, unitPrice: 2.92715, totalPrice: 8781458 },
      { item: 'Marketing WhatsApp (ITM-047931)', description: 'Promotional Messages', uom: 'MSG', quantity: 500000, unitPrice: 25.42363, totalPrice: 12711812.5 }
    ],

    // Mandatory Compliance Checklist per RFP Page 12
    complianceChecklist: [
      { requirement: 'Valid NTN / Active Taxpayer Status', status: 'Complete', isMandatory: true, aiComment: 'Verified via FBR Portal' },
      { requirement: 'Valid Sindh Sales Tax (SST-SRB)', status: 'Complete', isMandatory: true, aiComment: 'Active status confirmed' },
      { requirement: '5+ Years in Business', status: 'Complete', isMandatory: true, aiComment: 'Incorporated 2012' },
      { requirement: 'PTA GSM/CVAS License', status: 'Complete', isMandatory: true, aiComment: 'Valid for current region' },
      { requirement: 'Integrity Pact (Annexure-J)', status: 'Pending', isMandatory: true }
    ],

    technicalQualificationChecklist: [
      { requirement: '3 Similar Projects (Last 5 Years)', type: 'Mandatory', status: 'Complete', aiComment: 'Matched with PITB and K-Electric' },
      { requirement: 'Average Turnover > 40M', type: 'Mandatory', status: 'Complete', aiComment: '3-year avg exceeds 150M' },
      { requirement: 'Tier-III Data Center Hosting', type: 'Mandatory', status: 'Complete', aiComment: 'Jazz DC meets specifications' }
    ],

    // Pre-loaded Document Portfolio
    technicalDocuments: [
      { id: 'doc-tender', name: 'DUHS_Tender_NIT_187.pdf', category: 'Tender', type: 'PDF', uploadDate: '29/12/2025', tags: ['RFP', 'Mandatory'] },
      { id: 'doc-tech', name: 'Jazz_Technical_Proposal_v1.pdf', category: 'Technical', type: 'PDF', uploadDate: '05/01/2026', tags: ['Solution', 'Architecture'], summary: 'Infobip-powered CPaaS integration for DUHS.' },
      { id: 'doc-fin', name: 'Jazz_Financial_Proposal.pdf', category: 'Financial', type: 'PDF', uploadDate: '05/01/2026', tags: ['Commercial', 'BOQ'], summary: 'Annualized TCV of 46.2M PKR.' }
    ],

    // Pre-loaded Proposal Content for Studio
    proposalSections: [
      { id: 'sec-1', title: 'Technical Knock Down Criteria & Evaluation', content: '### EVALUATION COMPLIANCE\nJazz Business confirms full compliance with all mandatory requirements listed in Section 9.4 of the RFP.\n\n- **Project Experience:** 10+ years in SMS operations.\n- **Data Center:** Hosting in local Tier-III certified facility.\n- **Uptime SLA:** 99.9% guaranteed availability.', status: 'complete', wordCount: 45 },
      { id: 'sec-2', title: 'Technical Specifications / Scope of Work', content: 'The proposed solution utilizes the global Infobip messaging engine, integrated directly with Jazz core mobile networks for ultra-low latency delivery.\n\n| Feature | Jazz Offering | Compliance |\n| :--- | :--- | :--- |\n| Throughput | 1000+ SMS/Min | Yes |\n| 2-Way SMS | Supported | Yes |\n| API Language | PHP, Java, .Net | Yes |', status: 'complete', wordCount: 52 }
    ]
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
  const [bids, setBids] = useState<BidRecord[]>(INITIAL_BIDS);
  const [vaultAssets, setVaultAssets] = useState<TechnicalDocument[]>(INITIAL_VAULT_ASSETS);
  const [auditTrail] = useState<ActivityLog[]>(INITIAL_AUDIT_TRAIL);
  const [viewingBidId, setViewingBidId] = useState<string | null>(null);
  const [showIntake, setShowIntake] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const handleUpdateBid = (updatedBid: BidRecord) => {
    setBids(prev => prev.map(b => b.id === updatedBid.id ? updatedBid : b));
  };

  const handleInitiateBid = (newBid: BidRecord) => {
    setBids(prev => [newBid, ...prev]);
    setShowIntake(false);
    setViewingBidId(newBid.id);
  };

  const handleNavigateToFilter = (status: string) => {
    setStatusFilter(status);
    setActiveTab('all-bids');
  };

  const filteredRepositoryBids = useMemo(() => {
    return bids.filter(bid => {
      const matchesSearch = bid.projectName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            bid.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || bid.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bids, searchQuery, statusFilter]);

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
              <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-20 text-left">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h1 className="text-4xl font-black text-[#1E293B] tracking-tight mb-2">Bid Repository</h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Strategic database for all Jazz Business opportunities</p>
                  </div>
                  <div className="relative w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-full py-4 pl-12 pr-6 text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#D32F2F] outline-none" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-fit mb-10">
                  {['All', 'Active', 'Submitted', 'Won', 'Lost', 'No Bid'].map(status => (
                    <button key={status} onClick={() => setStatusFilter(status)} className={clsx("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", statusFilter === status ? "bg-[#1E3A5F] text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50")}>{status}</button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-12">
                  {filteredRepositoryBids.map(bid => (
                    <div key={bid.id} onClick={() => setViewingBidId(bid.id)} className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full">
                      <div className="flex justify-between items-start mb-10">
                        <span className={clsx("px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm", bid.status === BidStatus.WON ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-500")}>{bid.status}</span>
                        <div className="text-2xl font-black text-slate-900">{((bid.tcvExclTax || bid.estimatedValue) / 1000000).toFixed(1)}M</div>
                      </div>
                      <h3 className="text-2xl font-black text-[#1E293B] group-hover:text-[#D32F2F] transition-colors line-clamp-2 leading-tight uppercase tracking-tighter">{bid.projectName}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{bid.customerName}</p>
                    </div>
                  ))}
                </div>
              </div>
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
