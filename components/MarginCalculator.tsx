import React, { useState, useMemo } from 'react';
import { 
  Calculator, DollarSign, TrendingUp, ShieldCheck, Zap, Info, 
  ArrowRight, Layers, ChevronDown, Cloud, Briefcase, HardDrive, 
  Cpu, Activity, BarChart3, FileText, Target, AlertCircle, 
  RefreshCw, Save, Sparkles, CheckCircle2 
} from 'lucide-react';
import { BidRecord, BidStatus } from '../types.ts';
import { clsx } from 'clsx';

interface MarginCalculatorProps {
  bids: BidRecord[];
  onUpdate: (bid: BidRecord) => void;
}

const CONTRACT_TYPES = ['Fixed Price', 'Time & Materials', 'Cost Plus'];

const MarginCalculator: React.FC<MarginCalculatorProps> = ({ bids, onUpdate }) => {
  const [selectedBidId, setSelectedBidId] = useState<string>('');
  const [contractType, setContractType] = useState('Fixed Price');
  const [targetMargin, setTargetMargin] = useState(25);
  const [contingency, setContingency] = useState(10);
  
  // Specific Telco/Tech/Cloud Drivers
  const [costs, setCosts] = useState({
    oemHardware: 8000000,
    cloudInfra: 1500000,
    fiberBandwidth: 500000,
    managedServices: 1200000,
    laborProfessional: 2000000,
    overheadRisk: 500000
  });

  const activeBids = useMemo(() => bids.filter(b => b.status === BidStatus.ACTIVE), [bids]);
  const selectedBid = useMemo(() => bids.find(b => b.id === selectedBidId), [bids, selectedBidId]);

  const totalCostBase = (Object.values(costs) as number[]).reduce((a, b) => a + b, 0);
  const contingencyAmount = totalCostBase * (contingency / 100);
  const totalCostWithContingency = totalCostBase + contingencyAmount;
  const targetPrice = totalCostWithContingency / (1 - (targetMargin / 100));
  const grossProfit = targetPrice - totalCostWithContingency;
  const actualMargin = (grossProfit / targetPrice) * 100;

  const updateCost = (key: keyof typeof costs, val: string) => {
    const num = parseInt(val.replace(/,/g, '')) || 0;
    setCosts(prev => ({ ...prev, [key]: num }));
  };

  return (
    <div className="p-8 max-w-[1700px] mx-auto animate-fade-in space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Strategic Margin Engineering</h1>
          <p className="text-slate-500 font-medium">B2G Commercial Intelligence for Jazz Business Solutions</p>
        </div>
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="pl-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Bid Context:</div>
          <div className="relative group min-w-[350px]">
            <select 
              value={selectedBidId}
              onChange={(e) => setSelectedBidId(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-[#D32F2F] focus:outline-none focus:ring-2 focus:ring-[#D32F2F] appearance-none cursor-pointer"
            >
              <option value="" disabled>Select Opportunity...</option>
              {activeBids.map(b => (
                <option key={b.id} value={b.id}>{b.projectName}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-8">
          {/* Top Panel: Contract Intelligence */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                 <FileText size={18} className="text-[#D32F2F]" /> Pricing Model
              </h3>
              <div className="relative">
                <select 
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] py-5 px-6 text-lg font-bold text-slate-900 appearance-none shadow-sm focus:ring-2 focus:ring-[#D32F2F]"
                >
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Target Net Margin</span>
                  <span className="text-2xl font-black text-[#D32F2F]">{targetMargin}%</span>
               </div>
               <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#D32F2F]"
               />
               <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                  <span>Aggressive (5%)</span>
                  <span>Premium (50%)</span>
               </div>
            </div>
          </div>

          {/* Telco / Cloud Driver Breakdown */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <Layers size={18} className="text-[#D32F2F]" /> Cost Driver Matrix (PKR)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <DriverInput label="OEM Hardware / CAPEX" value={costs.oemHardware} onChange={(v) => updateCost('oemHardware', v)} total={totalCostBase} icon={<HardDrive size={14} />} />
              <DriverInput label="Cloud Instances / OPEX" value={costs.cloudInfra} onChange={(v) => updateCost('cloudInfra', v)} total={totalCostBase} icon={<Cloud size={14} />} />
              <DriverInput label="Connectivity / Bandwidth" value={costs.fiberBandwidth} onChange={(v) => updateCost('fiberBandwidth', v)} total={totalCostBase} icon={<Activity size={14} />} />
              <DriverInput label="Managed Services / SLA" value={costs.managedServices} onChange={(v) => updateCost('managedServices', v)} total={totalCostBase} icon={<ShieldCheck size={14} />} />
              <DriverInput label="Professional Services" value={costs.laborProfessional} onChange={(v) => updateCost('laborProfessional', v)} total={totalCostBase} icon={<Briefcase size={14} />} />
              <DriverInput label="Risk & Overhead" value={costs.overheadRisk} onChange={(v) => updateCost('overheadRisk', v)} total={totalCostBase} icon={<AlertCircle size={14} />} />
            </div>

            <div className="pt-10 border-t border-slate-100">
               <div className="flex justify-between items-end mb-6">
                  <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Contingency Reserve (AI Adjusted)</span>
                  <span className="text-sm font-black text-[#D32F2F]">{contingency}%</span>
               </div>
               <input 
                  type="range" 
                  min="0" 
                  max="30" 
                  value={contingency}
                  onChange={(e) => setContingency(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-[#D32F2F]"
               />
               <div className="mt-4 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                 <span>No Buffer</span>
                 <span>Amount: PKR {contingencyAmount.toLocaleString()}</span>
                 <span>Max Safety (30%)</span>
               </div>
            </div>
          </div>
        </div>

        {/* Commercial Analysis Sidebar */}
        <div className="space-y-6">
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                 <DollarSign size={140} />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Actual Bid Margin</p>
                <div className="text-6xl font-black text-[#FFC107] tracking-tighter mb-4">{actualMargin.toFixed(1)}%</div>
                <span className={clsx(
                  "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  actualMargin < targetMargin ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                )}>
                  {actualMargin < targetMargin ? 'Below Target' : 'Optimum Performance'}
                </span>
                
                <div className="space-y-6 pt-10 border-t border-white/10 text-xs font-bold text-slate-400 mt-10">
                  <div className="flex justify-between items-center">
                    <span>Proposed TCV</span>
                    <span className="text-white font-black">PKR {(targetPrice / 1000000).toFixed(2)}M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Cost Base</span>
                    <span className="text-white font-black">PKR {(totalCostWithContingency / 1000000).toFixed(2)}M</span>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[#FFC107] uppercase tracking-widest text-[9px] font-black">Gross Profit</span>
                    <span className="text-[#FFC107] font-black text-lg">PKR {(grossProfit / 1000000).toFixed(2)}M</span>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-white rounded-[3rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-red-50 rounded-xl text-[#D32F2F]"><Zap size={20} /></div>
                 <div>
                    <h4 className="text-sm font-black uppercase tracking-tight">AI Pricing Insight</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Analysis: {selectedBid?.projectName || 'No Bid'}</p>
                 </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-4">
                Competitor benchmarks in the {selectedBid?.requiredSolutions[0] || 'Tech'} domain suggest a price ceiling.
              </p>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                 <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />
                 <span className="text-[10px] text-emerald-700 font-bold leading-relaxed">
                   Commercial structure is compliant with internal P&L guidelines.
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const DriverInput: React.FC<{ label: string; value: number; onChange: (v: string) => void; total: number; icon: React.ReactNode }> = ({ label, value, onChange, total, icon }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-4 group">
      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 transition-colors group-hover:text-slate-700">
        {icon} {label}
      </label>
      <div className="relative">
        <input 
          type="text" 
          value={value.toLocaleString()}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-black text-slate-900 shadow-sm focus:ring-2 focus:ring-[#D32F2F] focus:bg-white transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-300 uppercase">
          {percentage.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default MarginCalculator;