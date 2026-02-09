import React, { useMemo } from 'react';
import {
    Clock,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Timer,
    TrendingDown,
    TrendingUp,
    ArrowRight,
    ShieldAlert,
    Zap,
    Activity
} from 'lucide-react';
import { BidRecord, BidStatus, BidStage } from '../types.ts';
import { STAGE_COLORS } from './ReportsView.tsx';
import { clsx } from 'clsx';
import { sanitizeDateValue, calculateDaysInStages } from '../services/utils';

interface BidTimeTrackerViewProps {
    bids: BidRecord[];
}

const BidTimeTrackerView: React.FC<BidTimeTrackerViewProps> = ({ bids }) => {
    const getDaysBetween = (start: string | undefined, end: string | undefined) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);

        // Handle invalid dates
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;

        const diffTime = e.getTime() - s.getTime();
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    };

    // Phase weights by complexity - High prioritizes Solutioning (60%) and Pricing (25%)
    const PHASE_WEIGHTS: Record<string, Record<string, number>> = {
        High: { Intake: 0.01, Qualification: 0.05, Solutioning: 0.60, Pricing: 0.25, Compliance: 0.07, 'Final Review': 0.02 },
        Medium: { Intake: 0.02, Qualification: 0.08, Solutioning: 0.45, Pricing: 0.25, Compliance: 0.18, 'Final Review': 0.02 },
        Low: { Intake: 0.05, Qualification: 0.10, Solutioning: 0.40, Pricing: 0.25, Compliance: 0.18, 'Final Review': 0.02 }
    };

    const getPhaseTargetDays = (totalDays: number, complexity: string = 'Medium', stage: string) => {
        const weights = PHASE_WEIGHTS[complexity] || PHASE_WEIGHTS.Medium;
        const weight = weights[stage] || 0.1;
        // Support fractional days, minimum 0.5d
        return Math.max(0.5, parseFloat((totalDays * weight).toFixed(1)));
    };

    const stats = useMemo(() => {
        const totalBids = bids.length;
        if (totalBids === 0) {
            return {
                avgIntakeLag: "0",
                avgMarketWindow: "0",
                avgTeamWindow: "0",
                captureRate: "0"
            };
        }

        const sumIntakeLag = bids.reduce((acc, b) => acc + (getDaysBetween(b.publishDate, b.receivedDate) || 0), 0);
        const sumMarketWindow = bids.reduce((acc, b) => acc + (getDaysBetween(b.publishDate, b.deadline) || 0), 0);
        const sumTeamWindow = bids.reduce((acc, b) => acc + (getDaysBetween(b.receivedDate, b.deadline) || 0), 0);

        const avgIntakeLag = Math.max(0, sumIntakeLag / totalBids);
        const avgMarketWindow = Math.max(0, sumMarketWindow / totalBids);
        const avgTeamWindow = Math.max(0, sumTeamWindow / totalBids);

        // Window Utilization logic: How much of the client-provided window was available to us?
        // If we get it the day it's published, it's 100%. If we get it halfway, it's 50%.
        const utilization = avgMarketWindow > 0
            ? Math.max(0, Math.min(100, (avgTeamWindow / avgMarketWindow) * 100))
            : 0;

        return {
            avgIntakeLag: (avgIntakeLag || 0).toFixed(1),
            avgMarketWindow: (avgMarketWindow || 0).toFixed(0),
            avgTeamWindow: (avgTeamWindow || 0).toFixed(0),
            captureRate: (utilization || 0).toFixed(0)
        };
    }, [bids]);

    return (
        <div className="space-y-10 animate-fade-in text-left">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opportunity Window</span>
                        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600"><Calendar size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">{stats.avgMarketWindow}d</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Avg. Client Submission Window</div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group border-b-4 border-b-red-500">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Intake Lag</span>
                        <div className="p-2.5 bg-red-50 rounded-xl text-red-600"><Timer size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 mb-1">{stats.avgIntakeLag}d</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Avg. Time from Publish to Internal Receipt</div>
                </div>

                <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-white/50">Team Prep Duration</span>
                        <div className="p-2.5 bg-white/10 rounded-xl text-white"><Clock size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">{stats.avgTeamWindow}d</div>
                    <div className="text-[9px] text-white/40 font-bold uppercase tracking-tight">Avg. Duration from Intake to Deadline</div>
                </div>

                <div className="bg-[#D32F2F] p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Window Utilization</span>
                        <div className="p-2.5 bg-white/10 rounded-xl text-white"><Zap size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">{stats.captureRate}%</div>
                    <div className="text-[9px] text-white/40 font-bold uppercase tracking-tight">Share of Market Window Captured</div>
                    <div className="mt-3 h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white transition-all duration-1000" style={{ width: `${stats.captureRate}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Main Tracker Table */}
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl relative">
                <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-t-[3rem]">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Activity className="text-[#D32F2F]" size={28} /> Bid Time Tracker
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 ml-10">Monitoring Market Window vs. Team Execution</p>
                    </div>
                    <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase">Intake Lag</span>
                        </div>
                        {Object.entries(STAGE_COLORS).map(([stage, color]) => (
                            <div key={stage} className="flex items-center gap-2">
                                <div className={clsx("w-3 h-3 rounded-full", color)}></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">{stage}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left table-fixed">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-4 py-4 w-[10%] truncate">Bid & Complexity</th>
                                <th className="px-4 py-4 w-[80%]">Time Distribution (Market Horizon)</th>
                                <th className="px-4 py-4 text-right w-[10%]">Phase Health</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {bids.map((bid, index) => {
                                const actualDaysInStages = calculateDaysInStages(bid.receivedDate, bid.stageHistory || [], bid.currentStage);
                                const intakeLag = getDaysBetween(bid.publishDate, bid.receivedDate);
                                const isFirst = index === 0;
                                const teamTime = getDaysBetween(bid.receivedDate, bid.deadline);
                                const totalWindow = getDaysBetween(bid.publishDate, bid.deadline) || 1;

                                const currentPhaseDays = actualDaysInStages[bid.currentStage] || 1;
                                const targetDays = getPhaseTargetDays(teamTime, bid.complexity, bid.currentStage);
                                const variance = parseFloat((currentPhaseDays - targetDays).toFixed(1));
                                const isOverBudget = variance > 0;

                                return (
                                    <tr key={bid.id} className="group group/row hover:bg-slate-50/50 transition-all relative hover:z-[60]">
                                        <td className="px-4 py-6 align-middle break-words">
                                            <div className="font-black text-slate-900 leading-tight text-[13px] group-hover:text-[#D32F2F] transition-colors">{bid.projectName}</div>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                <span className="text-[11px] font-black text-slate-400 border-b border-slate-100 pb-0.5 mb-1 w-full">{bid.id}</span>
                                                <span className={clsx(
                                                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0",
                                                    bid.complexity === 'High' ? "bg-red-50 text-red-600 border-red-100" :
                                                        bid.complexity === 'Medium' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                            "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                )}>
                                                    {bid.complexity}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate">{bid.customerName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 align-middle">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase px-1">
                                                    <span>{sanitizeDateValue(bid.publishDate) || bid.publishDate} (Published)</span>
                                                    <span>Deadline: {sanitizeDateValue(bid.deadline) || bid.deadline}</span>
                                                </div>
                                                <div className="h-10 w-full bg-slate-100 rounded-xl flex shadow-inner border border-slate-200">
                                                    {/* Intake Lag Bar */}
                                                    <div
                                                        className="h-full bg-slate-200 relative group/lag shrink-0 cursor-help transition-all hover:brightness-95 border-r border-white/20"
                                                        style={{ width: `${(intakeLag / totalWindow) * 100}%` }}
                                                    >
                                                        <div className={clsx(
                                                            "opacity-0 group-hover/lag:opacity-100 absolute left-1/2 -translate-x-1/2 bg-white/95 text-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.2)] rounded-3xl z-[100] pointer-events-none w-72 border border-slate-200 backdrop-blur-xl transition-all p-6 scale-90 group-hover/lag:scale-100",
                                                            isFirst ? "top-full mt-6 origin-top" : "bottom-full mb-6 origin-bottom"
                                                        )}>
                                                            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Timer size={16} /></div>
                                                                <div>
                                                                    <div className="font-black uppercase tracking-widest text-[#D32F2F] text-[10px]">Intake Lag</div>
                                                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Pre-Submission Delay</div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center mb-3">
                                                                <span className="text-[11px] text-slate-500 font-medium">Lost Opportunity:</span>
                                                                <span className="text-sm font-black text-slate-900">{intakeLag} Days</span>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 rounded-xl text-[10px] text-slate-600 leading-relaxed font-black border border-slate-100 italic">
                                                                "This is the time elapsed between publication and team intake. Every day lost here compresses our win window."
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Execution Horizon (Phases) */}
                                                    <div className="h-full flex-1 flex">
                                                        {Object.entries(actualDaysInStages).map(([stage, days]) => {
                                                            const pTarget = getPhaseTargetDays(teamTime, bid.complexity, stage);
                                                            const pVariance = parseFloat(((days as number) - pTarget).toFixed(1));
                                                            return (
                                                                <div
                                                                    key={stage}
                                                                    className={clsx(
                                                                        "h-full relative group/phase border-r border-white/10 last:border-0 cursor-help hover:brightness-110 transition-colors",
                                                                        STAGE_COLORS[stage] || 'bg-slate-400',
                                                                        stage === bid.currentStage && "animate-pulse group-hover/row:animate-none"
                                                                    )}
                                                                    style={{ width: `${((days as number) / totalWindow) * 100}%` }}
                                                                >
                                                                    <div className={clsx(
                                                                        "opacity-0 group-hover/phase:opacity-100 absolute left-1/2 -translate-x-1/2 bg-white/95 text-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.2)] rounded-3xl z-[100] pointer-events-none w-80 border border-slate-200 backdrop-blur-xl transition-all p-7 scale-90 group-hover/phase:scale-100",
                                                                        isFirst ? "top-full mt-6 origin-top" : "bottom-full mb-6 origin-bottom"
                                                                    )}>
                                                                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                                                                            <div className={clsx("p-2 rounded-lg text-white", STAGE_COLORS[stage] || 'bg-slate-400')}><Activity size={18} /></div>
                                                                            <div>
                                                                                <div className="font-black uppercase tracking-widest text-slate-900 text-[11px]">{stage}</div>
                                                                                <div className="text-[9px] text-slate-400 font-bold uppercase">Phase Performance</div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-3">
                                                                            <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-xl border border-slate-100">
                                                                                <span className="text-[11px] text-slate-500 font-medium italic">Current Progress</span>
                                                                                <span className="text-sm font-black text-slate-900">{days}d</span>
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                                                    <div className="text-[8px] text-slate-400 font-black uppercase mb-1">Target</div>
                                                                                    <div className="text-sm font-black text-slate-700">{pTarget}d</div>
                                                                                </div>
                                                                                <div className={clsx("p-3 rounded-xl border", pVariance > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100")}>
                                                                                    <div className={clsx("text-[8px] font-black uppercase mb-1", pVariance > 0 ? "text-red-400" : "text-emerald-400")}>Variance</div>
                                                                                    <div className={clsx("text-sm font-black", pVariance > 0 ? "text-red-600" : "text-emerald-600")}>
                                                                                        {pVariance > 0 ? `+${pVariance}d` : `${pVariance}d`}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className={clsx(
                                                                                "flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest mt-2",
                                                                                pVariance > 0 ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                                                                            )}>
                                                                                {pVariance > 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                                                                {pVariance > 0 ? 'Behind Schedule' : 'Ahead of Target'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-1">
                                                        <TrendingDown size={14} className="text-red-500" />
                                                        <span className="text-[10px] font-bold text-slate-600">{intakeLag}d Lost</span>
                                                    </div>
                                                    <ArrowRight size={10} className="text-slate-300" />
                                                    <div className="flex items-center gap-1">
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                        <span className="text-[10px] font-bold text-slate-600">{teamTime}d Team Ready</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-right align-middle">
                                            <div className="flex flex-col items-end">
                                                <div className={clsx(
                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest mb-2",
                                                    isOverBudget ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                )}>
                                                    {isOverBudget ? <AlertCircle size={14} /> : <ShieldAlert size={14} className="text-emerald-500 rotate-180" />}
                                                    {bid.currentStage}: {currentPhaseDays}d
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase">
                                                    Target Budget: <span className="text-slate-600 font-black">{targetDays}d</span>
                                                </div>
                                                <div className={clsx(
                                                    "text-[10px] font-black mt-1",
                                                    isOverBudget ? "text-red-500" : "text-emerald-500"
                                                )}>
                                                    {isOverBudget ? `+${variance}d Over Schedule` : `${Math.abs(variance)}d Under Budget`}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BidTimeTrackerView;
