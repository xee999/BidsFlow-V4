import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ArrowLeft, ChevronRight, ChevronLeft, ShieldAlert, FileUp, Zap, Info,
  CheckCircle2, Loader2, FileText, ShieldCheck, CheckSquare, CreditCard,
  UserCheck, Clock, AlertTriangle, Sparkles, XCircle, Download, Trophy,
  Target, ThumbsDown, ChevronDown, Send, RefreshCw, AlertCircle,
  FileSpreadsheet, Package, BadgeDollarSign, Plus, Briefcase, Layers,
  FileBox, ClipboardList, FileSearch, FileBadge, ExternalLink, Filter,
  Activity, Calculator, Lock, Archive, Tag, Trash2, Flag, Award, ThumbsUp,
  MapPin, Banknote, Landmark, StickyNote, X
} from 'lucide-react';
import { BidRecord, BidStage, BidStatus, TechnicalDocument, StageTransition, ComplianceItem, QualificationItem, RiskLevel, FinancialFormat, ApprovingAuthorityRole, ActivityLog, User } from '../types.ts';
import { STAGE_ICONS } from '../constants.tsx';
import { convertToDays, convertToYears, sanitizeDateValue, sanitizeTimeValue } from '../services/utils.ts';
import JSZip from 'jszip';
import { analyzePricingDocument, analyzeComplianceDocuments, generateFinalRiskAssessment, generateStrategicRiskAssessment, analyzeSolutioningDocuments, analyzeBidSecurityDocument, tagTechnicalDocuments, analyzeBidDocument } from '../services/gemini.ts';
import FloatingAIChat from './FloatingAIChat.tsx';
import { clsx } from 'clsx';
import { auditActions } from '../services/auditService.ts';
import BidLifecycleSidebar from './bid-lifecycle/BidLifecycleSidebar';
import BidLifecycleHeader from './bid-lifecycle/BidLifecycleHeader';
import NoBidModal from './bid-lifecycle/NoBidModal';
import OutcomeModal from './bid-lifecycle/OutcomeModal';
import DeleteAssetModal from './bid-lifecycle/DeleteAssetModal';
import MentionInput from './MentionInput';
import { userService } from '../services/authService.ts';

interface BidLifecycleProps {
  bid: BidRecord;
  onUpdate: (updatedBid: BidRecord) => void;
  onClose: () => void;
  userRole?: string;
  addAuditLog?: (log: ActivityLog) => void;
  currentUser?: User;
  onEditIntake?: () => void;
}

// Phase weights by complexity (total = 100%)
// Compliance reduced per team feedback: High=1.5d, Medium=1d, Low=0.5d (on ~20d bid)
// Saved time added to Solutioning
const PHASE_WEIGHTS: Record<string, Record<string, number>> = {
  High: { Intake: 0.01, Qualification: 0.05, Solutioning: 0.605, Pricing: 0.25, Compliance: 0.075, 'Final Review': 0.02 },
  Medium: { Intake: 0.02, Qualification: 0.08, Solutioning: 0.58, Pricing: 0.25, Compliance: 0.05, 'Final Review': 0.02 },
  Low: { Intake: 0.05, Qualification: 0.10, Solutioning: 0.555, Pricing: 0.25, Compliance: 0.025, 'Final Review': 0.02 }
};

