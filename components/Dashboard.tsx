
import React, { useMemo } from 'react';
import {
  TrendingUp, Clock, AlertCircle, ArrowUpRight, Plus,
  Calendar, Activity, CheckCircle2, Briefcase,
  Target, Ban, DollarSign, Zap, Sparkles, ShieldAlert,
  FileWarning
} from 'lucide-react';
import { BidRecord, BidStatus, BidStage, RiskLevel, User, ActivityLog } from '../types.ts';
import { clsx } from 'clsx';

interface DashboardProps {
  bids: BidRecord[];
  user: User;
  auditTrail: ActivityLog[];
  onNewBid: () => void;
  onViewBid: (bidId: string) => void;
  onNavigateToFilter: (status: string) => void;
}

const STAGE_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  [BidStage.INTAKE]: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  [BidStage.QUALIFICATION]: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  [BidStage.SOLUTIONING]: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  [BidStage.PRICING]: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  [BidStage.COMPLIANCE]: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  [BidStage.FINAL_REVIEW]: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
};

const SOLUTION_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  'Quantica': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'GSM Data': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  'M2M (Devices Only)': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  'IoT': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'IT Devices (Laptop/Desktop)': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  'Mobile Devices (Phone or Tablet)': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
  'CPaaS': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  'Cloud & IT': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Managed Services': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  'Fixed Connectivity': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  'System Integration': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' }
};

