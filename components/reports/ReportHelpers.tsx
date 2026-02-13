import React from 'react';
import { BidRecord, BidStatus, BidStage } from '../../types.ts';
import { calculateDaysInStages } from '../../services/utils.ts';
import { clsx } from 'clsx';

// =============== STAGE COLORS ===============
export const STAGE_COLORS: Record<string, string> = {
  [BidStage.INTAKE]: 'bg-slate-400',
  [BidStage.QUALIFICATION]: 'bg-amber-400',
  [BidStage.SOLUTIONING]: 'bg-sky-500',
  [BidStage.PRICING]: 'bg-indigo-500',
  [BidStage.COMPLIANCE]: 'bg-emerald-500',
  [BidStage.FINAL_REVIEW]: 'bg-[#D32F2F]'
};

// =============== SHARED FILTER STATE TYPE ===============
export interface ReportFilters {
  filterStatus: BidStatus | 'All';
  filterStage: BidStage | 'All';
  filterSolution: string;
  filterRegion: string;
  filterChannel: string;
  filterJBC: string;
  filterComplexity: string;
  searchQuery: string;
  quickHorizon: 'All' | 'This Week' | 'This Month' | 'This Quarter' | 'YTD';
  dateType: 'received' | 'deadline' | 'published';
  dateRange: { start: string; end: string };
}

export const DEFAULT_FILTERS: ReportFilters = {
  filterStatus: 'All',
  filterStage: 'All',
  filterSolution: 'All',
  filterRegion: 'All',
  filterChannel: 'All',
  filterJBC: 'All',
  filterComplexity: 'All',
  searchQuery: '',
  quickHorizon: 'All',
  dateType: 'received',
  dateRange: { start: '', end: '' }
};

// =============== FILTER LOGIC ===============
export const applyFilters = (bids: BidRecord[], filters: ReportFilters): BidRecord[] => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return bids.filter(b => {
    const matchesSearch = !filters.searchQuery || [
      b.projectName, b.customerName, b.jbcName, b.region, b.channel, b.complexity, b.id
    ].some(f => f && f.toLowerCase().includes(filters.searchQuery.toLowerCase()));

    let matchesStatus = false;
    if (filters.filterStatus === 'All') matchesStatus = true;
    else if (filters.filterStatus === BidStatus.ACTIVE) {
      const parts = b.deadline.split('-');
      const dl = parts.length >= 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(b.deadline);
      matchesStatus = b.status === BidStatus.ACTIVE && dl >= startOfToday;
    } else if (filters.filterStatus === BidStatus.NOT_SUBMITTED || filters.filterStatus === ('Not Submitted' as any)) {
      const parts = b.deadline.split('-');
      const dl = parts.length >= 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(b.deadline);
      matchesStatus = b.status === BidStatus.ACTIVE && dl < startOfToday;
    } else matchesStatus = b.status === filters.filterStatus;

    const matchesStage = filters.filterStage === 'All' || b.currentStage === filters.filterStage;
    const matchesSolution = filters.filterSolution === 'All' || (b.requiredSolutions || []).includes(filters.filterSolution);
    const matchesRegion = filters.filterRegion === 'All' || b.region === filters.filterRegion;
    const matchesChannel = filters.filterChannel === 'All' || b.channel === filters.filterChannel;
    const matchesJBC = filters.filterJBC === 'All' || b.jbcName === filters.filterJBC;
    const matchesComplexity = filters.filterComplexity === 'All' || b.complexity === filters.filterComplexity;

    // Date range filtering
    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return null;
      if (dateStr.includes('T')) return new Date(dateStr);
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    let matchesRange = true;
    const targetDateStr = filters.dateType === 'deadline' ? b.deadline :
      filters.dateType === 'published' ? (b.publishDate || '') : b.receivedDate;
    const bidDate = parseLocalDate(targetDateStr);

    if (filters.dateRange.start || filters.dateRange.end) {
      if (!bidDate) matchesRange = false;
      else {
        if (filters.dateRange.start) { const s = parseLocalDate(filters.dateRange.start); if (s) matchesRange = matchesRange && bidDate >= s; }
        if (filters.dateRange.end) { const e = parseLocalDate(filters.dateRange.end); if (e) { e.setHours(23, 59, 59, 999); matchesRange = matchesRange && bidDate <= e; } }
      }
    }

    if (filters.quickHorizon !== 'All' && bidDate) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (filters.quickHorizon === 'This Week') {
        const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
        matchesRange = matchesRange && bidDate >= startOfWeek;
      } else if (filters.quickHorizon === 'This Month') {
        matchesRange = matchesRange && bidDate >= new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (filters.quickHorizon === 'This Quarter') {
        const qStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        matchesRange = matchesRange && bidDate >= qStart;
      } else if (filters.quickHorizon === 'YTD') {
        matchesRange = matchesRange && bidDate >= new Date(today.getFullYear(), 0, 1);
      }
    } else if (filters.quickHorizon !== 'All' && !bidDate) matchesRange = false;

    return matchesStatus && matchesStage && matchesSearch && matchesSolution && matchesRegion && matchesChannel && matchesJBC && matchesComplexity && matchesRange;
  });
};