// Calculate target days for each phase based on available time and complexity
// Rounds to 0.5 day increments (e.g., 1, 1.5, 2, 2.5)
const calculatePhaseTargets = (deadline: string, receivedDate: string, complexity: string = 'Medium'): Record<string, number> => {
  const deadlineDate = new Date(deadline);
  const startDate = new Date(receivedDate);
  deadlineDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  // T-2: Reserve 2 days before deadline (1 for final review buffer + 1 for submission)
  const availableDays = Math.max(1, Math.ceil((deadlineDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) - 2);
  const weights = PHASE_WEIGHTS[complexity] || PHASE_WEIGHTS.Medium;
  const targets: Record<string, number> = {};
  for (const [stage, weight] of Object.entries(weights)) {
    // Round to nearest 0.5
    const rawDays = availableDays * weight;
    targets[stage] = Math.max(0.5, Math.round(rawDays * 2) / 2);
  }
  return targets;
};

// Calculate elapsed days in current phase
const getPhaseElapsedDays = (stageHistory: { stage: string; timestamp: string }[], currentStage: string): number => {
  const entry = stageHistory.find(h => h.stage === currentStage);
  if (!entry) return 0;
  const startDate = new Date(entry.timestamp);
  const now = new Date();
  return Math.max(0, parseFloat(((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)).toFixed(1)));
};

// Determine timing status
const getTimingStatus = (elapsed: number, target: number): { status: 'ahead' | 'on-track' | 'behind'; color: string } => {
  const diff = elapsed - target;
  if (diff <= -0.5) return { status: 'ahead', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  if (diff <= 0.5) return { status: 'on-track', color: 'bg-amber-50 text-amber-600 border-amber-200' };
  return { status: 'behind', color: 'bg-red-50 text-red-600 border-red-200' };
};

const BidLifecycle: React.FC<BidLifecycleProps> = ({ bid, onUpdate, onClose, userRole, addAuditLog, currentUser, onEditIntake }) => {
  const [viewingStage, setViewingStage] = useState<BidStage>(bid.currentStage);
  const [showNoBidModal, setShowNoBidModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState<'Won' | 'Lost' | null>(null);

  const [noBidCategory, setNoBidCategory] = useState("");
  const [noBidComments, setNoBidComments] = useState("");
  const [compPricing, setCompPricing] = useState("");
  const [learnings, setLearnings] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingBidSecurity, setIsAnalyzingBidSecurity] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<string | null>(null);
  const [isSolutioningAIRunning, setIsSolutioningAIRunning] = useState(false);
  const [isEvaluatingRisk, setIsEvaluatingRisk] = useState(false);
  const [isEvaluatingStrategicRisk, setIsEvaluatingStrategicRisk] = useState(false);
  const [isAnalyzingSolution, setIsAnalyzingSolution] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Fetch users for @mention dropdown
  useEffect(() => {
    userService.getAll()
      .then(users => setAllUsers(users))
      .catch(err => console.warn('Failed to load users for mentions:', err));
  }, []);

  const navRef = useRef<HTMLDivElement>(null);
  const refs = {
    technical: useRef<HTMLInputElement>(null),
    vendor: useRef<HTMLInputElement>(null),
    pricing: useRef<HTMLInputElement>(null),
    compliance: useRef<HTMLInputElement>(null),
    annexure: useRef<HTMLInputElement>(null),
    supporting: useRef<HTMLInputElement>(null),
    bidSecurity: useRef<HTMLInputElement>(null),
    preBidDate: useRef<HTMLInputElement>(null),
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
      const prevStage = bid.currentStage;
      const nextStage = stagesOrder[nextIdx];
      const newHistory: StageTransition[] = [
        ...(bid.stageHistory || []),
        { stage: nextStage, timestamp: new Date().toISOString() }
      ];
      onUpdate({ ...bid, currentStage: nextStage, stageHistory: newHistory });
      setViewingStage(nextStage);

      // Log stage transition
      if (addAuditLog && currentUser) {
        const log = auditActions.stageChanged(
          currentUser.name,
          currentUser.role,
          bid.projectName,
          bid.id,
          prevStage,
          nextStage
        );
        addAuditLog(log);
      }
    }
  };

  const moveViewingStage = (dir: 1 | -1) => {
    const next = stagesOrder[viewingIndex + dir];
    if (next) setViewingStage(next);
  };

  const formatSimpleDate = (isoString?: string) => {
    if (!isoString || isoString === 'N/A' || isoString === 'null') return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
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
    setIsAnalyzing(true);
    setIsAnalyzingBidSecurity(true);
    setScanningStatus("Analyzing Bid Security...");
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
              date: sanitizeDateValue(result.issuanceDate),
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
        setIsAnalyzing(false);
        setScanningStatus(null);
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
    setScanningStatus("Initializing...");

    // ZIP Extraction Logic for Bulk Upload
    if (file.name.toLowerCase().endsWith('.zip')) {
      try {
        const zip = await JSZip.loadAsync(file);
        let extractedDocs: TechnicalDocument[] = [];

        const zipEntries = Object.entries(zip.files).filter(([name, entry]) =>
          !entry.dir &&
          name.toLowerCase().endsWith('.pdf') &&
          !name.includes('__MACOSX') &&
          !name.split('/').pop()?.startsWith('._')
        );

        if (zipEntries.length === 0) {
          alert("No PDF files found in the ZIP folder.");
          setIsAnalyzing(false);
          setScanningStatus(null);
          return;
        }

        setScanningStatus(`Extracting ${zipEntries.length} files...`);

        for (const [filename, fileObj] of zipEntries) {
          const base64 = await fileObj.async('base64');
          extractedDocs.push({
            id: 'asset-' + crypto.randomUUID(),
            name: filename.split('/').pop() || filename,
            type: 'PDF',
            category: category as any,
            uploadDate: new Date().toLocaleDateString(),
            fileData: base64, // Ensure base64 is populated for AI
            tags: [category, 'ZIP-Extracted']
          });
        }

        if (extractedDocs.length > 0) {
          // 1. Immediate Update: Show files to user
          let currentBidDocs = [...bid.technicalDocuments, ...extractedDocs];

          // Smart Tagging (Optimistic Update)
          setScanningStatus("AI Tagging...");
          try {
            const tagResult = await tagTechnicalDocuments(extractedDocs);
            if (tagResult?.taggedFiles) {
              currentBidDocs = currentBidDocs.map(doc => {
                const newInfo = extractedDocs.find(d => d.name === doc.name); // only update new ones
                if (!newInfo) return doc; // existing

                const info = tagResult.taggedFiles.find((f: any) => f.fileName === doc.name);
                return info ? { ...doc, tags: [...(info.tags || []), 'AI-Tagged'], summary: info.summary } : doc;
              });
            }
          } catch (e) {
            console.warn("Tagging failed, proceeding with extraction.");
          }

          const updatedDocsBid = { ...bid, technicalDocuments: currentBidDocs };
          onUpdate(updatedDocsBid); // First update to show files

          // 2. Deep Analysis: Checklist Mapping
          setScanningStatus("Deep Scanning (Gemini 1.5 Pro)...");
          const checklistItems = [
            ...(bid.complianceChecklist || []).map(c => ({ id: c.id, requirement: c.requirement, category: 'Compliance' })),
            ...(bid.technicalQualificationChecklist || []).map(t => ({ id: t.id, requirement: t.requirement, category: 'Technical' }))
          ];

          // If checklists are empty, try to find an RFP/Tender document in the zip to extract them
          if (checklistItems.length === 0) {
            setScanningStatus("Detecting RFP for Checklist Extraction...");
            const rfpFile = extractedDocs.find(d =>
              d.name.toLowerCase().includes('rfp') ||
              d.name.toLowerCase().includes('tender') ||
              d.name.toLowerCase().includes('solicitation') ||
              d.name.toLowerCase().includes('agreement')
            ) || extractedDocs[0]; // Fallback to first file

            if (rfpFile && rfpFile.fileData) {
              try {
                const extraction = await analyzeBidDocument(rfpFile.name, rfpFile.fileData);
                if (extraction) {
                  const newComp = (extraction.complianceList || []).map((item: any, idx: number) => ({
                    id: `comp-zip-${Date.now()}-${idx}`,
                    requirement: item.requirement,
                    status: 'Pending',
                    isMandatory: item.isMandatory,
                    aiComment: item.description
                  }));
                  const newTech = (extraction.technicalQualificationChecklist || []).map((item: any, idx: number) => ({
                    id: `qual-zip-${Date.now()}-${idx}`,
                    requirement: item.requirement,
                    type: (item.type || 'Mandatory') as any,
                    status: 'Pending',
                    aiComment: item.aiComment
                  }));

                  // Update local list for deep scanning
                  checklistItems.push(...newComp.map((c: any) => ({ id: c.id, requirement: c.requirement, category: 'Compliance' })));
                  checklistItems.push(...newTech.map((t: any) => ({ id: t.id, requirement: t.requirement, category: 'Technical' })));

                  // Update bid state for next step
                  updatedDocsBid.complianceChecklist = newComp;
                  updatedDocsBid.technicalQualificationChecklist = newTech;
                  updatedDocsBid.summaryRequirements = extraction.summaryRequirements || updatedDocsBid.summaryRequirements;
                  updatedDocsBid.scopeOfWork = extraction.scopeOfWork || updatedDocsBid.scopeOfWork;
                }
              } catch (e) {
                console.warn("Checklist extraction from zip failed", e);
              }
            }
          }

          if (checklistItems.length > 0) {
            const criteria = bid.summaryRequirements || `Compliance evaluation for ${bid.projectName} with ${bid.customerName}.`;
            // USE extractedDocs explicitly to ensure they are scanned if total docs is large? 
            // Better to use currentBidDocs which contains everything.
            const complianceResult = await analyzeComplianceDocuments(criteria, checklistItems, currentBidDocs);

            if (complianceResult?.updatedChecklist) {

              let updatedCompliance = [...(bid.complianceChecklist || [])];
              let updatedTechnical = [...(bid.technicalQualificationChecklist || [])];

              complianceResult.updatedChecklist.forEach((aiItem: any) => {
                if (aiItem.status === 'Complete' && aiItem.id) {
                  const complianceIdx = updatedCompliance.findIndex(c => c.id === aiItem.id);
                  const technicalIdx = updatedTechnical.findIndex(t => t.id === aiItem.id);



                  if (complianceIdx !== -1) {
                    updatedCompliance[complianceIdx] = { ...updatedCompliance[complianceIdx], status: 'Complete', aiComment: aiItem.aiComment };
                  }
                  if (technicalIdx !== -1) {
                    updatedTechnical[technicalIdx] = { ...updatedTechnical[technicalIdx], status: 'Complete', aiComment: aiItem.aiComment };
                  }
                }
              });

              const finalBid = {
                ...updatedDocsBid, // Use the bid with docs
                complianceChecklist: updatedCompliance,
                technicalQualificationChecklist: updatedTechnical
              };
              onUpdate(finalBid); // Second update with checklist status
              if (category === 'Technical') await runSolutionAnalysis(finalBid);
            }
          }
        }
      } catch (err) {
        console.error("ZIP Extraction Error:", err);
        alert("Failed to process ZIP file.");
      } finally {
        setIsAnalyzing(false);
        setScanningStatus(null);
        if (e.target) e.target.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const isPDF = file.type === 'application/pdf';

      try {
        let updatedBid = { ...bid };
        if (category === 'Pricing') {
          setScanningStatus("Analyzing Pricing Proposal...");
          const result = await analyzePricingDocument(base64, bid.contractDuration || "365", bid.financialFormats || [], file.type);
          if (result) {
            let updatedFormats: FinancialFormat[] = [];

            if (bid.financialFormats && bid.financialFormats.length > 0) {
              const existingFormats = [...bid.financialFormats];
              const aiItems = result.populatedFinancialFormat || [];

              // 1. Update existing items
              updatedFormats = existingFormats.map(f => {
                const matched = aiItems.find((pf: any) =>
                  (pf.item && pf.item.toLowerCase().trim() === f.item.toLowerCase().trim()) ||
                  (pf.description && pf.description.toLowerCase().includes(f.item.toLowerCase().trim()))
                );
                if (matched) {
                  const up = matched.unitPrice ?? f.unitPrice ?? 0;
                  return { ...f, unitPrice: up, totalPrice: up * f.quantity };
                }
                return f;
              });

              // 2. Append new items discovered by AI
              aiItems.forEach((pf: any) => {
                const isNew = !updatedFormats.some(f =>
                  (pf.item && pf.item.toLowerCase().trim() === f.item.toLowerCase().trim()) ||
                  (pf.description && pf.description.toLowerCase().includes(f.item.toLowerCase().trim()))
                );
                if (isNew) {
                  updatedFormats.push({
                    item: pf.item || 'New Item',
                    description: pf.description || '',
                    uom: pf.uom || 'Unit',
                    quantity: pf.quantity || 1,
                    unitPrice: pf.unitPrice || 0,
                    totalPrice: (pf.unitPrice || 0) * (pf.quantity || 1)
                  });
                }
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

            const totalExcl = updatedFormats.reduce((acc, f) => acc + (f.totalPrice || 0), 0);

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
              tcvExclTax: totalExcl,
              tcvInclTax: totalExcl * 1.17, // Assuming 17% tax
              vendorPaymentTerms: result.vendorPaymentTerms,
              contractDuration: convertToYears(result.contractDuration || bid.contractDuration),
              customerPaymentTerms: result.customerPaymentTerms || bid.customerPaymentTerms
            };
          }
        } else {
          const checklistItems = [
            ...(bid.complianceChecklist || []).map(c => ({ id: c.id, requirement: c.requirement, category: 'Compliance' })),
            ...(bid.technicalQualificationChecklist || []).map(t => ({ id: t.id, requirement: t.requirement, category: 'Technical' }))
          ];

          const criteria = bid.summaryRequirements || `Compliance evaluation for ${bid.projectName} with ${bid.customerName}.`;
          const result = isPDF ? await analyzeComplianceDocuments(criteria, checklistItems, [...bid.technicalDocuments, { name: file.name, fileData: base64 }]) : null;

          // Smart Tagging for single file
          let finalTags = result?.detectedTags || [category, 'Asset'];
          let finalSummary = '';
          const tagResult = await tagTechnicalDocuments([{ name: file.name }]);
          if (tagResult?.taggedFiles?.[0]) {
            finalTags = [...new Set([...finalTags, ...(tagResult.taggedFiles[0].tags || []), 'AI-Tagged'])];
            finalSummary = tagResult.taggedFiles[0].summary;
          }

          const newDoc: TechnicalDocument = {
            id: 'asset-' + Date.now(),
            name: file.name,
            type: 'PDF',
            category: category as any,
            uploadDate: new Date().toLocaleDateString(),
            aiScore: result?.confidenceScore,
            aiMatchDetails: result ? result.assessment : "Manual check needed.",
            tags: finalTags,
            summary: finalSummary,
            fileData: base64
          };

          let updatedCompliance = [...(bid.complianceChecklist || [])];
          let updatedTechnical = [...(bid.technicalQualificationChecklist || [])];

          if (result?.updatedChecklist) {


            result.updatedChecklist.forEach((aiItem: any) => {
              if (aiItem.status === 'Complete' && aiItem.id) {
                // ID-Based Matching
                const complianceIdx = updatedCompliance.findIndex(c => c.id === aiItem.id);
                if (complianceIdx !== -1) {
                  updatedCompliance[complianceIdx] = {
                    ...updatedCompliance[complianceIdx],
                    status: 'Complete',
                    aiComment: aiItem.aiComment || updatedCompliance[complianceIdx].aiComment
                  };
                }

                const technicalIdx = updatedTechnical.findIndex(t => t.id === aiItem.id);
                if (technicalIdx !== -1) {
                  updatedTechnical[technicalIdx] = {
                    ...updatedTechnical[technicalIdx],
                    status: 'Complete',
                    aiComment: aiItem.aiComment || updatedTechnical[technicalIdx].aiComment
                  };
                }
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
        setScanningStatus(null);
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

  const handleUpdatePrice = (index: number, price: string) => {
    const numPrice = parseFloat(price.replace(/,/g, '')) || 0;
    const updatedFormats = [...(bid.financialFormats || [])];
    updatedFormats[index] = {
      ...updatedFormats[index],
      unitPrice: numPrice,
      totalPrice: numPrice * updatedFormats[index].quantity
    };

    const newExcl = updatedFormats.reduce((acc, f) => acc + (f.totalPrice || 0), 0);
    onUpdate({
      ...bid,
      financialFormats: updatedFormats,
      tcvExclTax: newExcl,
      tcvInclTax: newExcl * 1.17 // Assuming 17% tax
    });
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
          accept={key === 'bidSecurity' ? ".pdf,image/png,image/jpeg" : ".pdf,.zip"}
        />
      ))}
      <BidLifecycleSidebar
        bid={bid}
        remainingDays={remainingDays}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <BidLifecycleHeader
          bid={bid}
          viewingStage={viewingStage}
          setViewingStage={setViewingStage}
          onClose={onClose}
          userRole={userRole}
          handleProgressStage={handleProgressStage}
          setShowNoBidModal={setShowNoBidModal}
          onEditIntake={onEditIntake}
          stagesOrder={stagesOrder}
          currentOfficialIndex={currentOfficialIndex}
        />

        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide pb-60 text-left">
          {/* Phase Header with Timing Badge */}
          {(() => {
            const phaseTargets = calculatePhaseTargets(bid.deadline, bid.receivedDate, bid.complexity || 'Medium');
            const targetDays = phaseTargets[viewingStage] || 1;
            const elapsedDays = getPhaseElapsedDays(bid.stageHistory || [], viewingStage);
            const timingStatus = getTimingStatus(elapsedDays, targetDays);
            const showT2Warning = bid.currentStage === BidStage.PRICING && remainingDays <= 2;

            return (
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={clsx("p-3 rounded-2xl shadow-sm text-white", isPreviewingFuture ? "bg-amber-500" : viewingIndex < currentOfficialIndex ? "bg-emerald-500" : "bg-[#D32F2F]")}>{STAGE_ICONS[viewingStage]}</div>
                  <div><h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{viewingStage} Phase</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">{isPreviewingFuture ? "Preview Mode: Locked" : viewingIndex < currentOfficialIndex ? "Review Mode: Finished" : "Active Mode: Work in progress"}</p></div>
                </div>

                {/* Timing Badge */}
                <div className="flex items-center gap-3">
                  {showT2Warning && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-xl animate-pulse">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-wider">T-{remainingDays} • Submit Soon!</span>
                    </div>
                  )}
                  <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl border-2", timingStatus.color)}>
                    <Clock size={14} />
                    <span className="text-sm font-black">{elapsedDays}d</span>
                    <span className="text-[10px] font-bold opacity-60">/</span>
                    <span className="text-sm font-black opacity-70">{targetDays}d</span>
                    <span className="text-[9px] font-black uppercase tracking-wider ml-1">
                      {timingStatus.status === 'ahead' && '✓ Ahead'}
                      {timingStatus.status === 'on-track' && '• On Track'}
                      {timingStatus.status === 'behind' && '⚠ Behind'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {viewingStage !== BidStage.FINAL_REVIEW && (
            <>
              {viewingStage === BidStage.INTAKE && (
                <>
                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <Info className="text-blue-500" size={20} />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bid Brief & Scope</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Pre-Bid Meeting Status Bar */}
                        <div
                          onClick={() => !isPreviewingFuture && userRole !== 'VIEWER' && refs.preBidDate.current?.click()}
                          className={clsx(
                            "flex items-center gap-1.5 px-3 py-1 rounded-lg group relative transition-all",
                            bid.preBidMeeting?.date && !isNaN(new Date(bid.preBidMeeting.date).getTime())
                              ? "bg-amber-500 text-white cursor-help"
                              : clsx("bg-slate-100 text-slate-400 uppercase", userRole !== 'VIEWER' ? "hover:bg-slate-200 cursor-pointer" : "cursor-default")
                          )}
                        >
                          <MapPin size={10} />
                          <span className="text-[9px] font-black uppercase tracking-wider">
                            {bid.preBidMeeting?.date && !isNaN(new Date(bid.preBidMeeting.date).getTime())
                              ? `Pre-Bid: ${new Date(bid.preBidMeeting.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                              : "Pre-Bid Meeting: No"}
                          </span>

                          <input
                            type="date"
                            ref={refs.preBidDate}
                            className="hidden"
                            onChange={(e) => {
                              const newDate = e.target.value;
                              if (newDate) {
                                onUpdate({
                                  ...bid,
                                  preBidMeeting: {
                                    ...(bid.preBidMeeting || { time: '', location: '', isMandatory: false }),
                                    date: newDate
                                  }
                                });
                              }
                            }}
                          />

                          {/* Tooltip for Pre-Bid Meeting */}
                          {bid.preBidMeeting && (
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl transition-opacity pointer-events-none z-50 border border-white/10 backdrop-blur-md">
                              <div className="font-black uppercase tracking-widest text-amber-400 mb-1">Pre-Bid Meeting</div>
                              <div className="space-y-1">
                                <p className="flex justify-between"><span>Time:</span> <span className="font-bold">{bid.preBidMeeting.time || 'TBD'}</span></p>
                                <p className="flex justify-between"><span>Location:</span> <span className="font-bold truncate max-w-[100px]">{bid.preBidMeeting.location || 'TBD'}</span></p>
                                {bid.preBidMeeting.isMandatory && <p className="text-red-400 font-black uppercase text-[8px]">Mandatory Attendance</p>}
                              </div>
                            </div>
                          )}
                        </div>
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

                  {/* Key Deliverables Physical Summary */}
                  {bid.deliverablesSummary && bid.deliverablesSummary.length > 0 && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
                        <Package className="text-[#D32F2F]" size={20} />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Key Deliverables</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {bid.deliverablesSummary.map((item, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3 group hover:border-[#D32F2F] hover:bg-white transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-white rounded-xl shadow-inner flex items-center justify-center text-slate-400 group-hover:text-[#D32F2F] group-hover:scale-110 transition-all border border-slate-100">
                                <Activity size={24} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.item}</p>
                                <p className="text-base font-black text-slate-900 tracking-tight">{item.quantity}</p>
                              </div>
                            </div>
                            {item.specs && (
                              <div className="pt-3 border-t border-slate-100">
                                <p className="text-[9px] font-medium text-slate-500 leading-relaxed italic">{item.specs}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase Target Timeline */}
                  {bid.deadline && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                          <Clock className="text-[#D32F2F]" size={20} />
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Phase Target Plan</h3>
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                            bid.complexity === 'High' ? 'bg-red-100 text-red-600' :
                              bid.complexity === 'Medium' ? 'bg-amber-100 text-amber-600' :
                                'bg-green-100 text-green-600'
                          )}>{bid.complexity || 'Medium'}</span>
                        </div>
                        {bid.publishDate && (
                          <div className="flex items-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mr-1">INTAKE LAG:</span>
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">
                              {Math.max(0, Math.ceil((new Date(bid.receivedDate).getTime() - new Date(bid.publishDate).getTime()) / (1000 * 60 * 60 * 24)))} DAYS
                            </span>
                          </div>
                        )}
                      </div>
                      {(() => {
                        const targets = calculatePhaseTargets(bid.deadline, bid.receivedDate, bid.complexity || 'Medium');
                        const totalPhaseDays = Object.values(targets).reduce((a, b) => a + b, 0);
                        const startDate = new Date(bid.receivedDate);
                        const deadlineDate = new Date(bid.deadline);
                        const totalAvailableDays = Math.ceil((deadlineDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                        const gapDays = Math.max(0, totalAvailableDays - totalPhaseDays);

                        const phases = [
                          { name: 'Intake', key: 'Intake', color: '#64748b', textColor: '#475569' },
                          { name: 'Qualification', key: 'Qualification', color: '#f59e0b', textColor: '#d97706' },
                          { name: 'Solutioning', key: 'Solutioning', color: '#0ea5e9', textColor: '#0284c7' },
                          { name: 'Pricing', key: 'Pricing', color: '#8b5cf6', textColor: '#7c3aed' },
                          { name: 'Compliance', key: 'Compliance', color: '#10b981', textColor: '#059669' },
                          { name: 'Final Review', key: 'Final Review', color: '#f97316', textColor: '#ea580c' }
                        ];

                        // Calculate cumulative dates for each phase
                        let cumulativeDays = 0;
                        const phaseData = phases.map(phase => {
                          const days = targets[phase.key] || 0.5;
                          const phaseStartDate = new Date(startDate);
                          phaseStartDate.setDate(phaseStartDate.getDate() + Math.floor(cumulativeDays));
                          const phaseEndDate = new Date(phaseStartDate);
                          phaseEndDate.setDate(phaseEndDate.getDate() + Math.ceil(days));
                          cumulativeDays += days;
                          return { ...phase, days, startDate: phaseStartDate, endDate: phaseEndDate, width: (days / totalAvailableDays) * 100 };
                        });

                        const gapWidth = (gapDays / totalAvailableDays) * 100;

                        return (
                          <div>
                            {/* Graphical Bar with Hover Cards */}
                            <div className="flex h-14 shadow-sm border border-slate-100 rounded-2xl">
                              {phaseData.map((phase, idx) => (
                                <div
                                  key={phase.key}
                                  className={clsx(
                                    "flex items-center justify-center text-white font-bold text-sm transition-all hover:brightness-110 cursor-pointer relative group",
                                    idx === 0 && "rounded-l-2xl",
                                    idx === phaseData.length - 1 && !gapWidth && "rounded-r-2xl"
                                  )}
                                  style={{ width: `${phase.width}%`, minWidth: '36px', backgroundColor: phase.color }}
                                >
                                  <span className="drop-shadow-md text-xs">{phase.days}d</span>

                                  {/* Hover Card */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50">
                                    <div
                                      className="px-4 py-3 rounded-xl shadow-2xl whitespace-nowrap border-2"
                                      style={{ borderColor: phase.color, backgroundColor: phase.color }}
                                    >
                                      <div className="bg-white rounded-lg p-3">
                                        <p className="text-[11px] font-black uppercase tracking-wider mb-1" style={{ color: phase.textColor }}>{phase.name}</p>
                                        <p className="text-xl font-black text-slate-800">{phase.days} days</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1">
                                          Target: <span className="font-bold text-slate-600">{phase.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </p>
                                      </div>
                                    </div>
                                    <div
                                      className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 -mt-1.5"
                                      style={{ backgroundColor: phase.color }}
                                    />
                                  </div>
                                </div>
                              ))}

                              {/* Gap (buffer time) */}
                              {gapWidth > 0 && (
                                <div
                                  className="bg-slate-100 flex items-center justify-center"
                                  style={{ width: `${gapWidth}%` }}
                                >
                                  {gapWidth > 5 && <span className="text-[9px] font-medium text-slate-400">buffer</span>}
                                </div>
                              )}

                              {/* Deadline Marker */}
                              <div className="bg-red-600 flex items-center justify-center text-white min-w-[80px] relative group rounded-r-2xl">
                                <div className="text-center">
                                  <p className="text-[8px] font-bold uppercase tracking-wider opacity-80">SUBMIT</p>
                                  <p className="text-[10px] font-black">{deadlineDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                </div>

                                {/* Deadline Hover Card */}
                                <div className="absolute bottom-full right-0 mb-4 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50">
                                  <div className="bg-red-600 px-4 py-3 rounded-xl shadow-2xl border-2 border-red-700">
                                    <div className="bg-white rounded-lg p-3">
                                      <p className="text-[10px] font-black uppercase tracking-wider text-red-600 mb-1">Submission Deadline</p>
                                      <p className="text-lg font-black text-slate-800">{deadlineDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                  </div>
                                  <div className="absolute top-full right-4 w-3 h-3 rotate-45 -mt-1.5 bg-red-600" />
                                </div>
                              </div>
                            </div>

                            {/* Summary Footer */}
                            <div className="flex items-center justify-between pt-4 mt-4">
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Work: <span className="text-slate-800">{totalPhaseDays} days</span></span>
                                {gapDays > 0 && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buffer: <span className="text-emerald-600">{gapDays} days</span></span>}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  {phases.map(p => (
                                    <div key={p.key} className="flex items-center gap-1">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                      <span className="text-[8px] font-medium text-slate-400">{p.name.split(' ')[0]}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )
                  }
                </>
              )}

              {viewingStage !== BidStage.QUALIFICATION && (
                <div className={clsx(
                  "grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500",
                  viewingStage === BidStage.INTAKE ? "xl:grid-cols-2" : "xl:grid-cols-3"
                )}>
                  <CompactChecklist title="General Compliance" items={bid.complianceChecklist || []} icon={<ShieldCheck className="text-blue-500" size={16} />} onToggle={(i) => !isPreviewingFuture && userRole !== 'VIEWER' && toggleItemStatus('compliance', i)} readOnly={isPreviewingFuture || userRole === 'VIEWER'} />
                  <CompactChecklist title="Technical Compliance" items={bid.technicalQualificationChecklist || []} icon={<CheckSquare className="text-amber-500" size={16} />} onToggle={(i) => !isPreviewingFuture && userRole !== 'VIEWER' && toggleItemStatus('technical', i)} readOnly={isPreviewingFuture || userRole === 'VIEWER'} />

                  {/* Hide Integrity Index card in Intake Stage */}
                  {viewingStage !== BidStage.INTAKE && (
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl flex flex-col justify-center items-center text-center">
                      <div className="absolute top-0 right-0 p-6 opacity-5"><Sparkles size={80} /></div>
                      <div className="text-xs font-black uppercase text-slate-500 tracking-widest mb-2">Bid Integrity Index</div>
                      <div className="text-6xl font-black text-[#FFC107]">{integrityScore}%</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className={clsx("space-y-12 transition-all duration-500", isPreviewingFuture && "opacity-60")}>

            {viewingStage === BidStage.COMPLIANCE && (
              <div className="space-y-10 animate-in fade-in duration-700">
                <StageSection title="Bid Security Verification" icon={<Banknote className="text-emerald-500" />}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div
                      onClick={() => !isPreviewingFuture && userRole !== 'VIEWER' && refs.bidSecurity.current?.click()}
                      className={clsx(
                        "group bg-[#1E3A5F] rounded-[2.5rem] border-2 border-dashed border-white/20 p-10 text-center shadow-xl transition-all relative overflow-hidden flex flex-col justify-center min-h-[460px]",
                        userRole !== 'VIEWER' ? "hover:border-[#FFC107] hover:bg-white/5 cursor-pointer" : "cursor-default"
                      )}
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-10"><Landmark size={80} className="text-white" /></div>
                      <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all">
                        {isAnalyzingBidSecurity ? <Loader2 className="animate-spin text-[#FFC107]" size={36} /> : <FileUp size={36} className={clsx(userRole !== 'VIEWER' ? "text-[#FFC107]" : "text-slate-500")} />}
                      </div>
                      <h4 className="text-xl font-black text-white uppercase mb-2 tracking-tight group-hover:text-[#FFC107]">{userRole !== 'VIEWER' ? "Upload Instrument" : "Instrument View"}</h4>
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
                    <UploadPortal onClick={() => userRole !== 'VIEWER' && refs.compliance.current?.click()} title="Compliance Docs" desc="Legal & Tax Credentials" loading={isAnalyzing} status={scanningStatus} icon={<ShieldCheck size={24} className={clsx(userRole !== 'VIEWER' ? "text-blue-500" : "text-slate-400")} />} />
                    <UploadPortal onClick={() => userRole !== 'VIEWER' && refs.annexure.current?.click()} title="Annexures" desc="RFP Specific Appendices" loading={isAnalyzing} status={scanningStatus} icon={<FileBox size={24} className={clsx(userRole !== 'VIEWER' ? "text-amber-500" : "text-slate-400")} />} />
                    <UploadPortal onClick={() => userRole !== 'VIEWER' && refs.supporting.current?.click()} title="Supporting Docs" desc="Any other bid collateral" loading={isAnalyzing} status={scanningStatus} icon={<Layers size={24} className={clsx(userRole !== 'VIEWER' ? "text-indigo-500" : "text-slate-400")} />} />
                  </div>
                </StageSection>
              </div>
            )}

            {viewingStage === BidStage.QUALIFICATION && (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="space-y-12">
                  <StageSection title="General Compliance Requirements" icon={<ShieldCheck className="text-blue-500" />}>
                    {(bid.complianceChecklist || []).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {bid.complianceChecklist.map((item, idx) => (
                          <DetailedChecklistCard
                            key={`comp-${idx}`}
                            item={item}
                            type="compliance"
                            onToggle={() => !isPreviewingFuture && toggleItemStatus('compliance', idx)}
                            readOnly={isPreviewingFuture}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No general compliance items detected.</p>
                      </div>
                    )}
                  </StageSection>

                  <StageSection title="Technical Qualification Requirements" icon={<CheckSquare className="text-amber-500" />}>
                    {(bid.technicalQualificationChecklist || []).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {bid.technicalQualificationChecklist.map((item, idx) => (
                          <DetailedChecklistCard
                            key={`tech-${idx}`}
                            item={item}
                            type="technical"
                            onToggle={() => !isPreviewingFuture && toggleItemStatus('technical', idx)}
                            readOnly={isPreviewingFuture}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center border border-dashed border-slate-200 rounded-[2rem] bg-slate-50/30">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No technical qualification items detected.</p>
                      </div>
                    )}
                  </StageSection>
                </div>

                <StageSection title="Strategic Risk Assessment" icon={<ShieldAlert className="text-red-500" />}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Exposure Report</p>
                      <button onClick={runStrategicRiskAssessment} disabled={isEvaluatingStrategicRisk || userRole === 'VIEWER'} className="px-5 py-2.5 bg-[#1E3A5F] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-900 flex items-center gap-2 transition-all disabled:opacity-50">
                        {isEvaluatingStrategicRisk ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Refresh Analysis
                      </button>
                    </div>
                    {bid.strategicRiskAssessment ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                        <div className="space-y-4 text-left">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Identified Friction Points</h4>
                          <div className="space-y-3">
                            {(bid.strategicRiskAssessment?.risks || []).map((risk, idx) => (
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
                            {(bid.strategicRiskAssessment?.mitigations || []).map((step, idx) => (
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
              </div>
            )}

            {viewingStage === BidStage.SOLUTIONING && (
              <StageSection title="Solutioning & Architecture" icon={<Zap className="text-amber-500" />}>
                <div className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <UploadPortal onClick={() => userRole !== 'VIEWER' && refs.technical.current?.click()} title="Technical Proposal" desc="Upload narrative & diagrams" loading={isAnalyzing} status={scanningStatus} icon={<FileText size={24} className={clsx(userRole !== 'VIEWER' ? "text-blue-500" : "text-slate-400")} />} />
                    <UploadPortal onClick={() => userRole !== 'VIEWER' && refs.vendor.current?.click()} title="Vendor Quotes" desc="Upload OEM prices" loading={isAnalyzing} status={scanningStatus} icon={<Briefcase size={24} className={clsx(userRole !== 'VIEWER' ? "text-[#D32F2F]" : "text-slate-400")} />} />
                  </div>
                  <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><Target className="text-[#FFC107]" /> AI Alignment Check</h4>
                      <button onClick={() => runSolutionAnalysis()} disabled={isAnalyzingSolution || bid.technicalDocuments.length === 0 || userRole === 'VIEWER'} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase border border-white/10 transition-all disabled:opacity-50">
                        {isAnalyzingSolution ? <Loader2 size={14} className="animate-spin" /> : "Re-Run Check"}
                      </button>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-8 min-h-[120px] max-h-[350px] overflow-y-auto scrollbar-hide text-left">
                      {isAnalyzingSolution ? <div className="flex flex-col items-center justify-center py-10 gap-3"><Loader2 className="animate-spin text-[#FFC107]" size={24} /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Checking alignment based on project scope...</p></div> : <SolutionAnalysisView analysis={bid.solutioningAIAnalysis || null} isLoading={isAnalyzingSolution} />}
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
                        <SummaryItem label="Duration (Days)" value={bid.contractDuration || "N/A"} />
                        <SummaryItem label="Payment (Days)" value={bid.customerPaymentTerms || "N/A"} />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 text-left">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Price Breakdown</h4>
                        <div className="space-y-4">
                          {(bid.financialFormats || []).map((f, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-4"><div className="p-2 bg-white rounded-lg shadow-sm text-slate-400"><FileSpreadsheet size={14} /></div><div className="flex flex-col"><span className="text-xs font-black text-slate-700">{f.item}</span><span className="text-[9px] text-slate-400 font-bold uppercase">{f.uom || 'UNIT'}</span></div></div>
                              <div className="flex gap-10">
                                <div className="text-center w-12">
                                  <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Qty</p>
                                  <p className="text-xs font-black text-slate-700 py-1">{f.quantity}</p>
                                </div>
                                <div className="text-center w-32">
                                  <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Unit Price</p>
                                  <div className="relative group">
                                    <input
                                      type="text"
                                      value={f.unitPrice ? f.unitPrice.toLocaleString() : ''}
                                      onChange={(e) => handleUpdatePrice(i, e.target.value)}
                                      disabled={userRole === 'VIEWER'}
                                      className={clsx(
                                        "w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-black focus:ring-1 outline-none text-right",
                                        userRole === 'VIEWER' ? "text-slate-500 cursor-default" : "text-blue-600 focus:ring-blue-500"
                                      )}
                                      placeholder="0"
                                    />
                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-black">PKR</span>
                                  </div>
                                </div>
                                <div className="text-center w-32">
                                  <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Total</p>
                                  <div className="bg-slate-100/50 py-1 rounded-lg px-2 min-h-[24px] flex items-center justify-end">
                                    <span className="text-[8px] text-slate-300 font-black mr-auto">PKR</span>
                                    <span className="text-xs font-black text-slate-700">{f.totalPrice ? f.totalPrice.toLocaleString() : '—'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#1E3A5F] rounded-[2.5rem] p-8 text-white text-left">
                      <h4 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Sparkles size={16} className="text-[#FFC107]" /> Pricing Tool</h4>
                      <p className="text-[10px] text-slate-400 mb-8 leading-relaxed font-medium">AI will extract commercial schedules and auto-calculate TCV.</p>
                      <button onClick={() => userRole !== 'VIEWER' && refs.pricing.current?.click()} className={clsx("w-full py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all flex items-center justify-center gap-3", userRole === 'VIEWER' ? "bg-slate-700 cursor-default" : "bg-[#D32F2F] hover:bg-red-700")}>{isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />} {userRole === 'VIEWER' ? "Price Sheet View" : "Upload Price Sheet"}</button>
                    </div>
                  </div>
                </StageSection>

                <StageSection title="Internal Clearances" icon={<ShieldCheck className="text-emerald-500" />}>
                  <div className="space-y-8 text-left">
                    <div className="max-w-md">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Assigned Authority</label>
                      <div className="relative group">
                        <select value={bid.approvingAuthorityRole || ''} onChange={(e) => userRole !== 'VIEWER' && onUpdate({ ...bid, approvingAuthorityRole: e.target.value as ApprovingAuthorityRole, pricingApprovalStatus: 'Pending' })} disabled={userRole === 'VIEWER'} className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 text-sm font-black text-slate-900 focus:outline-none appearance-none cursor-pointer transition-all shadow-sm disabled:cursor-default disabled:opacity-60">
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
                        <div className="flex gap-4"><button onClick={() => onUpdate({ ...bid, pricingApprovalStatus: 'Submitted', approvalRequestedDate: new Date().toISOString() })} disabled={bid.pricingApprovalStatus !== 'Pending' || userRole === 'VIEWER'} className="px-8 py-4 bg-[#1E3A5F] text-white text-xs font-black uppercase rounded-2xl shadow-xl hover:bg-slate-900 transition-all disabled:opacity-50">Submit Request</button><button onClick={() => onUpdate({ ...bid, pricingApprovalStatus: 'Approved', managementApprovalDate: new Date().toISOString() })} disabled={bid.pricingApprovalStatus !== 'Submitted' || userRole === 'VIEWER'} className="px-8 py-4 bg-emerald-600 text-white text-xs font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50">Confirm Approval</button></div>
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
                    <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-slate-200">
                      <div className="w-24 h-24 bg-red-50 text-[#D32F2F] rounded-full flex items-center justify-center mx-auto mb-8"><Send size={48} /></div>
                      <h3 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">{userRole === 'VIEWER' ? "Governance Review" : "Governance Sign-Off"}</h3>
                      {userRole !== 'VIEWER' ? (
                        <button onClick={() => onUpdate({ ...bid, status: BidStatus.SUBMITTED, submissionDate: new Date().toISOString() })} className="w-full bg-[#D32F2F] text-white py-6 rounded-[2rem] font-black shadow-2xl hover:bg-[#B71C1C] transition-all text-xs uppercase tracking-widest">Confirm & Submit Bid</button>
                      ) : (
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Awaiting Submission by Bids Team</p>
                      )}
                    </div>
                  )}
                </div>
                <StageSection title="Final Readiness Scan" icon={<ShieldAlert className="text-red-500" />}>
                  <div className="space-y-6 text-left">
                    <button onClick={runFinalRiskAssessment} disabled={isEvaluatingRisk || userRole === 'VIEWER'} className="px-10 py-4 bg-[#D32F2F] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto disabled:opacity-50">
                      {isEvaluatingRisk ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />} Scan Readiness
                    </button>{bid.finalRiskAssessment && (<div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100"><h4 className="text-sm font-black text-red-600 uppercase tracking-widest mb-6">Open Risks</h4><ul className="space-y-3">{bid.finalRiskAssessment.risks.map((r, i) => <li key={i} className="text-xs font-bold text-red-800 flex gap-2"><AlertCircle size={12} className="shrink-0 mt-0.5" /> {r}</li>)}</ul></div><div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100"><h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-6">Mitigation Fixes</h4><ul className="space-y-3">{bid.finalRiskAssessment.mitigations.map((m, i) => <li key={i} className="text-xs font-bold text-emerald-800 flex gap-2"><CheckCircle2 size={12} className="shrink-0 mt-0.5" /> {m}</li>)}</ul></div></div>)}</div>
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
                      {userRole !== 'VIEWER' && <button onClick={() => setDeletingAssetId(doc.id)} className="p-2 text-slate-300 hover:text-red-600 rounded-lg transition-all"><Trash2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes Section */}
            <div className="mt-12 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                  <StickyNote className="text-amber-500" size={20} />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Bid Notes</h3>
                </div>
                {userRole !== 'VIEWER' && (
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-100 transition-all border border-amber-200"
                  >
                    <Plus size={14} /> Add Note
                  </button>
                )}
              </div>

              {/* Add Note Form */}
              {isAddingNote && (
                <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <MentionInput
                    value={newNoteContent}
                    onChange={(value, userIds) => {
                      setNewNoteContent(value);
                      setMentionedUserIds(userIds);
                    }}
                    users={allUsers}
                    placeholder="Write your note here... Use @ to mention team members"
                    autoFocus
                    rows={4}
                    className="w-full bg-white/80 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 font-medium h-24 focus:border-amber-400 transition-all"
                    onSubmit={() => {
                      if (newNoteContent.trim() && currentUser) {
                        const newNote = {
                          id: `note-${Date.now()}`,
                          content: newNoteContent.trim(),
                          color: '#FEF3C7',
                          createdAt: new Date().toISOString(),
                          createdBy: currentUser.name,
                          mentionedUserIds: mentionedUserIds
                        };
                        const updatedNotes = [...(bid.notes || []), newNote];
                        onUpdate({ ...bid, notes: updatedNotes });
                        setNewNoteContent('');
                        setMentionedUserIds([]);
                        setIsAddingNote(false);
                      }
                    }}
                  />
                  <div className="flex justify-end gap-3 mt-3">
                    <button
                      onClick={() => {
                        setIsAddingNote(false);
                        setNewNoteContent('');
                        setMentionedUserIds([]);
                      }}
                      className="px-4 py-2 text-slate-500 text-xs font-bold uppercase hover:text-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (newNoteContent.trim() && currentUser) {
                          const newNote = {
                            id: `note-${Date.now()}`,
                            content: newNoteContent.trim(),
                            color: '#FEF3C7',
                            createdAt: new Date().toISOString(),
                            createdBy: currentUser.name,
                            mentionedUserIds: mentionedUserIds
                          };
                          const updatedNotes = [...(bid.notes || []), newNote];
                          onUpdate({ ...bid, notes: updatedNotes });
                          setNewNoteContent('');
                          setMentionedUserIds([]);
                          setIsAddingNote(false);
                        }
                      }}
                      className="px-5 py-2 bg-amber-500 text-white rounded-xl text-xs font-black uppercase hover:bg-amber-600 transition-all"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              )}


              {/* Notes Grid */}
              {bid.notes && bid.notes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-10">
                  {bid.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md group relative"
                      style={{ backgroundColor: note.color || '#FEF3C7', borderColor: 'rgba(0,0,0,0.1)' }}
                    >
                      <p className="text-sm text-amber-900 font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      <div className="mt-4 pt-3 border-t border-amber-900/10 flex items-center justify-between">
                        <span className="text-[9px] text-amber-800/60 font-bold">{note.createdBy}</span>
                        <span className="text-[9px] text-amber-800/40 font-medium">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {userRole !== 'VIEWER' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updatedNotes = (bid.notes || []).filter(n => n.id !== note.id);
                            onUpdate({ ...bid, notes: updatedNotes });
                          }}
                          className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <StickyNote size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-bold uppercase tracking-widest">No notes yet</p>
                </div>
              )}
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

      <NoBidModal
        isOpen={showNoBidModal}
        onClose={() => setShowNoBidModal(false)}
        onConfirm={handleSetNoBid}
        category={noBidCategory}
        setCategory={setNoBidCategory}
      />

      <OutcomeModal
        showOutcomeModal={showOutcomeModal}
        onClose={() => setShowOutcomeModal(null)}
        onSave={handleSetOutcome}
        learnings={learnings}
        setLearnings={setLearnings}
      />

      <DeleteAssetModal
        isOpen={!!deletingAssetId}
        onClose={() => setDeletingAssetId(null)}
        onConfirm={handleDeleteAsset}
      />
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

const DetailedChecklistCard: React.FC<{
  item: any;
  type: 'compliance' | 'technical';
  onToggle: () => void;
  readOnly?: boolean;
}> = ({ item, type, onToggle, readOnly }) => {
  const isComplete = item.status === 'Complete';

  return (
    <div
      onClick={() => !readOnly && onToggle()}
      className={clsx(
        "bg-white rounded-[1.5rem] p-6 border transition-all flex flex-col gap-4 group relative",
        !readOnly && "cursor-pointer hover:shadow-lg hover:border-slate-300",
        isComplete ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 shadow-sm"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
            isComplete ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 bg-white"
          )}>
            {isComplete && <CheckCircle2 size={14} />}
          </div>
          <h4 className={clsx(
            "text-sm font-black tracking-tight leading-tight",
            isComplete ? "text-emerald-900" : "text-slate-800"
          )}>
            {item.requirement}
          </h4>
        </div>
        <div className={clsx(
          "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest",
          isComplete ? "bg-emerald-100 text-emerald-600" : "bg-amber-50 text-amber-500"
        )}>
          {item.status === 'Complete' ? 'Complete' : 'Pending'}
        </div>
      </div>

      <div className="bg-white/50 rounded-xl p-4 border border-slate-50 min-h-[80px]">
        <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic">
          {item.aiComment || item.description || "No detailed description available."}
        </p>
      </div>
    </div>
  );
};

const StageSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-3 px-2">
      <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <h3 className="text-sm font-black text-slate-900 tracking-widest">{title}</h3>
    </div>
    {children}
  </div>
);

const SummaryItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = "text-slate-900" }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[100px]">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">{label}</p>
    <p className={clsx("text-sm font-black truncate max-w-full px-2 text-center", color)}>{value}</p>
  </div>
);

const UploadPortal: React.FC<{ onClick: () => void; title: string; desc: string; loading?: boolean; status?: string | null; icon: React.ReactNode }> = ({ onClick, title, desc, loading, status, icon }) => (
  <div onClick={onClick} className="group bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-10 text-center hover:border-[#D32F2F] hover:bg-red-50/20 shadow-sm transition-all cursor-pointer active:scale-95">
    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-white transition-all shadow-inner">{loading ? <Loader2 className="animate-spin text-[#D32F2F]" size={32} /> : icon}</div>
    <h4 className="text-lg font-black text-slate-900 uppercase mb-2 tracking-tight group-hover:text-red-700">{loading && status ? status : title}</h4>
    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">{desc}</p>
  </div>
);



const SolutionAnalysisView: React.FC<{ analysis: string | null; isLoading: boolean }> = ({ analysis, isLoading }) => {
  if (isLoading) return null;

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 opacity-60">
        <Sparkles size={32} className="text-slate-300 mb-3" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ready for Analysis</p>
      </div>
    );
  }

  let data: any;
  try {
    data = JSON.parse(analysis);
  } catch (e) {
    return (
      <div className="space-y-3 p-4">
        {analysis.split('\n').filter(l => l.trim()).map((line, i) => (
          <p key={i} className="text-sm font-medium text-slate-600 leading-relaxed">{line.replace(/^[•\-\*]\s*/, '')}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-2">
      {/* Header - Fit Status */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={clsx(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-2",
              data.solutionFit === 'Yes' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                data.solutionFit === 'Partial' ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-red-50 text-red-600 border-red-100"
            )}>
              {data.solutionFit === 'Yes' ? <CheckCircle2 size={12} /> : data.solutionFit === 'Partial' ? <AlertTriangle size={12} /> : <XCircle size={12} />}
              Solution Fit: {data.solutionFit}
            </div>
          </div>
          {data.fitExplanation && <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{data.fitExplanation}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gap Analysis */}
        {data.gapAnalysis && data.gapAnalysis.length > 0 ? (
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={14} className="text-red-400" /> Gap Analysis
            </h5>
            <div className="space-y-3">
              {data.gapAnalysis.map((gap: any, idx: number) => (
                <div key={idx} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase">{gap.component}</span>
                    <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded uppercase",
                      gap.impact === 'High' ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500")}>
                      {gap.impact} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{gap.gap}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-4 text-emerald-700">
            <CheckCircle2 size={24} />
            <div>
              <p className="text-xs font-black uppercase tracking-widest">No Gaps Detected</p>
              <p className="text-[10px] opacity-70">Solution aligns perfectly with SOW.</p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-[#D32F2F]" /> Strategic Advice
            </h5>
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
              {data.recommendations.map((rec: string, idx: number) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm text-blue-500 font-bold text-[10px]">{idx + 1}</div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed pt-0.5">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidLifecycle;
