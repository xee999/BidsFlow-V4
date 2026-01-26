
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ArrowLeft, ChevronRight, ChevronLeft, ShieldAlert, FileUp, Zap, Info,
  CheckCircle2, Loader2, FileText, ShieldCheck, CheckSquare, CreditCard,
  UserCheck, Clock, AlertTriangle, Sparkles, XCircle, Download, Trophy,
  Target, ThumbsDown, ChevronDown, Send, RefreshCw, AlertCircle,
  FileSpreadsheet, Package, BadgeDollarSign, Plus, Briefcase, Layers,
  FileBox, ClipboardList, FileSearch, FileBadge, ExternalLink, Filter,
  Activity, Calculator, Lock, Archive, Tag, Trash2, Flag, Award, ThumbsUp,
  Banknote, Landmark
} from 'lucide-react';
import { BidRecord, BidStage, BidStatus, TechnicalDocument, StageTransition, ComplianceItem, QualificationItem, RiskLevel, FinancialFormat, ApprovingAuthorityRole } from '../types.ts';
import { STAGE_ICONS } from '../constants.tsx';
import { analyzePricingDocument, analyzeComplianceDocuments, generateFinalRiskAssessment, generateStrategicRiskAssessment, analyzeSolutioningDocuments, analyzeBidSecurityDocument } from '../services/gemini.ts';
import FloatingAIChat from './FloatingAIChat.tsx';
import { clsx } from 'clsx';

interface BidLifecycleProps {
  bid: BidRecord;
  onUpdate: (updatedBid: BidRecord) => void;
  onClose: () => void;
}

const COMMON_NO_BID_REASONS = [
  'Technical Non-Compliance',
  'Budget/Pricing Mismatch',
  'High Delivery Risk',
  'Resource Unavailability',
  'Conflict of Interest',
  'Unfavorable T&Cs',
  'Strategic Realignment',
  'Missing Credentials'
];

