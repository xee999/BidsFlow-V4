import React from 'react';
import { Target, Briefcase, Activity, ChevronRight, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { BidRecord, BidStage } from '../../types';
import { sanitizeDateValue } from '../../services/utils';

interface StatBoxProps {
    label: string;
    value: string;
    color?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, color = "text-slate-900" }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className={clsx("text-lg font-black", color)}>{value}</div>
    </div>
);

interface BidLifecycleSidebarProps {
    bid: BidRecord;
    remainingDays: number;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

const BidLifecycleSidebar: React.FC<BidLifecycleSidebarProps> = ({
    bid,
    remainingDays,
    sidebarCollapsed,
    setSidebarCollapsed
}) => {
    return (
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
                            <p className="text-[8px] font-bold text-slate-500 uppercase">{sanitizeDateValue(bid.deadline) || bid.deadline}</p>
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
    );
};

export default BidLifecycleSidebar;