const Dashboard: React.FC<DashboardProps> = ({ bids, user, auditTrail, onNewBid, onViewBid, onNavigateToFilter }) => {
  const [sortBy, setSortBy] = React.useState<'priority' | 'due' | 'intake'>('priority');

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
  }, []);

  const getDaysLeft = (dateStr: string) => {
    const deadline = new Date(dateStr);
    const today = new Date();
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const calculateIntegrity = (bid: BidRecord) => {
    const weights = bid.integrityScoreBreakdown || { technicalWeight: 30, complianceWeight: 30, commercialWeight: 30, legalWeight: 10 };
    const techItems = bid.technicalQualificationChecklist || [];
    const compItems = bid.complianceChecklist || [];
    const finItems = bid.financialFormats || [];
    const techScore = techItems.length > 0 ? (techItems.filter(i => i.status === 'Complete').length / techItems.length) * weights.technicalWeight : weights.technicalWeight;
    const compScore = compItems.length > 0 ? (compItems.filter(i => i.status === 'Complete').length / compItems.length) * weights.complianceWeight : weights.complianceWeight;
    const commScore = finItems.length > 0 ? (finItems.filter(i => (i.unitPrice ?? 0) > 0).length / finItems.length) * weights.commercialWeight : 0;
    const legalScore = (bid.managementApprovalStatus === 'Approved' ? 1 : 0) * weights.legalWeight;
    return Math.round(techScore + compScore + commScore + legalScore);
  };

  const getPriorityContext = (bid: BidRecord) => {
    let score = 0;
    let reason = "Standard Track";
    let icon = <Briefcase size={12} />;
    const daysLeft = getDaysLeft(bid.deadline);
    const integrity = calculateIntegrity(bid);

    // 1. Highest Revenue (Scale: 1 point per 1M PKR)
    const revenueM = (bid.estimatedValue || 0) / 1000000;
    score += revenueM;

    // 2. Critical Deadline (Huge boost for immediate urgency)
    if (daysLeft <= 3) {
      score += 500;
      reason = "Critical Deadline";
      icon = <Clock size={12} className="text-red-500" />;
    } else if (daysLeft <= 7) {
      score += 200;
    }

    // 3. High Risk Intervention
    if (bid.riskLevel === RiskLevel.HIGH) {
      score += 300;
      if (reason === "Standard Track") {
        reason = "Risk Intervention";
        icon = <ShieldAlert size={12} className="text-red-500" />;
      }
    }

    // 4. Behind in Target (Low integrity with approaching deadline)
    const isBehind = integrity < 50 && daysLeft < 10;
    if (isBehind) {
      score += 250;
      if (reason === "Standard Track") {
        reason = "Behind Target";
        icon = <AlertCircle size={12} className="text-orange-500" />;
      }
    }

    // Aesthetic context if reason is still standard but it's high value
    if (reason === "Standard Track" && revenueM >= 100) {
      reason = "High Value Strategic";
      icon = <DollarSign size={12} className="text-amber-500" />;
    }

    return { score, reason, icon };
  };

  const prioritizedBids = useMemo(() => {
    let mapped = bids
      .filter(b => b.status === BidStatus.ACTIVE)
      .map(b => ({ ...b, aiContext: getPriorityContext(b), integrity: calculateIntegrity(b) }));

    if (sortBy === 'priority') {
      // Sort by score descending (Highest Priority first)
      mapped.sort((a, b) => b.aiContext.score - a.aiContext.score);
    } else if (sortBy === 'due') {
      // Nearest due date (Chronological ascending - soonest first)
      mapped.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    } else if (sortBy === 'intake') {
      // Last received (Chronological descending - newest first)
      mapped.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
    }

    return mapped;
  }, [bids, sortBy]);

  const stats = useMemo(() => {
    const active = bids.filter(b => b.status === BidStatus.ACTIVE);
    const highRiskActive = active.filter(b => b.riskLevel === RiskLevel.HIGH);
    const noBidsThisMonth = bids.filter(b => b.status === BidStatus.NO_BID && isCurrentMonth(b.receivedDate));
    const winsThisMonth = bids.filter(b => b.status === BidStatus.WON && isCurrentMonth(b.submissionDate || b.deadline));
    const submittedMonth = bids.filter(b => b.status === BidStatus.SUBMITTED && isCurrentMonth(b.submissionDate));
    const activeValue = active.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);
    return { activeCount: active.length, highRiskCount: highRiskActive.length, noBidCount: noBidsThisMonth.length, winsMonthCount: winsThisMonth.length, activeValue };
  }, [bids]);

  const deadlines = [...prioritizedBids].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 4);

  const getRoleDisplayName = (role: string) => {
    const roleLabels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'BID_TEAM': 'Bids Team',
      'VIEWER': 'Viewer',
      'BidsTeam': 'Jazz Bids Team',
      'Sales': 'Jazz Sales Team',
      'Management': 'Jazz Management',
      'Technical': 'Jazz Technical Team'
    };
    return roleLabels[role] || role.replace(/_/g, ' ');
  };

  const getModalityIcon = (modality: ActivityLog['modality']) => {
    switch (modality) {
      case 'sparkles': return <Sparkles size={14} className="text-amber-500" />;
      case 'zap': return <Zap size={14} className="text-[#D32F2F]" />;
      case 'check': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'alert': return <AlertCircle size={14} className="text-red-500" />;
      default: return <Activity size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-10 pb-24">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bid Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">
            Welcome back, <span className="text-slate-900 font-bold">{user.name}</span> - <span className="text-[#D32F2F] font-bold">{user.roleName || getRoleDisplayName(user.role)}</span>
          </p>
        </div>
        {user.role !== 'VIEWER' && (
          <button onClick={onNewBid} className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl shadow-red-100 transition-all active:scale-95">
            <Plus size={18} /> New Bid Intake
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Scorecard label="Total Active" value={stats.activeCount} sub="LIVE PIPELINE" icon={<Briefcase size={20} className="text-blue-500" />} color="blue" onClick={() => onNavigateToFilter('Active')} />
        <Scorecard label="High Risk Bids" value={stats.highRiskCount} sub="REQUIRING ACTION" icon={<AlertCircle size={20} className="text-red-500" />} color="red" pulse={stats.highRiskCount > 0} onClick={() => onNavigateToFilter('Active')} />
        <Scorecard label={`No Bids (${currentMonthName})`} value={stats.noBidCount} sub="STRATEGIC REJECTION" icon={<Ban size={20} className="text-slate-500" />} color="slate" onClick={() => onNavigateToFilter('No Bid')} />
        <Scorecard label={`Wins (${currentMonthName})`} value={stats.winsMonthCount} sub="TARGET ACHIEVED" icon={<Target size={20} className="text-emerald-500" />} color="emerald" onClick={() => onNavigateToFilter('Won')} />
        <Scorecard label="Total Active Value" value={`PKR ${(stats.activeValue / 1000000).toFixed(0)}M`} sub="ESTIMATED REVENUE" icon={<DollarSign size={20} className="text-amber-500" />} color="amber" onClick={() => onNavigateToFilter('Active')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Priority Pipeline</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-red-50 text-[#D32F2F] text-[9px] font-black rounded uppercase tracking-widest border border-red-100 flex items-center gap-1">
                      <Zap size={10} /> AI Optimized
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex bg-slate-50/80 p-0.5 rounded-xl border border-slate-100 shadow-inner backdrop-blur-sm">
                  <button
                    onClick={() => setSortBy('priority')}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      sortBy === 'priority' ? "bg-[#0F172A] text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-white"
                    )}
                  >
                    <Zap size={12} /> Priority
                  </button>
                  <button
                    onClick={() => setSortBy('due')}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      sortBy === 'due' ? "bg-[#0F172A] text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-white"
                    )}
                  >
                    <Clock size={12} /> Due Date
                  </button>
                  <button
                    onClick={() => setSortBy('intake')}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      sortBy === 'intake' ? "bg-[#0F172A] text-white shadow-lg shadow-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-white"
                    )}
                  >
                    <Calendar size={12} /> Intake
                  </button>
                </div>

                <div className="h-8 w-px bg-slate-100"></div>

                <button onClick={() => onNavigateToFilter('All')} className="text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center gap-2 group">
                  Full Repository <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {prioritizedBids.length > 0 ? prioritizedBids.map((bid) => {
                const stageColor = STAGE_COLORS[bid.currentStage] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' };
                const solutionName = bid.requiredSolutions[0] || 'Solution TBD';
                const solutionColor = SOLUTION_COLORS[solutionName] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' };

                return (
                  <div key={bid.id} onClick={() => onViewBid(bid.id)} className="p-8 rounded-[2rem] border border-slate-100 hover:border-[#D32F2F] hover:shadow-xl transition-all cursor-pointer group flex flex-col gap-6 relative">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bid.id}</span>
                          <span className={clsx(
                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                            stageColor.bg, stageColor.text, stageColor.border
                          )}>
                            {bid.currentStage}
                          </span>
                          <span className={clsx(
                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                            solutionColor.bg, solutionColor.text, solutionColor.border
                          )}>
                            {solutionName}
                          </span>
                          <div className={clsx("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm", bid.aiContext.score >= 100 ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-600 border-slate-200")}>{bid.aiContext.icon} {bid.aiContext.reason}</div>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-[#D32F2F] transition-colors mt-2">{bid.projectName}</h3>
                        <div className="flex items-center gap-2 text-slate-400"><span className="text-xs font-bold">{bid.customerName}</span><span className="text-slate-200">|</span><span className="text-xs font-black text-slate-900">PKR {(bid.estimatedValue / 1000000).toFixed(1)}M</span></div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={clsx("flex items-center gap-2", getDaysLeft(bid.deadline) <= 3 ? "text-red-500" : "text-slate-400")}><Clock size={14} /><span className="text-xs font-black uppercase tracking-tighter">{getDaysLeft(bid.deadline) <= 3 ? "URGENT" : "TIMELINE"}</span></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{bid.deadline}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Bid Progression</span>
                        <span className="text-slate-900">{bid.integrity}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#D32F2F] transition-all duration-1000" style={{ width: `${bid.integrity}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              }) : <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-sm italic">No priority pipeline bids found</div>}
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2"><Calendar size={18} className="text-[#D32F2F]" /> Critical Deadlines</h3>
            <div className="space-y-4">
              {deadlines.length > 0 ? deadlines.map(bid => (
                <div key={bid.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-white hover:shadow-lg transition-all">
                  <div className="min-w-0"><p className="text-xs font-black text-slate-900 truncate group-hover:text-[#D32F2F]">{bid.projectName}</p><p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{bid.deadline}</p></div>
                  <div className={clsx("text-white text-[9px] font-black px-2 py-1 rounded-lg", getDaysLeft(bid.deadline) <= 3 ? "bg-red-500" : "bg-slate-400")}>{getDaysLeft(bid.deadline) <= 3 ? "DUE" : "SOON"}</div>
                </div>
              )) : <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4 italic">No upcoming deadlines</p>}
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2"><Activity size={18} className="text-[#D32F2F]" /> Audit Trail</h3>
            <div className="space-y-6">
              {auditTrail.map((act) => (
                <div key={act.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-500 shrink-0 uppercase">{act.userName.split(' ').map(n => n[0]).join('')}</div>
                  <div className="min-w-0 flex-1"><p className="text-[11px] text-slate-600 leading-snug"><span className="font-black text-slate-900">{act.userName}</span><span className="text-[9px] text-[#D32F2F] font-bold mx-1 uppercase">[{act.userRoleName || getRoleDisplayName(act.userRole as any)}]</span> {act.action} <span className="font-black text-slate-900">{act.target}</span></p><p className="text-[9px] text-slate-400 font-bold mt-0.5">{act.subText}</p><p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{act.timestamp}</p></div>
                  <div className="shrink-0">{getModalityIcon(act.modality)}</div>
                </div>
              ))}
              {auditTrail.length === 0 && <p className="text-xs text-slate-400 text-center py-4 italic">No recent activity detected.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Scorecard: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; pulse?: boolean; onClick?: () => void; }> = ({ label, value, sub, icon, color, pulse, onClick }) => (
  <div onClick={onClick} className={clsx("bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden", onClick ? "cursor-pointer active:scale-95" : "")}>
    {pulse && <div className="absolute top-0 right-0 p-2"><span className="flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span></div>}
    <div className="flex items-center gap-3 mb-4"><div className={clsx("p-2.5 rounded-xl transition-all group-hover:scale-110", `bg-${color}-50`)}>{icon}</div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</span></div>
    <div className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-[#D32F2F] transition-colors">{value}</div>
    {sub && <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{sub}</p>}
  </div>
);

export default Dashboard;