const BidLifecycle: React.FC<BidLifecycleProps> = ({ bid, onUpdate, onClose }) => {
  const [viewingStage, setViewingStage] = useState<BidStage>(bid.currentStage);
  const [showNoBidModal, setShowNoBidModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState<'Won' | 'Lost' | null>(null);

  const [noBidCategory, setNoBidCategory] = useState("");
  const [noBidComments, setNoBidComments] = useState("");
  const [compPricing, setCompPricing] = useState("");
  const [learnings, setLearnings] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingBidSecurity, setIsAnalyzingBidSecurity] = useState(false);
  const [isEvaluatingRisk, setIsEvaluatingRisk] = useState(false);
  const [isEvaluatingStrategicRisk, setIsEvaluatingStrategicRisk] = useState(false);
  const [isAnalyzingSolution, setIsAnalyzingSolution] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const navRef = useRef<HTMLDivElement>(null);
  const refs = {
    technical: useRef<HTMLInputElement>(null),
    vendor: useRef<HTMLInputElement>(null),
    pricing: useRef<HTMLInputElement>(null),
    compliance: useRef<HTMLInputElement>(null),
    annexure: useRef<HTMLInputElement>(null),
    supporting: useRef<HTMLInputElement>(null),
    bidSecurity: useRef<HTMLInputElement>(null),
  };

  const stagesOrder = [
    BidStage.INTAKE,
    BidStage.QUALIFICATION,
    BidStage.SOLUTIONING,
    BidStage.PRICING,
    BidStage.COMPLIANCE,
    BidStage.FINAL_REVIEW
  ];

  const currentOfficialIndex = stagesOrder.indexOf(bid.currentStage);
  const viewingIndex = stagesOrder.indexOf(viewingStage);
  const isPreviewingFuture = viewingIndex > currentOfficialIndex;

  useEffect(() => {
    if (navRef.current) {
      const activeBtn = navRef.current.querySelector('.active-stage-btn');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [viewingStage, bid.currentStage]);

  const remainingDays = useMemo(() => {
    if (!bid.deadline) return 0;
    const deadline = new Date(bid.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [bid.deadline]);

  const integrityScore = useMemo(() => {
    const weights = bid.integrityScoreBreakdown || { technicalWeight: 30, complianceWeight: 30, commercialWeight: 30, legalWeight: 10 };
    const techItems = bid.technicalQualificationChecklist || [];
    const compItems = bid.complianceChecklist || [];
    const finItems = bid.financialFormats || [];
    const techScore = techItems.length > 0 ? (techItems.filter(i => i.status === 'Complete').length / techItems.length) * weights.technicalWeight : weights.technicalWeight;
    const compScore = compItems.length > 0 ? (compItems.filter(i => i.status === 'Complete').length / compItems.length) * weights.complianceWeight : weights.complianceWeight;
    const commScore = finItems.length > 0 ? (finItems.filter(i => (i.unitPrice ?? 0) > 0).length / finItems.length) * weights.commercialWeight : 0;
    const legalScore = (bid.managementApprovalStatus === 'Approved' ? 1 : 0) * weights.legalWeight;
    return Math.round(techScore + compScore + commScore + legalScore);
  }, [bid]);

  const handleProgressStage = () => {
    const nextIdx = currentOfficialIndex + 1;
    if (nextIdx < stagesOrder.length) {
      const nextStage = stagesOrder[nextIdx];
      const newHistory: StageTransition[] = [
        ...(bid.stageHistory || []),
        { stage: nextStage, timestamp: new Date().toISOString() }
      ];
      onUpdate({ ...bid, currentStage: nextStage, stageHistory: newHistory });
      setViewingStage(nextStage);
    }
  };

  const moveViewingStage = (dir: 1 | -1) => {
    const next = stagesOrder[viewingIndex + dir];
    if (next) setViewingStage(next);
  };

  const formatSimpleDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
    hours = hours % 12 || 12;
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
  };

  const handleSetOutcome = (type: 'Won' | 'Lost') => {
    const updatedBid: BidRecord = {
      ...bid,
      status: type === 'Won' ? BidStatus.WON : BidStatus.LOST,
      competitionPricing: compPricing,
      keyLearnings: learnings
    };
    onUpdate(updatedBid);
    setShowOutcomeModal(null);
    onClose();
  };

  const handleSetNoBid = () => {
    if (!noBidCategory) return alert("Please select a reason category.");
    const updatedBid: BidRecord = {
      ...bid,
      status: BidStatus.NO_BID,
      noBidReasonCategory: noBidCategory,
      noBidReason: noBidCategory,
      noBidComments: noBidComments,
      noBidStage: bid.currentStage
    };
    onUpdate(updatedBid);
    setShowNoBidModal(false);
    onClose();
  };

  const runStrategicRiskAssessment = async () => {
    setIsEvaluatingStrategicRisk(true);
    try {
      const result = await generateStrategicRiskAssessment(bid);
      if (result) {
        onUpdate({ ...bid, strategicRiskAssessment: result });
      }
    } catch (err) {
      console.error("Strategic Risk Assessment Failed", err);
    } finally {
      setIsEvaluatingStrategicRisk(false);
    }
  };

  const runSolutionAnalysis = async (currentBidState?: BidRecord) => {
    const activeBid = currentBidState || bid;
    if (activeBid.technicalDocuments.length === 0) return;
    setIsAnalyzingSolution(true);
    try {
      const analysis = await analyzeSolutioningDocuments(activeBid, activeBid.technicalDocuments);
      onUpdate({ ...activeBid, solutioningAIAnalysis: analysis });
    } catch (err) {
      console.error("Solution analysis failed", err);
    } finally {
      setIsAnalyzingSolution(false);
    }
  };

  const handleBidSecurityUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzingBidSecurity(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const mimeType = file.type;
      try {
        const result = await analyzeBidSecurityDocument(
          base64,
          mimeType,
          bid.bidSecurity,
          bid.customerName,
          bid.tcvInclTax || 0
        );
        if (result) {
          const securityDoc: TechnicalDocument = {
            id: 'security-' + Date.now(),
            name: file.name,
            type: 'Bid Security Instrument',
            category: 'Compliance',
            uploadDate: new Date().toLocaleDateString(),
            tags: ['Bank Guarantee', 'Mandatory', result.isAmountCorrect ? 'Verified Amount' : 'Amount Error'],
            aiMatchDetails: JSON.stringify({
              bank: result.bankName,
              date: result.issuanceDate,
              amount: result.amount,
              beneficiary: result.beneficiaryName,
              isAmtOk: result.isAmountCorrect,
              isBenOk: result.isBeneficiaryCorrect,
              assessment: result.aiAssessment
            }),
            aiScore: result.isAmountCorrect && result.isBeneficiaryCorrect ? 100 : 50,
            fileData: base64
          };
          onUpdate({ ...bid, technicalDocuments: [...bid.technicalDocuments, securityDoc] });
        }
      } catch (err) {
        console.error("Bid security scan failed", err);
      } finally {
        setIsAnalyzingBidSecurity(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    if (category === 'BidSecurity') return handleBidSecurityUpload(e);

    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const isPDF = file.type === 'application/pdf';

      try {
        let updatedBid = { ...bid };
        if (category === 'Pricing') {
          const result = isPDF ? await analyzePricingDocument(base64, bid.contractDuration || "12 Months", bid.financialFormats || []) : null;
          if (result) {
            let updatedFormats: FinancialFormat[] = [];

            if (bid.financialFormats && bid.financialFormats.length > 0) {
              updatedFormats = bid.financialFormats.map(f => {
                const matched = result.populatedFinancialFormat?.find((pf: any) => pf.item === f.item || (pf.description && pf.description.includes(f.item)));
                if (matched) {
                  const up = matched.unitPrice ?? f.unitPrice ?? 0;
                  return { ...f, unitPrice: up, totalPrice: up * f.quantity };
                }
                return f;
              });
            } else if (result.populatedFinancialFormat && result.populatedFinancialFormat.length > 0) {
              updatedFormats = result.populatedFinancialFormat.map((pf: any) => ({
                item: pf.item || 'Discovered Item',
                description: pf.description || '',
                uom: pf.uom || 'Unit',
                quantity: pf.quantity || 1,
                unitPrice: pf.unitPrice || 0,
                totalPrice: (pf.unitPrice || 0) * (pf.quantity || 1)
              }));
            }

            const newDoc: TechnicalDocument = {
              id: 'asset-' + Date.now(),
              name: file.name,
              type: 'Pricing BOQ',
              category: 'Financial',
              uploadDate: new Date().toLocaleDateString(),
              tags: result.detectedTags || ['Pricing', 'BOQ'],
              fileData: base64
            };

            updatedBid = {
              ...bid,
              technicalDocuments: [...bid.technicalDocuments, newDoc],
              financialFormats: updatedFormats,
              tcvExclTax: result.tcvExclTax || updatedFormats.reduce((acc, f) => acc + (f.totalPrice || 0), 0),
              tcvInclTax: result.tcvInclTax || (result.tcvExclTax ? result.tcvExclTax * 1.17 : 0),
              vendorPaymentTerms: result.vendorPaymentTerms,
              contractDuration: result.contractDuration || bid.contractDuration,
              customerPaymentTerms: result.customerPaymentTerms || bid.customerPaymentTerms
            };
          }
        } else {
          const checklistItems = [
            ...(bid.complianceChecklist || []).map(c => ({ requirement: c.requirement, category: 'Compliance' })),
            ...(bid.technicalQualificationChecklist || []).map(t => ({ requirement: t.requirement, category: 'Technical' }))
          ];

          const result = isPDF ? await analyzeComplianceDocuments(bid.summaryRequirements, checklistItems, base64) : null;

          const newDoc: TechnicalDocument = {
            id: 'asset-' + Date.now(),
            name: file.name,
            type: 'PDF',
            category: category as any,
            uploadDate: new Date().toLocaleDateString(),
            aiScore: result?.confidenceScore,
            aiMatchDetails: result ? result.assessment : "Manual check needed.",
            tags: result?.detectedTags || [category, 'Asset'],
            fileData: base64
          };

          let updatedCompliance = [...(bid.complianceChecklist || [])];
          let updatedTechnical = [...(bid.technicalQualificationChecklist || [])];

          if (result?.updatedChecklist) {
            result.updatedChecklist.forEach((aiItem: any) => {
              const aiReq = (aiItem.requirement || "").toLowerCase().trim();
              const aiStatus = (aiItem.status || "").toLowerCase().trim();

              if (aiStatus === 'complete') {
                updatedCompliance = updatedCompliance.map(c =>
                  c.requirement.toLowerCase().trim() === aiReq
                    ? { ...c, status: 'Complete', aiComment: aiItem.aiComment || c.aiComment }
                    : c
                );
                updatedTechnical = updatedTechnical.map(t =>
                  t.requirement.toLowerCase().trim() === aiReq
                    ? { ...t, status: 'Complete', aiComment: aiItem.aiComment || t.aiComment }
                    : t
                );
              }
            });
          }

          updatedBid = {
            ...bid,
            technicalDocuments: [...bid.technicalDocuments, newDoc],
            complianceChecklist: updatedCompliance,
            technicalQualificationChecklist: updatedTechnical
          };
        }

        onUpdate(updatedBid);

        if (category === 'Technical' && !bid.solutioningAIAnalysis) {
          await runSolutionAnalysis(updatedBid);
        }

      } catch (err) {
        console.error("AI Analysis failed:", err);
      } finally {
        setIsAnalyzing(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const runFinalRiskAssessment = async () => {
    setIsEvaluatingRisk(true);
    try {
      const result = await generateFinalRiskAssessment(bid, bid.technicalDocuments);
      if (result) onUpdate({ ...bid, finalRiskAssessment: result });
    } catch (err) {
      console.error("Final Risk Assessment Failed", err);
    } finally {
      setIsEvaluatingRisk(false);
    }
  };

  const handleDownload = (doc: TechnicalDocument) => {
    if (!doc.fileData) return alert("Binary missing.");
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${doc.fileData}`;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAsset = () => {
    const updatedDocs = bid.technicalDocuments.filter(d => d.id !== deletingAssetId);
    onUpdate({ ...bid, technicalDocuments: updatedDocs });
    setDeletingAssetId(null);
  };

  const toggleItemStatus = (type: 'compliance' | 'technical', index: number) => {
    const field = type === 'compliance' ? 'complianceChecklist' : 'technicalQualificationChecklist';
    const updated = [...(bid[field] as any)];
    updated[index].status = updated[index].status === 'Complete' ? 'Pending' : 'Complete';
    onUpdate({ ...bid, [field]: updated });
  };

  const getTagColorClass = (tag: string) => {
    const colors = [
      'bg-blue-50 text-blue-500 border-blue-100',
      'bg-red-50 text-red-500 border-red-100',
      'bg-amber-50 text-amber-500 border-amber-100',
      'bg-emerald-50 text-emerald-500 border-emerald-100',
      'bg-purple-50 text-purple-500 border-purple-100',
      'bg-indigo-50 text-indigo-500 border-indigo-100',
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const securityDocs = useMemo(() => bid.technicalDocuments.filter(d => d.type === 'Bid Security Instrument'), [bid.technicalDocuments]);
  const latestSecurityDoc = securityDocs[securityDocs.length - 1];

  const securityData = useMemo(() => {
    if (!latestSecurityDoc?.aiMatchDetails) return null;
    try {
      return JSON.parse(latestSecurityDoc.aiMatchDetails);
    } catch (e) {
      return null;
    }
  }, [latestSecurityDoc]);

  return (
    <div className="flex h-screen bg-[#F1F5F9] overflow-hidden text-left">
      {Object.entries(refs).map(([key, ref]) => (
        <input
          key={key}
          type="file"
          ref={ref}
          onChange={(e) => handleFileUpload(e, key === 'bidSecurity' ? 'BidSecurity' : key.charAt(0).toUpperCase() + key.slice(1))}
          className="hidden"
          accept={key === 'bidSecurity' ? ".pdf,image/png,image/jpeg" : ".pdf"}
        />
      ))}
      <aside className={clsx("bg-[#1E3A5F] text-white transition-all duration-300 flex flex-col relative z-30 shadow-2xl shrink-0", sidebarCollapsed ? "w-16" : "w-80")}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 bg-[#D32F2F] text-white rounded-full shadow-md flex items-center justify-center border border-white/20 z-40 hover:scale-110 transition-transform cursor-pointer"
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
        <div className="p-6 border-b border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 bg-[#D32F2F] rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg"><Briefcase size={20} /></div>
          {!sidebarCollapsed && <div className="min-w-0"><h2 className="text-sm font-black uppercase tracking-tight truncate">{bid.projectName}</h2><p className="text-[10px] text-slate-400 font-bold truncate">{bid.customerName}</p></div>}
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={14} className="text-red-400" /> Current Bid Status</h4>
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div><p className="text-[9px] font-black text-red-200 uppercase tracking-widest">Official Phase</p><p className="text-sm font-black text-white">{bid.currentStage}</p></div>
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse"><Activity size={14} /></div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Strategic Brief</h4>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                {/* Scrollable Strategic Brief without changing card size */}
                <div className="max-h-[88px] overflow-y-auto scrollbar-hide pr-1 outline-none">
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    {bid.summaryRequirements || 'No summary.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">{(bid.requiredSolutions || []).map(s => <span key={s} className="px-2 py-0.5 bg-red-500/20 text-red-200 text-[8px] font-black uppercase rounded border border-red-500/30">{s}</span>)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Days Left</p>
                <div className={clsx(
                  "text-2xl font-black mb-1 transition-all",
                  remainingDays <= 3 ? "text-red-500 animate-pulse scale-110" : remainingDays <= 7 ? "text-amber-400" : "text-white"
                )}>
                  {remainingDays}
                </div>
                <p className="text-[8px] font-bold text-slate-500 uppercase">{bid.deadline}</p>
              </div>
              <StatBox label={bid.tcvExclTax ? "Bid Value" : "Est. Value"} value={`PKR ${((bid.tcvExclTax || bid.estimatedValue) / 1000000).toFixed(1)}M`} color="text-white" />
            </div>

            <div className="pt-4 mt-auto">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">JBC Manager</p>
                <p className="text-xs font-black text-slate-200">{bid.jbcName}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-20 shrink-0">
          <div className="flex items-center gap-6 overflow-hidden">
            <button
              onClick={onClose}
              className="w-10 h-10 bg-[#D32F2F] text-white flex items-center justify-center rounded-full transition-all hover:bg-red-700 shadow-md active:scale-90 shrink-0"
              title="Return to Repository"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="h-8 w-px bg-slate-100 shrink-0"></div>
            <nav ref={navRef} className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-2xl shrink-0">
              {stagesOrder.map((stage, idx) => {
                const isViewing = viewingStage === stage;
                const isDone = currentOfficialIndex > idx;
                return (
                  <button
                    key={stage}
                    onClick={() => setViewingStage(stage)}
                    className={clsx(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 group relative",
                      isViewing ? "bg-[#1E3A5F] text-white shadow-lg active-stage-btn" : isDone ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {isDone ? <CheckCircle2 size={12} /> : STAGE_ICONS[stage]} {stage}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {viewingStage === bid.currentStage && viewingStage !== BidStage.FINAL_REVIEW && (
              <button
                onClick={handleProgressStage}
                className="px-6 py-2.5 text-[10px] font-black text-white bg-emerald-600 rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
              >
                Finish Phase <CheckCircle2 size={14} />
              </button>
            )}

            <button
              onClick={() => setShowNoBidModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-white bg-red-600 rounded-xl uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-100"
            >
              No-Bid <Flag size={14} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide pb-60 text-left">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className={clsx("p-3 rounded-2xl shadow-sm text-white", isPreviewingFuture ? "bg-amber-500" : viewingIndex < currentOfficialIndex ? "bg-emerald-500" : "bg-[#D32F2F]")}>{STAGE_ICONS[viewingStage]}</div>
              <div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{viewingStage} Phase</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">{isPreviewingFuture ? "Preview Mode: Locked" : viewingIndex < currentOfficialIndex ? "Review Mode: Finished" : "Active Mode: Work in progress"}</p></div>
            </div>
          </div>

          {viewingStage !== BidStage.FINAL_REVIEW && (
            <>
              {viewingStage === BidStage.INTAKE && (
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <Info className="text-blue-500" size={20} />
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bid Brief & Scope</h3>
                    </div>
                    <div className="flex gap-2">
                      {(bid.requiredSolutions || []).map(s => (
                        <span key={s} className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-wider">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project Summary</h4>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{bid.summaryRequirements || 'No summary available.'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Scope of Work</h4>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed">{bid.scopeOfWork || 'No scope defined.'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-2 duration-500">
                <CompactChecklist title="General Compliance" items={bid.complianceChecklist || []} icon={<ShieldCheck className="text-blue-500" size={16} />} onToggle={(i) => !isPreviewingFuture && toggleItemStatus('compliance', i)} readOnly={isPreviewingFuture} />
                <CompactChecklist title="Technical Compliance" items={bid.technicalQualificationChecklist || []} icon={<CheckSquare className="text-amber-500" size={16} />} onToggle={(i) => !isPreviewingFuture && toggleItemStatus('technical', i)} readOnly={isPreviewingFuture} />
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl flex flex-col justify-center items-center text-center">
                  <div className="absolute top-0 right-0 p-6 opacity-5"><Sparkles size={80} /></div>
                  <div className="text-xs font-black uppercase text-slate-500 tracking-widest mb-2">Bid Integrity Index</div>
                  <div className="text-6xl font-black text-[#FFC107]">{integrityScore}%</div>
                </div>
              </div>
            </>
          )}

          <div className={clsx("space-y-12 transition-all duration-500", isPreviewingFuture && "opacity-60 pointer-events-none")}>

            {viewingStage === BidStage.COMPLIANCE && (
              <div className="space-y-10 animate-in fade-in duration-700">
                <StageSection title="Bid Security Verification" icon={<Banknote className="text-emerald-500" />}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div
                      onClick={() => refs.bidSecurity.current?.click()}
                      className="group bg-[#1E3A5F] rounded-[2.5rem] border-2 border-dashed border-white/20 p-10 text-center hover:border-[#FFC107] hover:bg-white/5 shadow-xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[460px]"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-10"><Landmark size={80} className="text-white" /></div>
                      <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all">
                        {isAnalyzingBidSecurity ? <Loader2 className="animate-spin text-[#FFC107]" size={36} /> : <FileUp size={36} className="text-[#FFC107]" />}
                      </div>
                      <h4 className="text-xl font-black text-white uppercase mb-2 tracking-tight group-hover:text-[#FFC107]">Upload Instrument</h4>
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-relaxed">PDF, PNG, JPG, JPEG</p>
                      <div className="mt-8 pt-8 border-t border-white/10 text-left">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">RFP Requirement</p>
                        <p className="text-xl font-black text-emerald-400 tracking-tight leading-tight">
                          {bid.bidSecurity}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-4 leading-relaxed font-bold uppercase tracking-widest">
                          Expected Beneficiary:<br />
                          <span className="text-slate-300 font-black">{bid.customerName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm relative flex flex-col justify-center overflow-hidden min-h-[460px]">
                      {latestSecurityDoc ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="flex items-center justify-between mb-2">
                            <div className={clsx(
                              "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 border shadow-sm",
                              latestSecurityDoc.aiScore === 100 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                            )}>
                              {latestSecurityDoc.aiScore === 100 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                              {latestSecurityDoc.aiScore === 100 ? "FULLY COMPLIANT" : "VALIDATION WARNING"}
                            </div>
                            <button onClick={() => handleDownload(latestSecurityDoc)} className="p-3 bg-slate-50 text-slate-400 hover:text-[#D32F2F] rounded-xl border border-slate-100 transition-all"><Download size={22} /></button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <InfoSlot label="Issuing Bank" value={securityData?.bank || 'Extracting...'} verified={true} />
                            <InfoSlot label="Instrument Date" value={securityData?.date || 'Extracting...'} verified={true} />
                          </div>

                          <div className="space-y-4">
                            <ComparisonRow
                              label="Beneficiary Entity"
                              extracted={securityData?.beneficiary}
                              required={bid.customerName}
                              verified={securityData?.isBenOk}
                            />
                            <ComparisonRow
                              label="Security Amount"
                              extracted={`PKR ${(securityData?.amount || 0).toLocaleString()}`}
                              required={bid.bidSecurity}
                              verified={securityData?.isAmtOk}
                            />
                          </div>

                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 relative group overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1E3A5F]"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Sparkles size={12} className="text-[#FFC107]" /> AI Logic Check</p>
                            <p className="text-[12px] font-bold text-slate-800 leading-relaxed italic">
                              {securityData?.assessment || "Verification logic complete. Recorded in portfolio."}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-20 opacity-30">
                          <ClipboardList size={64} className="mx-auto mb-6" />
                          <p className="text-lg font-black uppercase tracking-widest italic">Awaiting Instrument Scan...</p>
                          <p className="text-xs font-bold uppercase mt-2">Verified results will appear instantly</p>
                        </div>
                      )}
                    </div>
                  </div>
                </StageSection>

                <StageSection title="Regulatory & Compliance Assets" icon={<ShieldCheck className="text-blue-500" />}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <UploadPortal onClick={() => refs.compliance.current?.click()} title="Compliance Docs" desc="Legal & Tax Credentials" loading={isAnalyzing} icon={<ShieldCheck size={24} className="text-blue-500" />} />
                    <UploadPortal onClick={() => refs.annexure.current?.click()} title="Annexures" desc="RFP Specific Appendices" loading={isAnalyzing} icon={<FileBox size={24} className="text-amber-500" />} />
                    <UploadPortal onClick={() => refs.supporting.current?.click()} title="Supporting Docs" desc="Any other bid collateral" loading={isAnalyzing} icon={<Layers size={24} className="text-indigo-500" />} />
                  </div>
                </StageSection>
              </div>
            )}

            {viewingStage === BidStage.QUALIFICATION && (
              <StageSection title="Strategic Risk Assessment" icon={<ShieldAlert className="text-red-500" />}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Exposure Report</p>
                    <button onClick={runStrategicRiskAssessment} disabled={isEvaluatingStrategicRisk} className="px-5 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-900 flex items-center gap-2 transition-all disabled:opacity-50">
                      {isEvaluatingStrategicRisk ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Refresh Analysis
                    </button>
                  </div>
                  {bid.strategicRiskAssessment ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                      <div className="space-y-4 text-left">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identified Friction Points</h4>
                        <div className="space-y-3">
                          {bid.strategicRiskAssessment.risks.map((risk, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-6 rounded-[1.5rem] flex items-start gap-4">
                              <div className={clsx("w-2 h-2 rounded-full mt-1.5 shrink-0", risk.severity === RiskLevel.HIGH ? "bg-red-500 shadow-[0_0_8px_red]" : "bg-amber-500")}></div>
                              <div><p className="text-[10px] font-black text-slate-400 uppercase mb-1">{risk.category}</p><p className="text-sm font-black text-slate-700">{risk.description}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-red-50/30 border border-red-100 rounded-[2.5rem] p-8 text-left">
                        <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles size={14} /> AI Mitigation Plan</h4>
                        <div className="space-y-6">
                          {bid.strategicRiskAssessment.mitigations.map((step, idx) => (
                            <div key={idx} className="flex gap-4 items-start group">
                              <div className="p-2 bg-white rounded-lg shadow-sm text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all"><Zap size={14} /></div>
                              <p className="text-sm font-bold text-slate-700 leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50">
                      <ShieldAlert size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                      <button onClick={runStrategicRiskAssessment} className="text-[#D32F2F] font-black uppercase text-[10px] tracking-widest hover:underline">Start AI Scan</button>
                    </div>
                  )}
                </div>
              </StageSection>
            )}

            {viewingStage === BidStage.SOLUTIONING && (
              <StageSection title="Solutioning & Architecture" icon={<Zap className="text-amber-500" />}>
                <div className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <UploadPortal onClick={() => refs.technical.current?.click()} title="Technical Proposal" desc="Upload narrative & diagrams" loading={isAnalyzing} icon={<FileText size={24} className="text-blue-500" />} />
                    <UploadPortal onClick={() => refs.vendor.current?.click()} title="Vendor Quotes" desc="Upload OEM prices" loading={isAnalyzing} icon={<Briefcase size={24} className="text-[#D32F2F]" />} />
                  </div>
                  <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Target className="text-[#FFC107]" /> AI Alignment Check</h4>
                      <button onClick={() => runSolutionAnalysis()} disabled={isAnalyzingSolution || bid.technicalDocuments.length === 0} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase border border-white/10 transition-all disabled:opacity-50">
                        {isAnalyzingSolution ? <Loader2 size={14} className="animate-spin" /> : "Re-Run Check"}
                      </button>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-8 min-h-[120px] max-h-[350px] overflow-y-auto scrollbar-hide text-left">
                      {isAnalyzingSolution ? <div className="flex flex-col items-center justify-center py-10 gap-3"><Loader2 className="animate-spin text-[#FFC107]" size={24} /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Checking alignment...</p></div> : bid.solutioningAIAnalysis ? <div className="space-y-4">{bid.solutioningAIAnalysis.split('\n').filter(l => l.trim()).map((line, i) => (<div key={i} className="flex gap-4 items-start"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#FFC107] shrink-0 shadow-[0_0_8px_#FFC107]"></div><p className="text-sm font-medium text-slate-200">{line.replace(/^[•\-\*]\s*/, '')}</p></div>))}</div> : <p className="text-center py-10 opacity-30 text-xs font-black uppercase italic">Upload technical docs for automatic analysis</p>}
                    </div>
                  </div>
                </div>
              </StageSection>
            )}

            {viewingStage === BidStage.PRICING && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <StageSection title="Commercial Modeling" icon={<Calculator className="text-indigo-500" />}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryItem label="Total (Excl. Tax)" value={`PKR ${(bid.tcvExclTax || 0).toLocaleString()}`} />
                        <SummaryItem label="Total (Incl. Tax)" value={bid.tcvInclTax ? `PKR ${bid.tcvInclTax.toLocaleString()}` : '—'} color="text-emerald-600" />
                        <SummaryItem label="Duration" value={bid.contractDuration || "N/A"} />
                        <SummaryItem label="Payment (Days)" value={bid.customerPaymentTerms || "N/A"} />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 text-left">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Price Breakdown</h4>
                        <div className="space-y-4">
                          {(bid.financialFormats || []).map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-4"><div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><FileSpreadsheet size={14} /></div><div className="flex flex-col"><span className="text-xs font-black text-slate-700">{f.item}</span><span className="text-[9px] text-slate-400 font-bold uppercase">{f.uom || 'UNIT'}</span></div></div>
                              <div className="flex gap-10">
                                <div className="text-center"><p className="text-[8px] text-slate-400 font-black uppercase">Qty</p><p className="text-xs font-black">{f.quantity}</p></div>
                                <div className="text-center"><p className="text-[8px] text-slate-400 font-black uppercase">Unit Price</p><p className="text-xs font-black text-blue-600">{f.unitPrice ? `PKR ${f.unitPrice.toLocaleString()}` : '—'}</p></div>
                                <div className="text-center"><p className="text-[8px] text-slate-400 font-black uppercase">Total</p><p className="text-xs font-black">{f.totalPrice ? `PKR ${f.totalPrice.toLocaleString()}` : '—'}</p></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#1E3A5F] rounded-[2.5rem] p-8 text-white text-left">
                      <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles size={16} className="text-[#FFC107]" /> Pricing Tool</h4>
                      <p className="text-[10px] text-slate-400 mb-8 leading-relaxed font-medium">AI will extract commercial schedules and auto-calculate TCV.</p>
                      <button onClick={() => refs.pricing.current?.click()} className="w-full py-4 bg-[#D32F2F] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-3">{isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />} Upload Price Sheet</button>
                    </div>
                  </div>
                </StageSection>

                <StageSection title="Internal Clearances" icon={<ShieldCheck className="text-emerald-500" />}>
                  <div className="space-y-8 text-left">
                    <div className="max-w-md">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Assigned Authority</label>
                      <div className="relative group">
                        <select value={bid.approvingAuthorityRole || ''} onChange={(e) => onUpdate({ ...bid, approvingAuthorityRole: e.target.value as ApprovingAuthorityRole, pricingApprovalStatus: 'Pending' })} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 text-sm font-black text-slate-900 focus:outline-none appearance-none cursor-pointer transition-all shadow-sm">
                          <option value="" disabled>Select Authority...</option>
                          <option value="Manager Finance">Manager Finance</option>
                          <option value="CFO">CFO</option>
                          <option value="CBO">CBO</option>
                          <option value="PriceCo">PriceCo</option>
                        </select>
                        <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    {bid.approvingAuthorityRole && (
                      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-6"><div className="p-5 bg-white rounded-[1.5rem] shadow-sm text-blue-500 border border-slate-100"><UserCheck size={32} /></div><div><h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{bid.approvingAuthorityRole}</h4><p className="text-xs text-slate-500 font-medium">Mandatory bid sign-off stakeholder.</p></div></div>
                        <div className="flex gap-4"><button onClick={() => onUpdate({ ...bid, pricingApprovalStatus: 'Submitted', approvalRequestedDate: new Date().toISOString() })} disabled={bid.pricingApprovalStatus !== 'Pending'} className="px-8 py-4 bg-[#1E3A5F] text-white text-xs font-black uppercase rounded-2xl shadow-xl hover:bg-slate-900 transition-all disabled:opacity-50">Submit Request</button><button onClick={() => onUpdate({ ...bid, pricingApprovalStatus: 'Approved', managementApprovalDate: new Date().toISOString() })} disabled={bid.pricingApprovalStatus !== 'Submitted'} className="px-8 py-4 bg-emerald-600 text-white text-xs font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50">Confirm Approval</button></div>
                      </div>
                    )}
                  </div>
                </StageSection>
              </div>
            )}

            {viewingStage === BidStage.FINAL_REVIEW && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="max-w-2xl mx-auto py-10 text-center space-y-10">
                  {bid.status === BidStatus.SUBMITTED ? (
                    <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-200 border-t-8 border-t-emerald-500"><div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8"><CheckCircle2 size={56} /></div><h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Bid Submitted</h3><p className="text-slate-500 font-black tracking-widest uppercase text-[11px] mt-4">Recorded: {formatSimpleDate(bid.submissionDate)}</p><div className="mt-12 pt-10 border-t border-slate-100 flex flex-col items-center gap-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Decision</p><div className="flex items-center gap-4 w-full"><button onClick={() => setShowOutcomeModal('Won')} className="flex-1 flex items-center justify-center gap-3 px-8 py-5 text-xs font-black text-white bg-emerald-600 rounded-3xl uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-100">Bid Won <Trophy size={18} /></button><button onClick={() => setShowOutcomeModal('Lost')} className="flex-1 flex items-center justify-center gap-3 px-8 py-5 text-xs font-black text-slate-600 bg-white border border-slate-200 rounded-3xl uppercase tracking-widest hover:bg-slate-50 shadow-sm">Bid Lost <ThumbsDown size={18} /></button></div></div></div>
                  ) : bid.status === BidStatus.WON || bid.status === BidStatus.LOST || bid.status === BidStatus.NO_BID ? (
                    <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-200 border-t-8 border-t-slate-800"><div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-8">{bid.status === BidStatus.WON ? <Trophy size={56} className="text-emerald-500" /> : <ThumbsDown size={56} className="text-red-500" />}</div><h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Bid Closed</h3><p className="text-slate-500 font-black tracking-widest uppercase text-[11px] mt-4">Status: {bid.status}</p></div>
                  ) : (
                    <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-200"><div className="w-24 h-24 bg-red-50 text-[#D32F2F] rounded-full flex items-center justify-center mx-auto mb-8"><Send size={48} /></div><h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Governance Sign-Off</h3><button onClick={() => onUpdate({ ...bid, status: BidStatus.SUBMITTED, submissionDate: new Date().toISOString() })} className="w-full bg-[#D32F2F] text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-[#B71C1C] transition-all text-xs uppercase tracking-widest">Confirm & Submit Bid</button></div>
                  )}
                </div>
                <StageSection title="Final Readiness Scan" icon={<ShieldAlert className="text-red-500" />}>
                  <div className="space-y-6 text-left"><button onClick={runFinalRiskAssessment} disabled={isEvaluatingRisk} className="px-10 py-4 bg-[#D32F2F] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto disabled:opacity-50">{isEvaluatingRisk ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} Scan Readiness</button>{bid.finalRiskAssessment && (<div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100"><h4 className="text-sm font-black text-red-600 uppercase tracking-widest mb-6">Open Risks</h4><ul className="space-y-3">{bid.finalRiskAssessment.risks.map((r, i) => <li key={i} className="text-xs font-bold text-red-800 flex gap-2"><AlertCircle size={12} className="shrink-0 mt-0.5" /> {r}</li>)}</ul></div><div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100"><h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6">Mitigation Fixes</h4><ul className="space-y-3">{bid.finalRiskAssessment.mitigations.map((m, i) => <li key={i} className="text-xs font-bold text-emerald-800 flex gap-2"><CheckCircle2 size={12} className="shrink-0 mt-0.5" /> {m}</li>)}</ul></div></div>)}</div>
                </StageSection>
              </div>
            )}
          </div>

          <div className="mt-20 pt-10 border-t border-slate-200 animate-in fade-in duration-1000">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3"><Archive className="text-slate-400" size={24} /><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bid Assets Portfolio</h3></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
              {bid.technicalDocuments.map(doc => (
                <div key={doc.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 hover:border-[#D32F2F] transition-all group shadow-sm flex flex-col h-full text-left">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:text-[#D32F2F] transition-all"><FileText size={20} /></div>
                    <div className="min-w-0 flex-1"><h5 className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{doc.name}</h5><p className="text-[9px] text-slate-400 font-bold mt-0.5">{doc.type} • {doc.uploadDate}</p></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
                      {(doc.tags || []).map((tag, idx) => (
                        <span key={idx} className={clsx("px-2 py-0.5 text-[9px] font-black uppercase rounded border transition-all hover:scale-105", getTagColorClass(tag))}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-50">
                    <span className="text-[9px] font-black text-emerald-500 uppercase">{doc.aiScore ? `${doc.aiScore}% Match` : 'Verified'}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleDownload(doc)} className="p-2 text-slate-300 hover:text-blue-600 rounded-lg transition-all"><Download size={14} /></button>
                      <button onClick={() => setDeletingAssetId(doc.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-lg transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[30] flex gap-4 items-center">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-2 rounded-full shadow-2xl flex items-center gap-2">
            <button onClick={() => moveViewingStage(-1)} disabled={viewingIndex === 0} className="p-4 bg-white text-slate-600 rounded-full hover:bg-slate-50 disabled:opacity-30 border border-slate-100 shadow-sm transition-all"><ChevronLeft size={18} /></button>
            <div className="px-10 flex flex-col items-center min-w-[200px]"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Phase {viewingIndex + 1}</span><span className="text-sm font-black text-slate-900 uppercase tracking-tighter">{viewingStage}</span></div>
            <button onClick={() => moveViewingStage(1)} disabled={viewingIndex === stagesOrder.length - 1} className="p-4 bg-[#1E3A5F] text-white rounded-full hover:bg-slate-900 disabled:opacity-30 shadow-lg active:scale-95 transition-all"><ChevronRight size={18} /></button>
          </div>
        </div>
      </main>
      <FloatingAIChat bid={bid} />

      {showNoBidModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-red-50 text-red-500 rounded-3xl"><Flag size={32} /></div>
              <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No-Bid Record</h3><p className="text-sm font-medium text-slate-500">Provide reason for strategic rejection.</p></div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Category</label>
                <div className="relative group">
                  <select value={noBidCategory} onChange={(e) => setNoBidCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none appearance-none transition-all">
                    <option value="" disabled>Select Reason...</option>
                    {COMMON_NO_BID_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-10">
              <button onClick={() => setShowNoBidModal(false)} className="py-4 rounded-2xl border border-slate-200 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleSetNoBid} className="py-4 rounded-2xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-700 transition-all">Confirm No-Bid</button>
            </div>
          </div>
        </div>
      )}

      {showOutcomeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className={clsx("p-4 rounded-3xl", showOutcomeModal === 'Won' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                {showOutcomeModal === 'Won' ? <Award size={32} /> : <ThumbsDown size={32} />}
              </div>
              <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Bid Outcome: {showOutcomeModal}</h3><p className="text-sm font-medium text-slate-500">Record learnings.</p></div>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Learnings</label>
                <textarea value={learnings} onChange={e => setLearnings(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm font-medium outline-none transition-all" placeholder="Notes..." rows={4} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-10">
              <button onClick={() => setShowOutcomeModal(null)} className="py-4 rounded-2xl border border-slate-200 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={() => handleSetOutcome(showOutcomeModal)} className={clsx("py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl transition-all", showOutcomeModal === 'Won' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-red-600 hover:bg-red-700 shadow-red-100")}>Save Outcome</button>
            </div>
          </div>
        </div>
      )}

      {deletingAssetId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-sm p-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Delete File?</h3>
            <div className="grid grid-cols-2 gap-4 mt-10">
              <button onClick={() => setDeletingAssetId(null)} className="py-4 bg-slate-100 text-slate-500 font-black uppercase text-[10px] rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={handleDeleteAsset} className="py-4 bg-red-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-red-700 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ComparisonRow: React.FC<{ label: string; extracted?: string; required: string; verified?: boolean }> = ({ label, extracted, required, verified }) => (
  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 group transition-all hover:bg-white hover:shadow-md">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      {verified !== undefined && (
        <div className={clsx("w-5 h-5 rounded-full flex items-center justify-center shadow-sm", verified ? "bg-emerald-500" : "bg-red-500")}>
          {verified ? <CheckCircle2 size={12} className="text-white" /> : <XCircle size={12} className="text-white" />}
        </div>
      )}
    </div>
    <div className="grid grid-cols-2 gap-6 divide-x divide-slate-200">
      <div className="pr-2">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Found on Instrument</p>
        <p className={clsx("text-xs font-black truncate", verified ? "text-emerald-700" : "text-slate-900")}>{extracted || 'Not detected'}</p>
      </div>
      <div className="pl-6">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target in RFP</p>
        <p className="text-xs font-black text-slate-900 truncate">{required}</p>
      </div>
    </div>
  </div>
);

const InfoSlot: React.FC<{ label: string; value: string; verified?: boolean; highlight?: boolean }> = ({ label, value, verified, highlight }) => (
  <div className={clsx(
    "p-5 rounded-2xl border flex flex-col justify-center transition-all",
    highlight ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-slate-50 border-slate-100"
  )}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      {verified !== undefined && (
        <div className={clsx("w-4 h-4 rounded-full flex items-center justify-center shadow-sm", verified ? "bg-emerald-500" : "bg-red-500")}>
          {verified ? <CheckCircle2 size={12} className="text-white" /> : <XCircle size={12} className="text-white" />}
        </div>
      )}
    </div>
    <p className={clsx("text-sm font-black uppercase tracking-tight truncate", highlight ? "text-[#FFC107]" : "text-slate-900")}>{value}</p>
  </div>
);

const CompactChecklist: React.FC<{ title: string; items: any[]; icon: React.ReactNode; onToggle: (idx: number) => void; readOnly?: boolean; }> = ({ title, items, icon, onToggle, readOnly }) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm flex flex-col h-[320px]">
    <div className="flex items-center gap-3 mb-6 px-2">{icon}<h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{title}</h3><span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded uppercase">{items.filter(i => i.status === 'Complete').length}/{items.length}</span></div>
    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
      {items.map((item, i) => (
        <div key={i} onClick={() => !readOnly && onToggle(i)} className={clsx("p-4 rounded-2xl border transition-all flex items-start gap-3", !readOnly && "cursor-pointer hover:border-slate-300", item.status === 'Complete' ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-100")}>
          <div className={clsx("w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all", item.status === 'Complete' ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 bg-white")}>{item.status === 'Complete' && <CheckCircle2 size={12} />}</div>
          <div className="min-w-0 text-left"><p className={clsx("text-[11px] font-bold leading-tight uppercase tracking-tight", item.status === 'Complete' ? "text-emerald-700" : "text-slate-800")}>{item.requirement}</p>{item.aiComment && <p className="text-[9px] text-slate-400 mt-1 italic line-clamp-1">{item.aiComment}</p>}</div>
        </div>
      ))}
    </div>
  </div>
);

const StageSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
    <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4 text-left">
      <div className="p-3 bg-white rounded-2xl shadow-sm">{icon}</div>
      <div><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{title}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Governance Point</p></div>
    </div>
    <div className="p-10">{children}</div>
  </div>
);

const SummaryItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = "text-slate-900" }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[100px]">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">{label}</p>
    <p className={clsx("text-sm font-black truncate max-w-full px-2 text-center", color)}>{value}</p>
  </div>
);

const UploadPortal: React.FC<{ onClick: () => void; title: string; desc: string; loading?: boolean; icon: React.ReactNode }> = ({ onClick, title, desc, loading, icon }) => (
  <div onClick={onClick} className="group bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-10 text-center hover:border-[#D32F2F] hover:bg-red-50/20 shadow-sm transition-all cursor-pointer active:scale-95">
    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white transition-all shadow-inner">{loading ? <Loader2 className="animate-spin text-[#D32F2F]" size={32} /> : icon}</div>
    <h4 className="text-lg font-black text-slate-900 uppercase mb-2 tracking-tight group-hover:text-red-700">{title}</h4>
    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">{desc}</p>
  </div>
);

const StatBox: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={clsx("text-sm font-black truncate", color)}>{value}</p>
  </div>
);

export default BidLifecycle;