// =============== STAT CALCULATIONS ===============
export const computeStats = (filteredBids: BidRecord[]) => {
  const total = filteredBids.length || 1;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const won = filteredBids.filter(b => b.status === BidStatus.WON);
  const lost = filteredBids.filter(b => b.status === BidStatus.LOST);
  const submitted = filteredBids.filter(b => b.status === BidStatus.SUBMITTED);
  const active = filteredBids.filter(b => {
    const parts = b.deadline.split('-');
    const dl = parts.length >= 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(b.deadline);
    return b.status === BidStatus.ACTIVE && dl >= startOfToday;
  });
  const notSubmitted = filteredBids.filter(b => {
    const parts = b.deadline.split('-');
    const dl = parts.length >= 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(b.deadline);
    return b.status === BidStatus.ACTIVE && dl < startOfToday;
  });
  const noBid = filteredBids.filter(b => b.status === BidStatus.NO_BID);

  const totalValue = filteredBids.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);
  const wonValue = won.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);
  const activeValue = active.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);

  // Avg cycle time
  const completedBids = filteredBids.filter(b =>
    [BidStatus.SUBMITTED, BidStatus.WON, BidStatus.LOST].includes(b.status as BidStatus)
  );
  const validBids = completedBids.filter(b => {
    const start = b.stageHistory?.[0]?.timestamp || b.receivedDate;
    const end = b.submissionDate || new Date().toISOString();
    return !isNaN(new Date(start).getTime()) && !isNaN(new Date(end).getTime());
  });
  const avgCycle = validBids.length > 0
    ? validBids.reduce((acc, b) => {
      const s = new Date(b.stageHistory?.[0]?.timestamp || b.receivedDate);
      const e = new Date(b.submissionDate || new Date().toISOString());
      return acc + Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    }, 0) / validBids.length : 0;

  const winRate = (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const pursued = active.length + submitted.length + won.length + lost.length;
  const bidNoBidRatio = noBid.length > 0 ? `${pursued}:${noBid.length}` : `${pursued}:0`;

  return {
    total: filteredBids.length, won, lost, submitted, active, notSubmitted, noBid,
    totalValue, wonValue, activeValue, avgCycle: avgCycle.toFixed(1), winRate, bidNoBidRatio,
    wonPercent: Math.round((won.length / total) * 100),
    lostPercent: Math.round((lost.length / total) * 100),
    submittedPercent: Math.round((submitted.length / total) * 100),
    activePercent: Math.round((active.length / total) * 100),
    noBidPercent: Math.round((noBid.length / total) * 100),
    notSubmittedPercent: Math.round((notSubmitted.length / total) * 100),
  };
};

// =============== WIN RATE BY DIMENSION ===============
export const winRateByDimension = (bids: BidRecord[], getter: (b: BidRecord) => string | string[] | undefined) => {
  const groups: Record<string, { total: number; won: number; lost: number; noBid: number; value: number }> = {};
  bids.forEach(b => {
    const raw = getter(b);
    const keys = Array.isArray(raw) ? raw : [raw || 'Unknown'];
    keys.forEach(key => {
      if (!groups[key]) groups[key] = { total: 0, won: 0, lost: 0, noBid: 0, value: 0 };
      groups[key].total++;
      groups[key].value += b.estimatedValue || 0;
      if (b.status === BidStatus.WON) groups[key].won++;
      if (b.status === BidStatus.LOST) groups[key].lost++;
      if (b.status === BidStatus.NO_BID) groups[key].noBid++;
    });
  });
  return Object.entries(groups).map(([key, v]) => ({
    key,
    ...v,
    winRate: (v.won + v.lost) > 0 ? Math.round((v.won / (v.won + v.lost)) * 100) : 0,
    noBidRate: v.total > 0 ? Math.round((v.noBid / v.total) * 100) : 0
  })).sort((a, b) => b.total - a.total);
};

// =============== MONTHLY TREND ===============
export const monthlyTrend = (bids: BidRecord[], months = 12) => {
  const now = new Date();
  const result: { label: string; won: number; lost: number; noBid: number; submitted: number; active: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const m = d.getMonth(); const y = d.getFullYear();
    const inMonth = bids.filter(b => {
      const rd = new Date(b.receivedDate);
      return rd.getMonth() === m && rd.getFullYear() === y;
    });
    result.push({
      label,
      won: inMonth.filter(b => b.status === BidStatus.WON).length,
      lost: inMonth.filter(b => b.status === BidStatus.LOST).length,
      noBid: inMonth.filter(b => b.status === BidStatus.NO_BID).length,
      submitted: inMonth.filter(b => b.status === BidStatus.SUBMITTED).length,
      active: inMonth.filter(b => b.status === BidStatus.ACTIVE).length,
    });
  }
  return result;
};

// =============== SHARED UI COMPONENTS ===============
export const KPIStat: React.FC<{ label: string; value: string; sub: string; color: string; icon: React.ReactNode; progress?: number }> = ({ label, value, sub, color, icon, progress }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group text-left">
    <div className="flex items-center justify-between mb-4"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span><div className={clsx("p-2.5 bg-slate-50 rounded-xl transition-transform group-hover:scale-110", color)}>{icon}</div></div>
    <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{sub}</div>
    {progress !== undefined && (<div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, progress)}%` }}></div></div>)}
  </div>
);

export const LegendItem: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full shadow-sm ${color}`}></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span></div>
);

export const SectionCard: React.FC<{ title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, subtitle, icon, children, className }) => (
  <div className={clsx("bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden", className)}>
    <div className="p-8 border-b border-slate-100">
      <div className="flex items-center gap-3">
        {icon && <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>}
        <div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="p-8">{children}</div>
  </div>
);

export const MiniBar: React.FC<{ value: number; max: number; color: string; label?: string }> = ({ value, max, color, label }) => (
  <div className="flex items-center gap-3 w-full">
    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
      <div className={clsx("h-full rounded-full transition-all duration-700", color)} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}></div>
    </div>
    {label && <span className="text-[10px] font-black text-slate-500 w-10 text-right shrink-0">{label}</span>}
  </div>
);

export const formatPKR = (v: number) => {
  if (v >= 1e9) return `PKR ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `PKR ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `PKR ${(v / 1e3).toFixed(0)}K`;
  return `PKR ${v}`;
};

export const SendIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);
