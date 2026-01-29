import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, Loader2, Sparkles, CheckCircle, Info, Trash2, ChevronDown, ShieldCheck, Briefcase, Globe, MapPin, AlertCircle, AlertTriangle, CheckSquare, FileSpreadsheet, Package } from 'lucide-react';
import { BidRecord, BidStage, BidStatus, RiskLevel, ComplianceItem, QualificationItem, TechnicalDocument } from '../types.ts';
import { analyzeBidDocument, setAINotificationCallback, AINotification } from '../services/gemini.ts';
import { SOLUTION_OPTIONS } from '../constants.tsx';
import { clsx } from 'clsx';
import { convertToDays, convertToYears, sanitizeDateValue, sanitizeTimeValue } from '../services/utils.ts';
import Toast, { ToastMessage } from './Toast.tsx';

interface BidIntakeProps {
  onCancel: () => void;
  onInitiate: (bid: BidRecord) => void;
}

const BidIntake: React.FC<BidIntakeProps> = ({ onCancel, onInitiate }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [formData, setFormData] = useState<Partial<BidRecord>>({
    customerName: '',
    projectName: '',
    deadline: '',
    estimatedValue: 0,
    currency: 'PKR',
    bidSecurity: '',
    requiredSolutions: [],
    qualificationCriteria: '',
    aiQualificationSummary: '',
    technicalQualificationChecklist: [],
    complianceChecklist: [],
    riskLevel: RiskLevel.LOW,
    jbcName: 'John Doe',
    channel: 'B2G',
    region: 'North',
    contractDuration: '',
    customerPaymentTerms: '',
    publishDate: new Date().toISOString().split('T')[0],
    complexity: 'Medium',
    preBidMeeting: {
      date: '',
      time: '',
      location: '',
      isMandatory: false,
      notes: ''
    },
    deliverablesSummary: [],
    financialFormats: [],
    technicalDocuments: []
  });

  // Toast handling
  const addToast = useCallback((notification: AINotification) => {
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: notification.type,
      message: notification.message
    };
    setToasts(prev => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Subscribe to AI notifications on mount
  useEffect(() => {
    setAINotificationCallback(addToast);
    return () => setAINotificationCallback(() => { });
  }, [addToast]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatWithCommas = (val: string | number) => {
    const num = Number(val);
    if (isNaN(num)) return val;
    return num.toLocaleString();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAiError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await analyzeBidDocument(file.name, base64);

        if (result) {
          // Robust solution matching to ensure auto-selection works
          const matchedSolutions = (result.requiredSolutions || []).map((aiSol: string) => {
            const aiLower = aiSol.toLowerCase().trim();
            return SOLUTION_OPTIONS.find(opt =>
              opt.toLowerCase() === aiLower ||
              opt.toLowerCase().includes(aiLower) ||
              aiLower.includes(opt.toLowerCase())
            );
          }).filter((sol: string | undefined): sol is string => Boolean(sol));

          const extractedCompliance: ComplianceItem[] = (result.complianceList || []).map((item: any, idx: number) => ({
            id: `comp-${Date.now()}-${idx}`,
            requirement: item.requirement,
            status: 'Pending',
            isMandatory: item.isMandatory,
            aiComment: item.description
          }));

          const extractedQualChecklist: QualificationItem[] = (result.technicalQualificationChecklist || []).map((item: any, idx: number) => ({
            id: `qual-${Date.now()}-${idx}`,
            requirement: item.requirement,
            type: (item.type || 'Mandatory') as QualificationItem['type'],
            status: 'Pending',
            aiComment: item.aiComment
          }));

          const tenderDoc: TechnicalDocument = {
            id: 'tender-orig-' + Date.now(),
            name: file.name,
            type: 'PDF',
            category: 'Tender',
            uploadDate: new Date().toLocaleDateString(),
            tags: ['RFP', 'Original Tender', 'Mandatory'],
            fileData: base64
          };

          setFormData(prev => ({
            ...prev,
            customerName: result.customerName || prev.customerName,
            projectName: result.projectName || prev.projectName,
            deadline: sanitizeDateValue(result.deadline) || prev.deadline,
            estimatedValue: Number(result.estimatedValue) || prev.estimatedValue || 0,
            currency: result.currency || prev.currency || 'PKR',
            bidSecurity: result.bidSecurity || prev.bidSecurity || '',
            summaryRequirements: result.summaryRequirements || prev.summaryRequirements || '',
            aiQualificationSummary: result.aiQualificationSummary || prev.aiQualificationSummary || '',
            scopeOfWork: result.scopeOfWork || prev.scopeOfWork || '',
            requiredSolutions: Array.from(new Set([...matchedSolutions])),
            complianceChecklist: extractedCompliance,
            technicalQualificationChecklist: extractedQualChecklist,
            contractDuration: convertToYears(result.contractDuration || prev.contractDuration || ''),
            customerPaymentTerms: result.customerPaymentTerms || prev.customerPaymentTerms || '',
            financialFormats: result.financialFormats || prev.financialFormats || [],
            publishDate: sanitizeDateValue(result.publishDate) || prev.publishDate,
            complexity: (result.complexity as any) || prev.complexity,
            preBidMeeting: result.preBidMeeting ? {
              ...result.preBidMeeting,
              date: sanitizeDateValue(result.preBidMeeting.date),
              time: sanitizeTimeValue(result.preBidMeeting.time)
            } : prev.preBidMeeting,
            deliverablesSummary: result.deliverablesSummary || prev.deliverablesSummary || [],
            technicalDocuments: [tenderDoc]
          }));

          // Clear error states for newly extracted data
          setErrors({});
        }
      } catch (err: any) {
        console.error("Analysis Error:", err);
        setAiError("AI extraction failed. Please ensure the document is readable or proceed with manual entry.");
      } finally {
        setIsAnalyzing(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleSolution = (sol: string) => {
    setFormData(prev => {
      const current = prev.requiredSolutions || [];
      const next = current.includes(sol)
        ? current.filter(s => s !== sol)
        : [...current, sol];

      if (next.length > 0) setErrors(p => ({ ...p, requiredSolutions: false }));
      return { ...prev, requiredSolutions: next };
    });
  };

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};

    // Strict Mandatory Validation Logic (All except Estimated Value)
    const requiredFields: (keyof BidRecord)[] = [
      'customerName', 'projectName', 'jbcName', 'deadline',
      'bidSecurity', 'contractDuration', 'summaryRequirements', 'scopeOfWork'
    ];

    requiredFields.forEach(field => {
      if (!formData[field as keyof Partial<BidRecord>]) {
        newErrors[field] = true;
      }
    });

    if (!formData.requiredSolutions || formData.requiredSolutions.length === 0) {
      newErrors.requiredSolutions = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const newBid: BidRecord = {
      id: 'bid-' + Math.random().toString(36).substr(2, 9),
      customerName: formData.customerName!,
      projectName: formData.projectName!,
      deadline: formData.deadline || new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      status: BidStatus.ACTIVE,
      currentStage: BidStage.INTAKE,
      riskLevel: formData.riskLevel || RiskLevel.LOW,
      estimatedValue: Number(formData.estimatedValue) || 0,
      currency: formData.currency || 'PKR',
      bidSecurity: formData.bidSecurity || '',
      requiredSolutions: formData.requiredSolutions || [],
      summaryRequirements: formData.summaryRequirements || '',
      aiQualificationSummary: formData.aiQualificationSummary || '',
      scopeOfWork: formData.scopeOfWork || '',
      qualificationCriteria: formData.qualificationCriteria || '',
      technicalQualificationChecklist: formData.technicalQualificationChecklist || [],
      complianceChecklist: formData.complianceChecklist || [],
      technicalDocuments: formData.technicalDocuments || [],
      vendorQuotations: [],
      financialFormats: formData.financialFormats || [],
      daysInStages: { [BidStage.INTAKE]: 1 },
      stageHistory: [{ stage: BidStage.INTAKE, timestamp: new Date().toISOString() }],
      jbcName: formData.jbcName!,
      channel: (formData.channel as any) || 'B2G',
      region: (formData.region as any) || 'North',
      contractDuration: formData.contractDuration,
      customerPaymentTerms: formData.customerPaymentTerms,
      publishDate: formData.publishDate || new Date().toISOString().split('T')[0],
      complexity: formData.complexity || 'Medium',
      preBidMeeting: formData.preBidMeeting,
      deliverablesSummary: formData.deliverablesSummary,
      managementApprovalStatus: 'Pending',
      pricingApprovalStatus: 'Pending'
    };

    onInitiate(newBid);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 mt-10 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">New Bid Intake</h2>
          <p className="text-slate-500 font-medium">AI-Powered Tender Analysis & Qualification</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleInitiate} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {aiError && (
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-start gap-4 text-amber-800 animate-in slide-in-from-top-4">
              <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
              <div>
                <p className="text-xs font-black uppercase tracking-widest mb-1">Extraction Note</p>
                <p className="text-sm font-medium leading-relaxed">{aiError}</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#D32F2F] hover:underline">Retry Upload</button>
              </div>
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-[#D32F2F] hover:bg-red-50/30 transition-all cursor-pointer group"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-[#D32F2F]" size={40} />
                <p className="font-black text-slate-700 uppercase tracking-widest text-xs animate-pulse">Analyzing RFP...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-red-50 rounded-full group-hover:scale-110 transition-transform shadow-inner">
                  <Upload className="text-[#D32F2F]" size={32} />
                </div>
                <p className="font-bold text-slate-700 uppercase tracking-tight">Upload Tender Document</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI will map mandatory governance fields</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Customer Name*" value={formData.customerName} error={errors.customerName} onChange={v => { setFormData({ ...formData, customerName: v }); if (v) setErrors(p => ({ ...p, customerName: false })); }} />
            <InputField label="Project Name*" value={formData.projectName} error={errors.projectName} onChange={v => { setFormData({ ...formData, projectName: v }); if (v) setErrors(p => ({ ...p, projectName: false })); }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputField label="JBC Manager*" value={formData.jbcName} error={errors.jbcName} onChange={v => { setFormData({ ...formData, jbcName: v }); if (v) setErrors(p => ({ ...p, jbcName: false })); }} placeholder="Full Name" />

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Channel*</label>
              <div className="relative">
                <select value={formData.channel} onChange={e => setFormData({ ...formData, channel: e.target.value as any })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#D32F2F] appearance-none outline-none">
                  <option value="B2G">B2G</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Region*</label>
              <div className="relative">
                <select value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value as any })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#D32F2F] appearance-none outline-none">
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="Central">Central</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputField label="Submission Deadline*" type="date" value={formData.deadline} error={errors.deadline} onChange={v => { setFormData({ ...formData, deadline: v }); if (v) setErrors(p => ({ ...p, deadline: false })); }} />
            <InputField label="Publish Date*" type="date" value={formData.publishDate} onChange={v => setFormData({ ...formData, publishDate: v })} />
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Complexity*</label>
              <div className="relative">
                <select value={formData.complexity} onChange={e => setFormData({ ...formData, complexity: e.target.value as any })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#D32F2F] appearance-none outline-none">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InputField
              label="Contract Duration (Years)*"
              value={formData.contractDuration}
              error={errors.contractDuration}
              onChange={v => { setFormData({ ...formData, contractDuration: v }); if (v) setErrors(p => ({ ...p, contractDuration: false })); }}
              onBlur={() => {
                if (formData.contractDuration) {
                  const converted = convertToYears(formData.contractDuration);
                  setFormData(prev => ({ ...prev, contractDuration: converted }));
                }
              }}
              placeholder="e.g. 2.5"
            />
            <InputField label="Payment Terms (Net Days)*" value={formData.customerPaymentTerms} onChange={v => setFormData({ ...formData, customerPaymentTerms: v })} placeholder="e.g. 45" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Estimated Value (Optional)</label>
              <input type="text" value={formatWithCommas(formData.estimatedValue || '')} onChange={e => { const val = e.target.value.replace(/,/g, ''); if (!isNaN(Number(val))) setFormData({ ...formData, estimatedValue: Number(val) }); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-[#D32F2F] font-mono outline-none" placeholder="0.00" />
            </div>
            <InputField label="Currency*" value={formData.currency} onChange={v => setFormData({ ...formData, currency: v })} />
            <InputField label="Bid Security*" value={formData.bidSecurity} error={errors.bidSecurity} onChange={v => { setFormData({ ...formData, bidSecurity: v }); if (v) setErrors(p => ({ ...p, bidSecurity: false })); }} placeholder="Amount or %" />
          </div>

          <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} /> Pre-Bid Meeting Info
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preBidMeeting?.isMandatory}
                  onChange={e => setFormData({
                    ...formData,
                    preBidMeeting: { ...formData.preBidMeeting!, isMandatory: e.target.checked }
                  })}
                  className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[10px] font-black text-amber-600 uppercase">Mandatory</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                label="Meeting Date"
                type="date"
                value={formData.preBidMeeting?.date}
                onChange={v => setFormData({
                  ...formData,
                  preBidMeeting: { ...formData.preBidMeeting!, date: v }
                })}
              />
              <InputField
                label="Meeting Time"
                type="time"
                value={formData.preBidMeeting?.time}
                onChange={v => setFormData({
                  ...formData,
                  preBidMeeting: { ...formData.preBidMeeting!, time: v }
                })}
              />
              <InputField
                label="Location / Link"
                value={formData.preBidMeeting?.location}
                onChange={v => setFormData({
                  ...formData,
                  preBidMeeting: { ...formData.preBidMeeting!, location: v }
                })}
                placeholder="Address or URL"
              />
            </div>
            <textarea
              value={formData.preBidMeeting?.notes || ''}
              onChange={e => setFormData({
                ...formData,
                preBidMeeting: { ...formData.preBidMeeting!, notes: e.target.value }
              })}
              rows={2}
              className="w-full bg-white border border-amber-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              placeholder="Meeting objectives or dial-in notes..."
            />
          </div>

          <div className="space-y-6">
            <div>
              <label className={clsx("block text-[10px] font-black uppercase tracking-widest mb-2 ml-1", errors.summaryRequirements ? "text-red-500" : "text-slate-500")}>Project Brief*</label>
              <textarea value={formData.summaryRequirements || ''} onChange={e => { setFormData({ ...formData, summaryRequirements: e.target.value }); if (e.target.value) setErrors(p => ({ ...p, summaryRequirements: false })); }} rows={3} className={clsx("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F] outline-none transition-all", errors.summaryRequirements ? "border-red-300 bg-red-50" : "border-slate-200")} placeholder="High-level summary..." />
            </div>
            <div>
              <label className={clsx("block text-[10px] font-black uppercase tracking-widest mb-2 ml-1", errors.scopeOfWork ? "text-red-500" : "text-slate-500")}>Detailed SOW*</label>
              <textarea value={formData.scopeOfWork || ''} onChange={e => { setFormData({ ...formData, scopeOfWork: e.target.value }); if (e.target.value) setErrors(p => ({ ...p, scopeOfWork: false })); }} rows={4} className={clsx("w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#D32F2F] outline-none transition-all", errors.scopeOfWork ? "border-red-300 bg-red-50" : "border-slate-200")} placeholder="Technical deliverables..." />
            </div>
          </div>

          <div>
            <label className={clsx("block text-[10px] font-black uppercase tracking-widest mb-3 ml-1", errors.requiredSolutions ? "text-red-500" : "text-slate-500")}>Required Solutions*</label>
            <div className="flex flex-wrap gap-2">
              {SOLUTION_OPTIONS.map(sol => (
                <button
                  key={sol}
                  type="button"
                  onClick={() => toggleSolution(sol)}
                  className={clsx(
                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border shadow-sm",
                    formData.requiredSolutions?.includes(sol)
                      ? "bg-[#D32F2F] text-white border-[#D32F2F] shadow-lg scale-105"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  )}
                >
                  {sol}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col h-fit sticky top-10 min-h-[600px] shadow-sm">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-[#D32F2F]" size={20} />
              <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-widest">AI Extraction</h3>
            </div>

            <div className="space-y-6">
              {isAnalyzing ? (
                <div className="text-center p-10 space-y-4">
                  <Loader2 className="animate-spin text-[#D32F2F] mx-auto" size={40} />
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Analyzing Document...</p>
                </div>
              ) : formData.aiQualificationSummary ? (
                <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <p className="text-xs text-slate-700 leading-relaxed font-bold">{formData.aiQualificationSummary}</p>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" size={14} />
                        <span className="text-[10px] font-black text-emerald-600 uppercase">Analysis Complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Compliance Preview */}
                  {formData.technicalQualificationChecklist && formData.technicalQualificationChecklist.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CheckSquare className="text-amber-500" size={12} /> Technical Compliance ({formData.technicalQualificationChecklist.length})
                      </h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide">
                        {formData.technicalQualificationChecklist.map((item, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-amber-200 transition-colors">
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">{item.requirement}</p>
                            <span className="text-[8px] font-black uppercase text-slate-400 mt-1 block">{item.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Compliance Preview */}
                  {formData.complianceChecklist && formData.complianceChecklist.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ShieldCheck className="text-blue-500" size={12} /> General Compliance ({formData.complianceChecklist.length})
                      </h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide">
                        {formData.complianceChecklist.map((item, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors">
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">{item.requirement}</p>
                            {item.isMandatory && <span className="text-[8px] font-black uppercase text-red-500 mt-1 block">Mandatory</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BOQ Preview */}
                  {formData.financialFormats && formData.financialFormats.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileSpreadsheet className="text-indigo-500" size={12} /> Pricing BOQ ({formData.financialFormats.length})
                      </h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide text-left">
                        {formData.financialFormats.map((item, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                            <p className="text-[10px] font-bold text-slate-700 leading-tight uppercase">{item.item}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[8px] font-black uppercase text-slate-400">{item.uom}</span>
                              <span className="text-[10px] font-black text-indigo-600">Qty: {item.quantity}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Key Deliverables Preview */}
                  {formData.deliverablesSummary && formData.deliverablesSummary.length > 0 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Package className="text-[#D32F2F]" size={12} /> Key Deliverables ({formData.deliverablesSummary.length})
                      </h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-hide text-left">
                        {formData.deliverablesSummary.map((item, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-red-200 transition-colors">
                            <div className="flex justify-between items-start">
                              <p className="text-[10px] font-bold text-slate-700 leading-tight uppercase">{item.item}</p>
                              <span className="text-[10px] font-black text-[#D32F2F]">Qty: {item.quantity}</span>
                            </div>
                            {item.specs && <p className="text-[9px] text-slate-400 mt-1 font-medium italic">{item.specs}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-24 text-slate-300 flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mb-6 shadow-sm">
                    <Briefcase className="opacity-10" size={32} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting RFP</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-2">Upload document to auto-fill mandatory fields</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 mt-auto border-t border-slate-200 space-y-4">
            <button
              type="submit"
              className="w-full bg-[#D32F2F] text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-[#B71C1C] transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              Initiate Bid <ChevronDown className="-rotate-90" size={14} />
            </button>
            <p className="text-[8px] font-black text-center text-slate-400 uppercase tracking-widest">*All fields mandatory for governance compliance</p>
          </div>
        </div>
      </form>
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

const InputField: React.FC<{ label: string; value?: string | number; error?: boolean; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string }> = ({ label, value, error, onChange, onBlur, type = "text", placeholder }) => (
  <div>
    <label className={clsx("block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 transition-colors", error ? "text-red-500" : "text-slate-500")}>{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={clsx(
        "w-full rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:outline-none transition-all",
        error
          ? "bg-red-50 border border-red-200 focus:ring-red-500 text-red-900"
          : "bg-slate-50 border border-slate-200 focus:ring-[#D32F2F] text-slate-900"
      )}
    />
  </div>
);

export default BidIntake;