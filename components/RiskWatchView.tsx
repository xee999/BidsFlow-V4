import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  ChevronRight, 
  Zap, 
  Clock, 
  CreditCard,
  Target,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { BidRecord, RiskLevel, BidRisk } from '../types.ts';
import { clsx } from 'clsx';

interface RiskWatchViewProps {
  bids: BidRecord[];
  onViewBid: (id: string) => void;
}

const RiskWatchView: React.FC<RiskWatchViewProps> = ({ bids, onViewBid }) => {
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | 'All'>('All');

  // Determine effective risk: if there are disqualifying factors, treat as HIGH
  const getEffectiveRisk = (bid: BidRecord) => {
    if (bid.disqualifyingFactors && bid.disqualifyingFactors.length > 0) return RiskLevel.HIGH;
    return bid.riskLevel;
  };

  const filteredBids = bids.filter(b => {
    const effRisk = getEffectiveRisk(b);
    if (selectedRisk === 'All') return true;
    return effRisk === selectedRisk;
  });

  const counts = {
    [RiskLevel.HIGH]: bids.filter(b => getEffectiveRisk(b) === RiskLevel.HIGH).length,
    [RiskLevel.MEDIUM]: bids.filter(b => getEffectiveRisk(b) === RiskLevel.MEDIUM).length,
    [RiskLevel.LOW]: bids.filter(b => getEffectiveRisk(b) === RiskLevel.LOW).length,
    'All': bids.length
  };

  const filterConfigs = [
    { 
      id: RiskLevel.HIGH, 
      label: 'High / Critical', 
      count: counts[RiskLevel.HIGH], 
      icon: <ShieldAlert size={18} />,
      activeClass: "bg-[#D32F2F] text-white border-[#D32F2F] shadow-lg shadow-red-100",
      inactiveClass: "text-red-500 bg-red-50/50 border-red-100 hover:bg-red-50",
      glow: "bg-red-500"
    },
    { 
      id: RiskLevel.MEDIUM, 
      label: 'Medium Risk', 
      count: counts[RiskLevel.MEDIUM], 
      icon: <AlertCircle size={18} />,
      activeClass: "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100",
      inactiveClass: "text-amber-600 bg-amber-50/50 border-amber-100 hover:bg-amber-50",
      glow: "bg-amber-500"
    },
    { 
      id: RiskLevel.LOW, 
      label: 'Low Risk', 
      count: counts[RiskLevel.LOW], 
      icon: <ShieldCheck size={18} />,
      activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100",
      inactiveClass: "text-emerald-600 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50",
      glow: "bg-emerald-500"
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in text-left">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full mb-4">
          <AlertTriangle className="text-[#D32F2F]" size={16} />
          <span className="text-[10px] font-black text-[#D32F2F] uppercase tracking-widest">Live Risk Intelligence</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Risk Watch</h1>
        <p className="text-slate-500 mt-2 max-w-xl mx-auto font-medium">Strategic monitoring of all Jazz Business opportunities with integrated compliance disqualifiers and AI mitigation.</p>
      </div>

      {/* Filters */}
      <div className="flex justify-center mb-16">
        <div className="inline-flex gap-4 p-2 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl">
          <button onClick={() => setSelectedRisk('All')} className={clsx("px-6 py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all", selectedRisk === 'All' ? "bg-[#1E3A5F] text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}>All Bids ({counts['All']})</button>
          <div className="w-px bg-slate-100 my-2"></div>
          {filterConfigs.map((cfg) => (
            <button key={cfg.id} onClick={() => setSelectedRisk(cfg.id as RiskLevel)} className={clsx("flex items-center gap-3 px-8 py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all border group relative", selectedRisk === cfg.id ? cfg.activeClass : cfg.inactiveClass)}>
              {cfg.icon}<span>{cfg.label}</span><span className={clsx("px-2 py-0.5 rounded-lg text-[10px] min-w-[20px] text-center", selectedRisk === cfg.id ? "bg-white/20" : "bg-white border border-inherit")}>{cfg.count}</span>
              {cfg.id === RiskLevel.HIGH && cfg.count > 0 && (<span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-6xl mx-auto">
        {filteredBids.map(bid => {
          const effectiveRisk = getEffectiveRisk(bid);
          const combinedRisks: BidRisk[] = [...(bid.identifiedRisks || []), ...(bid.disqualifyingFactors || []).map(factor => ({ category: 'Compliance' as const, description: factor, severity: RiskLevel.HIGH }))];
          return (
            <div key={bid.id} className={clsx("bg-white rounded-[40px] border shadow-sm overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-xl group", effectiveRisk === RiskLevel.HIGH ? "border-red-200" : effectiveRisk === RiskLevel.MEDIUM ? "border-amber-200" : "border-slate-200")}>
              <div className={clsx("lg:w-1/3 p-10 border-r border-slate-100", effectiveRisk === RiskLevel.HIGH ? "bg-red-50/20" : effectiveRisk === RiskLevel.MEDIUM ? "bg-amber-50/20" : "bg-slate-50/30")}>
                <div className="flex justify-between items-start mb-8"><span className={clsx("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", effectiveRisk === RiskLevel.HIGH ? "bg-red-50 text-red-600 border-red-100" : effectiveRisk === RiskLevel.MEDIUM ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>{effectiveRisk} PRIORITY</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">STAGE: {bid.currentStage}</span></div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 leading-tight group-hover:text-[#D32F2F] transition-colors">{bid.projectName}</h3>
                <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-wide">{bid.customerName}</p>
                <div className="space-y-4 mb-10">
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="p-2 bg-white rounded-lg shadow-sm"><CreditCard size={14} className="text-slate-400" /></div><span>{bid.currency} {(bid.estimatedValue / 1000000).toFixed(1)}M Total</span></div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="p-2 bg-white rounded-lg shadow-sm"><Clock size={14} className="text-slate-400" /></div><span className={effectiveRisk === RiskLevel.HIGH ? "text-red-500 font-black" : ""}>Deadline: {bid.deadline}</span></div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-600"><div className="p-2 bg-white rounded-lg shadow-sm"><Target size={14} className="text-slate-400" /></div><span>Manager: {bid.jbcName}</span></div>
                </div>
                <button onClick={() => onViewBid(bid.id)} className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-95">Manage Risk Profile <ChevronRight size={14} /></button>
              </div>
              <div className="lg:w-2/3 p-10 space-y-10 bg-white">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><ShieldAlert size={14} className={effectiveRisk === RiskLevel.HIGH ? "text-red-500" : "text-amber-500"} /> Primary Risk Factors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {combinedRisks.map((risk, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex gap-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-lg">
                         <div className="mt-1"><div className={clsx("w-2 h-2 rounded-full", risk.severity === RiskLevel.HIGH ? "bg-red-500 shadow-[0_0_8px_rgba(211,47,47,0.5)]" : risk.severity === RiskLevel.MEDIUM ? "bg-amber-500" : "bg-emerald-500")}></div></div>
                         <div><div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black text-slate-400 uppercase">{risk.category}</span>{(bid.disqualifyingFactors || []).includes(risk.description) && (<span className="bg-red-50 text-red-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-red-100">Disqualifier</span>)}</div><div className="text-sm font-bold text-slate-700 leading-snug">{risk.description}</div></div>
                      </div>
                    ))}
                    {combinedRisks.length === 0 && (<div className="col-span-2 p-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center flex flex-col items-center justify-center gap-2"><div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-2"><FileText size={24} /></div><p className="text-xs text-slate-400 italic font-bold">No Risk Factors Reported Yet</p></div>)}
                  </div>
                </div>
                <div className={clsx("rounded-[2.5rem] p-8 border transition-all relative overflow-hidden", effectiveRisk === RiskLevel.HIGH ? "bg-red-50/40 border-red-100" : "bg-blue-50/50 border-blue-100")}>
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Sparkles size={80} /></div>
                  <div className="flex items-center justify-between mb-6 relative z-10"><h4 className={clsx("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", effectiveRisk === RiskLevel.HIGH ? "text-red-600" : "text-blue-600")}><Sparkles size={16} /> AI Mitigation Plan</h4><span className="text-[10px] font-black text-slate-400 italic bg-white px-3 py-1 rounded-full border border-slate-100">SYSTEM UPDATE: {new Date().toLocaleDateString()}</span></div>
                  <div className="space-y-4 relative z-10">
                    {(bid.mitigationPlan || []).map((step, idx) => (<div key={idx} className="flex gap-4 text-sm text-slate-700 items-start group"><div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 mt-0.5 group-hover:bg-[#FFC107] transition-colors"><Zap size={12} className="text-amber-500 group-hover:text-white" /></div><span className="font-bold leading-relaxed">{step}</span></div>))}
                    {(!bid.mitigationPlan || bid.mitigationPlan.length === 0) && (<p className="text-sm text-slate-400 italic text-center py-4 font-medium">Awaiting AI Strategic Mitigation Analysis...</p>)}
                  </div>
                </div>
              </div>
            </div>
          )})}
        {filteredBids.length === 0 && (<div className="py-32 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[40px] border-2 border-dashed border-slate-100"><div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6"><ShieldCheck className="text-slate-200" size={40} /></div><p className="text-2xl font-black text-slate-800">No {selectedRisk !== 'All' ? selectedRisk : ''} Priority Bids</p></div>)}
      </div>
    </div>
  );
};

export default RiskWatchView;
