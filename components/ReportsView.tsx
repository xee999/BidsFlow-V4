import React, { useMemo, useState, useEffect } from 'react';
import {
  Trophy,
  Target,
  Ban,
  Clock,
  CheckCircle2,
  ShieldAlert,
  History,
  Calendar,
  Timer,
  Filter,
  BarChart3,
  Activity,
  ArrowRight,
  Zap,
  ZapOff,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Search,
  X,
  Loader2,
  FileQuestion,
  Lightbulb,
  Briefcase,
  ChevronRight
} from 'lucide-react';
import { BidRecord, BidStatus, BidStage } from '../types.ts';
import { STAGE_ICONS, SOLUTION_OPTIONS } from '../constants.tsx';
import { calculateDaysInStages } from '../services/utils.ts';
import { analyzeNoBidReasons } from '../services/gemini.ts';
import { clsx } from 'clsx';
import BidTimeTrackerView from './BidTimeTrackerView.tsx';

interface ReportsViewProps {
  bids: BidRecord[];
}

export const STAGE_COLORS: Record<string, string> = {
  [BidStage.INTAKE]: 'bg-slate-400',
  [BidStage.QUALIFICATION]: 'bg-amber-400',
  [BidStage.SOLUTIONING]: 'bg-sky-500',
  [BidStage.PRICING]: 'bg-indigo-500',
  [BidStage.COMPLIANCE]: 'bg-emerald-500',
  [BidStage.FINAL_REVIEW]: 'bg-[#D32F2F]'
};

interface NoBidCategory {
  header: string;
  reasonCode: string;
  strategicAnalysis: string;
  projects: string[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ bids }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'velocity' | 'time-tracker' | 'no-bid'>('overview');

  // Filters State
  const [filterStatus, setFilterStatus] = useState<BidStatus | 'All'>('All');
  const [filterStage, setFilterStage] = useState<BidStage | 'All'>('All');
  const [filterSolution, setFilterSolution] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickHorizon, setQuickHorizon] = useState<'All' | 'This Week' | 'This Month'>('All');
  const [dateType, setDateType] = useState<'received' | 'deadline' | 'published'>('received');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // No-Bid Intelligence State
  const [isAnalyzingNoBids, setIsAnalyzingNoBids] = useState(false);
  const [noBidCategories, setNoBidCategories] = useState<NoBidCategory[]>([]);

  const noBidProjects = useMemo(() =>
    bids.filter(b => b.status === BidStatus.NO_BID && b.noBidReason),
    [bids]);

  const handleRunNoBidAnalysis = async () => {
    if (noBidProjects.length === 0) return;

    setIsAnalyzingNoBids(true);
    const data = noBidProjects.map(p => ({
      projectName: p.projectName,
      customerName: p.customerName,
      reason: p.noBidReason || 'No reason provided'
    }));

    const result = await analyzeNoBidReasons(data);
    if (result && result.categories) {
      setNoBidCategories(result.categories);
    }
    setIsAnalyzingNoBids(false);
  };

  const filteredBids = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return bids.filter(b => {
      // Search Filter
      const matchesSearch = b.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase());

      // Status Filter - Complex logic for Active vs Not Submitted
      let matchesStatus = false;
      if (filterStatus === 'All') {
        matchesStatus = true;
      } else if (filterStatus === BidStatus.ACTIVE) {
        const parts = b.deadline.split('-');
        const deadlineDate = parts.length >= 3
          ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
          : new Date(b.deadline);
        matchesStatus = b.status === BidStatus.ACTIVE && deadlineDate >= startOfToday;
      } else if (filterStatus === (BidStatus as any).NOT_SUBMITTED || filterStatus === 'Not Submitted') {
        const parts = b.deadline.split('-');
        const deadlineDate = parts.length >= 3
          ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
          : new Date(b.deadline);
        matchesStatus = b.status === BidStatus.ACTIVE && deadlineDate < startOfToday;
      } else {
        matchesStatus = b.status === filterStatus;
      }

      const matchesStage = filterStage === 'All' || b.currentStage === filterStage;
      const matchesSolution = filterSolution === 'All' || (b.requiredSolutions || []).includes(filterSolution);

      // Date Filtering Logic
      const parseLocalDate = (dateStr: string) => {
        if (!dateStr) return null;
        if (dateStr.includes('T')) return new Date(dateStr); // Handle ISO strings
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
      };

      let matchesRange = true;
      const targetDateStr = dateType === 'deadline' ? b.deadline :
        dateType === 'published' ? (b.publishDate || '') :
          b.receivedDate;
      const bidDate = parseLocalDate(targetDateStr);

      if (dateRange.start || dateRange.end) {
        if (!bidDate) {
          matchesRange = false;
        } else {
          if (dateRange.start) {
            const s = parseLocalDate(dateRange.start);
            if (s) matchesRange = matchesRange && bidDate >= s;
          }
          if (dateRange.end) {
            const e = parseLocalDate(dateRange.end);
            if (e) {
              e.setHours(23, 59, 59, 999);
              matchesRange = matchesRange && bidDate <= e;
            }
          }
        }
      }

      // Quick Horizon
      if (quickHorizon !== 'All') {
        if (!bidDate) {
          matchesRange = false;
        } else {
          if (quickHorizon === 'This Week') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            matchesRange = matchesRange && bidDate >= startOfWeek;
          } else if (quickHorizon === 'This Month') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            matchesRange = matchesRange && bidDate >= startOfMonth;
          }
        }
      }

      return matchesStatus && matchesStage && matchesSearch && matchesSolution && matchesRange;
    });
  }, [bids, filterStatus, filterStage, searchQuery, filterSolution, quickHorizon, dateType, dateRange]);

  const stats = useMemo(() => {
    const total = filteredBids.length || 1;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const won = filteredBids.filter(b => b.status === BidStatus.WON);
    const lost = filteredBids.filter(b => b.status === BidStatus.LOST);
    const submitted = filteredBids.filter(b => b.status === BidStatus.SUBMITTED);
    const active = filteredBids.filter(b => {
      const parts = b.deadline.split('-');
      const deadlineDate = parts.length >= 3
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(b.deadline);
      return b.status === BidStatus.ACTIVE && deadlineDate >= startOfToday;
    });
    const notSubmitted = filteredBids.filter(b => {
      const parts = b.deadline.split('-');
      const deadlineDate = parts.length >= 3
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(b.deadline);
      return b.status === BidStatus.ACTIVE && deadlineDate < startOfToday;
    });
    const noBid = filteredBids.filter(b => b.status === BidStatus.NO_BID);

    const totalValue = filteredBids.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);
    const wonValue = won.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);

    return {
      total: filteredBids.length,
      won: { count: won.length, percent: Math.round((won.length / total) * 100), value: wonValue },
      lost: { count: lost.length, percent: Math.round((lost.length / total) * 100) },
      submitted: { count: submitted.length, percent: Math.round((submitted.length / total) * 100) },
      active: { count: active.length, percent: Math.round((active.length / total) * 100) },
      notSubmitted: { count: notSubmitted.length, percent: Math.round((notSubmitted.length / total) * 100) },
      noBid: { count: noBid.length, percent: Math.round((noBid.length / total) * 100) },
      totalValue
    };
  }, [filteredBids]);

  const velocityInsights = useMemo(() => {
    if (filteredBids.length === 0) return null;

    const completedBids = filteredBids.filter(b =>
      b.status === BidStatus.SUBMITTED ||
      b.status === BidStatus.WON ||
      b.status === BidStatus.LOST
    );
    const avgCycle = completedBids.length > 0
      ? completedBids.reduce((acc: number, b: BidRecord) => {
        const start = b.stageHistory?.[0]?.timestamp || b.receivedDate;
        const end = b.submissionDate || new Date().toISOString();
        const s = new Date(start);
        const e = new Date(end);
        return acc + Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / completedBids.length
      : 0;

    // Detect bottleneck stage
    const stageTotals: Record<string, number> = {};
    filteredBids.forEach(bid => {
      const daysInStages = calculateDaysInStages(bid.receivedDate, bid.stageHistory || [], bid.currentStage);
      Object.entries(daysInStages).forEach(([stage, days]) => {
        stageTotals[stage] = (stageTotals[stage] || 0) + (days as number);
      });
    });

    let bottleneck = { name: 'None', avg: 0 };
    Object.entries(stageTotals).forEach(([name, total]: [string, any]) => {
      const avg = (total as number) / filteredBids.length;
      if (avg > bottleneck.avg) bottleneck = { name, avg };
    });

    return {
      avgCycle: avgCycle.toFixed(1),
      bottleneck,
      efficiencyIndex: (avgCycle < 15 ? 'High' : avgCycle < 25 ? 'Normal' : 'Low Warning')
    };
  }, [filteredBids]);

  const getDaysBetween = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const statusFilterConfigs = [
    { id: 'All', label: 'All', icon: <Filter size={14} />, activeClass: "bg-slate-900 text-white shadow-lg", inactiveClass: "text-slate-500 hover:bg-slate-100 border-slate-200" },
    { id: BidStatus.ACTIVE, label: 'Active', icon: <Clock size={14} />, activeClass: "bg-blue-600 text-white shadow-lg", inactiveClass: "text-blue-600 bg-blue-50/50 border-blue-100 hover:bg-blue-50" },
    { id: BidStatus.NOT_SUBMITTED, label: 'Not Submitted', icon: <AlertCircle size={14} />, activeClass: "bg-red-500 text-white shadow-lg", inactiveClass: "text-red-600 bg-red-50 border-red-100 hover:bg-red-50" },
    { id: BidStatus.SUBMITTED, label: 'Submitted', icon: <SendIcon size={14} />, activeClass: "bg-amber-500 text-white shadow-lg", inactiveClass: "text-amber-600 bg-amber-50/50 border-amber-100 hover:bg-amber-50" },
    { id: BidStatus.WON, label: 'Won', icon: <Trophy size={14} />, activeClass: "bg-emerald-600 text-white shadow-lg", inactiveClass: "text-emerald-600 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50" },
    { id: BidStatus.LOST, label: 'Lost', icon: <ZapOff size={14} />, activeClass: "bg-slate-500 text-white shadow-lg", inactiveClass: "text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100" },
    { id: BidStatus.NO_BID, label: 'No Bid', icon: <Ban size={14} />, activeClass: "bg-slate-400 text-white shadow-lg", inactiveClass: "text-slate-400 bg-slate-50 border-slate-100 hover:bg-slate-50" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in space-y-8 pb-20 text-left">
      {/* Tab Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Intelligence Studio</h1>
          <p className="text-slate-500 mt-1 font-medium">Strategic insights and performance tracking for Jazz Business</p>
        </div>

        <div className="flex p-1.5 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'overview' ? "bg-[#1E3A5F] text-white shadow-md" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <BarChart3 size={16} /> Overview
          </button>
          <button
            onClick={() => setActiveSubTab('velocity')}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'velocity' ? "bg-[#1E3A5F] text-white shadow-md" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Activity size={16} /> Velocity
          </button>
          <button
            onClick={() => setActiveSubTab('time-tracker')}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'time-tracker' ? "bg-[#1E3A5F] text-white shadow-md" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Timer size={16} /> Time Tracker
          </button>
          <button
            onClick={() => setActiveSubTab('no-bid')}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
              activeSubTab === 'no-bid' ? "bg-[#1E3A5F] text-white shadow-md" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Ban size={16} /> No-Bid Analysis
          </button>
        </div>
      </div>

      {/* Unified Filter Bar - Matching User Image */}
      {(activeSubTab === 'velocity' || activeSubTab === 'time-tracker' || activeSubTab === 'overview') && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in translate-y-[-10px] mb-2">
          {/* Row 1: Status and Quick Horizon */}
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Status</label>
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-[1.5rem] w-fit">
                {statusFilterConfigs.map((cfg) => (
                  <button
                    key={cfg.id}
                    onClick={() => setFilterStatus(cfg.id as any)}
                    className={clsx(
                      "flex items-center gap-2 px-4 py-2 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest transition-all",
                      filterStatus === cfg.id ? cfg.activeClass : cfg.inactiveClass
                    )}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Quick Horizon</label>
              <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-[1.5rem] w-fit ml-auto">
                {(['All', 'This Week', 'This Month'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setQuickHorizon(h)}
                    className={clsx(
                      "px-5 py-2 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest transition-all",
                      quickHorizon === h ? "bg-[#D32F2F] text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-white"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 w-full opacity-50"></div>

          {/* Row 2: Range, Phase, Solution */}
          <div className="flex flex-wrap items-end gap-8">
            <div className="space-y-2 min-w-[280px]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custom Range</label>
                </div>

                {/* Date Type Selector - From AllBids */}
                <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex gap-0.5">
                  {[
                    { id: 'received', label: 'Intake' },
                    { id: 'deadline', label: 'Due' },
                    { id: 'published', label: 'Published' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setDateType(type.id as any)}
                      className={clsx(
                        "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all",
                        dateType === type.id
                          ? "bg-white text-slate-900 shadow-sm border border-slate-100"
                          : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="w-4 h-0.5 bg-slate-200"></div>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 min-w-[180px]">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase size={12} className="text-slate-400" />
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phase</label>
              </div>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Phases</option>
                {Object.values(BidStage).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-2 min-w-[220px]">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={12} className="text-slate-400" />
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solution Portfolio</label>
              </div>
              <select
                value={filterSolution}
                onChange={(e) => setFilterSolution(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Solutions</option>
                {SOLUTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex-1"></div>

            <div className="relative flex-1 min-w-[200px] mb-0.5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="SEARCH BIDS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-14 pr-4 py-2.5 text-xs font-black uppercase tracking-widest placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'overview' ? (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPIStat label="Win Rate" value={`${stats.won.percent}%`} sub="YTD Performance" color="text-emerald-500" icon={<Trophy size={16} />} progress={stats.won.percent} />
            <KPIStat label="Total Pipeline" value={`PKR ${(stats.totalValue / 1000000).toFixed(1)}M`} sub="Estimated Value" color="text-blue-500" icon={<Target size={16} />} />
            <KPIStat label="No-Bid Rate" value={`${stats.noBid.percent}%`} sub="Strategic Rejection" color="text-red-500" icon={<Ban size={16} />} />
            <KPIStat label="Cycle Time" value="18.4d" sub="Avg. Submission" color="text-amber-500" icon={<Clock size={16} />} />
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 text-left">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Bid Portfolio Distribution</h2>
                <p className="text-xs text-slate-400 font-bold uppercase mt-1">Current Opportunity Landscape</p>
              </div>
              <div className="flex flex-wrap gap-6">
                <LegendItem label="Won" color="bg-emerald-500" />
                <LegendItem label="Lost" color="bg-slate-400" />
                <LegendItem label="No Bid" color="bg-red-500" />
                <LegendItem label="Active" color="bg-blue-500" />
                <LegendItem label="Submitted" color="bg-amber-500" />
              </div>
            </div>
            <div className="h-20 w-full flex rounded-[1.2rem] overflow-hidden shadow-inner border-[6px] border-white ring-1 ring-slate-100">
              <div className="h-full bg-emerald-500 hover:brightness-110 transition-all cursor-help" style={{ width: `${stats.won.percent}%` }} title={`Won: ${stats.won.count}`}></div>
              <div className="h-full bg-slate-400 hover:brightness-110 transition-all cursor-help" style={{ width: `${stats.lost.percent}%` }} title={`Lost: ${stats.lost.count}`}></div>
              <div className="h-full bg-red-500 hover:brightness-110 transition-all cursor-help" style={{ width: `${stats.noBid.percent}%` }} title={`No Bid: ${stats.noBid.count}`}></div>
              <div className="h-full bg-blue-500 hover:brightness-110 transition-all cursor-help" style={{ width: `${stats.active.percent}%` }} title={`Active: ${stats.active.count}`}></div>
              <div className="h-full bg-amber-500 hover:brightness-110 transition-all cursor-help" style={{ width: `${stats.submitted.percent}%` }} title={`Submitted: ${stats.submitted.count}`}></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 mt-10 text-center gap-8 md:divide-x md:divide-slate-100">
              <DistributionStat count={stats.won.count} label="Won" sub={`PKR ${(stats.won.value / 1000000).toFixed(1)}M`} />
              <DistributionStat count={stats.lost.count} label="Lost" sub="Historical" />
              <DistributionStat count={stats.noBid.count} label="No Bid" sub="Strategic" />
              <DistributionStat count={stats.active.count} label="Active" sub="Pipeline" />
              <DistributionStat count={stats.submitted.count} label="Submitted" sub="Evaluation" />
            </div>
          </div>
        </div>
      ) : activeSubTab === 'velocity' ? (
        <div className="space-y-8 animate-fade-in text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500"><TrendingUp size={64} /></div>
              <div className="flex items-center gap-2 mb-3"><Sparkles size={14} className="text-amber-400" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Avg. Submission Velocity</span></div>
              <div className="text-3xl font-black mb-1">{velocityInsights?.avgCycle}d</div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Per Opportunity Lifecycle</p>
            </div>
            <div className="bg-white border-2 border-[#D32F2F] rounded-[2rem] p-6 flex flex-col justify-center relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-500"><ZapOff size={64} className="text-[#D32F2F]" /></div>
              <div className="flex items-center gap-2 mb-3"><AlertCircle size={14} className="text-[#D32F2F]" /><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Identified Bottleneck</span></div>
              <div className="text-xl font-black text-slate-900 mb-1 uppercase tracking-tight">{velocityInsights?.bottleneck.name}</div>
              <p className="text-[9px] font-bold text-red-500 uppercase">Avg. {velocityInsights?.bottleneck.avg.toFixed(1)} days in phase</p>
            </div>
            <div className="bg-emerald-500 rounded-[2rem] p-6 text-white flex flex-col justify-center relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:-translate-y-2 transition-transform duration-500"><CheckCircle2 size={64} /></div>
              <div className="flex items-center gap-2 mb-3 text-white/80"><Zap size={14} className="text-white" /><span className="text-[9px] font-black uppercase tracking-widest">Efficiency Status</span></div>
              <div className="text-3xl font-black mb-1">{velocityInsights?.efficiencyIndex}</div>
              <p className="text-[9px] font-bold text-white/70 uppercase">Based on Benchmarks</p>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div><h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Activity className="text-[#D32F2F]" size={28} /> Lifecycle Velocity Track</h2></div>
              <div className="flex flex-wrap gap-4">{Object.entries(STAGE_COLORS).map(([stage, color]) => (<div key={stage} className="flex items-center gap-1.5"><div className={clsx("w-2 h-2 rounded-full", color)}></div><span className="text-[8px] font-black text-slate-400 uppercase">{stage}</span></div>))}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left table-fixed">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-[15%] truncate">Bid Identity</th>
                    <th className="px-6 py-4 w-[75%]">Stage Distribution (Days)</th>
                    <th className="px-6 py-4 text-right w-[10%]">Total Horizon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredBids.map((bid, index) => {
                    const isFirst = index === 0;
                    const startDate = bid.stageHistory?.[0]?.timestamp || bid.receivedDate;
                    const endDate = (bid.status === BidStatus.SUBMITTED || bid.status === BidStatus.WON || bid.status === BidStatus.LOST) ? (bid.submissionDate || new Date().toISOString()) : new Date().toISOString();
                    const totalDays = getDaysBetween(startDate, endDate);
                    return (
                      <tr key={bid.id} className="group group/row hover:bg-slate-50/50 transition-all relative hover:z-[60]">
                        <td className="px-6 py-6 align-top break-words">
                          <div className="font-black text-slate-900 leading-tight text-sm group-hover:text-[#D32F2F] transition-colors">{bid.projectName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-tight flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-300 border-b border-slate-50 pb-1">{bid.id}</span>
                            <span>{bid.customerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 align-top">
                          <div className="flex items-center w-full min-w-[500px] h-14 bg-slate-100 rounded-2xl p-1.5 border border-slate-200 relative shadow-inner">
                            {(() => {
                              const actualDaysInStages = calculateDaysInStages(bid.receivedDate, bid.stageHistory || [], bid.currentStage);
                              return Object.entries(actualDaysInStages).map(([stage, days], idx, arr) => {
                                // Find phase dates from history
                                const historyIdx = bid.stageHistory?.findIndex(h => h.stage === (stage as any));
                                const phaseStart = bid.stageHistory?.[historyIdx]?.timestamp || bid.receivedDate;
                                const phaseEnd = bid.stageHistory?.[historyIdx + 1]?.timestamp ||
                                  (stage === bid.currentStage ? new Date().toISOString() : null);

                                return (
                                  <div
                                    key={stage}
                                    className={clsx(
                                      "h-full flex items-center justify-center relative group/stage hover:brightness-110 transition-colors border-r border-white/20 last:border-0",
                                      STAGE_COLORS[stage] || 'bg-slate-300',
                                      idx === 0 ? "rounded-l-xl" : "",
                                      idx === arr.length - 1 ? "rounded-r-xl" : "",
                                      stage === bid.currentStage && "animate-pulse group-hover/row:animate-none"
                                    )}
                                    style={{ flex: (days as number) || 0.1 }}
                                  >
                                    {(days as number) > 0 && (
                                      <div className={clsx(
                                        "opacity-0 group-hover/stage:opacity-100 absolute left-1/2 -translate-x-1/2 bg-white/95 text-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.2)] rounded-3xl z-[100] pointer-events-none w-72 border border-slate-200 backdrop-blur-xl transition-all p-6 scale-90 group-hover/stage:scale-100",
                                        isFirst ? "top-full mt-6 origin-top" : "bottom-full mb-6 origin-bottom"
                                      )}>
                                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                                          <div className={clsx("p-2 rounded-lg text-white", STAGE_COLORS[stage] || 'bg-slate-400')}>
                                            <Activity size={18} />
                                          </div>
                                          <div>
                                            <div className="font-black uppercase tracking-widest text-slate-900 text-[11px]">{stage}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase">Phase Velocity</div>
                                          </div>
                                        </div>

                                        <div className="space-y-3">
                                          <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-[11px] text-slate-500 font-medium italic">Time Spent</span>
                                            <span className="text-sm font-black text-slate-900">{days}d</span>
                                          </div>

                                          <div className="grid grid-cols-1 gap-2">
                                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                              <div className="text-[9px] text-slate-400 font-black uppercase mb-2">Timeline Range</div>
                                              <div className="text-xs font-black text-slate-800 flex flex-col gap-2">
                                                <div className="flex justify-between">
                                                  <span className="text-slate-400 font-medium">Began:</span>
                                                  <span>{new Date(phaseStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                                {phaseEnd && (
                                                  <div className="flex justify-between border-t border-slate-200/50 pt-2">
                                                    <span className="text-slate-400 font-medium">Ended:</span>
                                                    <span>{new Date(phaseEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <span className="text-[10px] font-black text-white shadow-sm">{(days as number) > 0 ? `${days}d` : ''}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-6 text-right align-top"><div className="text-2xl font-black text-slate-900 leading-none">{totalDays}d</div><div className="text-[9px] font-bold text-slate-400 uppercase mt-1">Total Cycle</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'time-tracker' ? (
        <BidTimeTrackerView bids={filteredBids} />
      ) : (
        <div className="space-y-10 animate-fade-in text-left">
          <div className="bg-slate-900 p-12 rounded-[4rem] text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700"><Ban size={240} /></div>
            <div className="max-w-2xl relative z-10">
              <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-[#D32F2F] rounded-2xl shadow-lg"><ShieldAlert size={28} /></div><h2 className="text-4xl font-black tracking-tight">Strategic Rejection Intelligence</h2></div>
              <p className="text-lg text-slate-400 font-medium mb-8 leading-relaxed">Analyzing the reasons behind <span className="text-white font-bold">{noBidProjects.length} tactical rejections</span> to identify recurring friction points.</p>
              <button onClick={handleRunNoBidAnalysis} disabled={isAnalyzingNoBids || noBidProjects.length === 0} className="flex items-center gap-3 px-8 py-4 bg-[#D32F2F] hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl disabled:opacity-50 active:scale-95">{isAnalyzingNoBids ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} Generate AI Insights Report</button>
            </div>
          </div>

          {isAnalyzingNoBids ? (
            <div className="py-32 flex flex-col items-center justify-center gap-6 animate-pulse text-center"><Sparkles size={64} className="text-amber-400" /><p className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">Synthesizing Friction Themes</p></div>
          ) : noBidCategories.length > 0 ? (
            <div className="space-y-12">
              {/* Summary Table */}
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-8">
                <div className="flex items-center gap-3 mb-6 px-4">
                  <div className="p-2 bg-slate-100 rounded-lg"><BarChart3 size={20} className="text-slate-500" /></div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Rejection Landscape Summary</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-4">Strategy Category</th>
                        <th className="px-8 py-4">Primary Factor</th>
                        <th className="px-8 py-4 text-right">Count</th>
                        <th className="px-8 py-4 text-right">% Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {noBidCategories.map((cat, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 text-sm font-bold text-slate-800">{cat.header}</td>
                          <td className="px-8 py-4 text-xs font-medium text-slate-500">{cat.reasonCode || 'Various factors'}</td>
                          <td className="px-8 py-4 text-right text-sm font-bold text-slate-900">{cat.projects.length}</td>
                          <td className="px-8 py-4 text-right text-xs font-bold text-slate-400">
                            {noBidProjects.length > 0 ? Math.round((cat.projects.length / noBidProjects.length) * 100) : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deep Dive Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                {noBidCategories.map((cat, i) => (
                  <div key={i} className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-[#D32F2F] transition-all group">
                    <div className="p-10 border-b border-slate-50 bg-slate-50/30 text-left">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100"><Lightbulb className="text-amber-500" size={20} /></div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{cat.header}</h3>
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed">{cat.strategicAnalysis}</p>
                    </div>
                    <div className="p-10 flex-1 bg-white">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Affected Opportunities</h4>
                      <div className="space-y-3">
                        {cat.projects.map((proj, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]"></div>
                            <span className="text-xs font-black text-slate-700">{proj}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-slate-300 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 text-center"><FileQuestion size={80} className="opacity-10 mb-8" /><p className="text-xl font-black uppercase tracking-widest">Awaiting Analysis</p></div>
          )}
        </div>
      )}
    </div>
  );
};

const KPIStat: React.FC<{ label: string; value: string; sub: string; color: string; icon: React.ReactNode; progress?: number }> = ({ label, value, sub, color, icon, progress }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group text-left">
    <div className="flex items-center justify-between mb-4"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span><div className={clsx("p-2.5 bg-slate-50 rounded-xl transition-transform group-hover:scale-110", color)}>{icon}</div></div>
    <div className="text-2xl font-black text-slate-900 mb-1">{value}</div>
    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{sub}</div>
    {progress !== undefined && (<div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div></div>)}
  </div>
);

const LegendItem: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full shadow-sm ${color}`}></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span></div>
);

const DistributionStat: React.FC<{ count: number; label: string; sub: string }> = ({ count, label, sub }) => (
  <div className="px-6 group">
    <div className="text-3xl font-black text-slate-900 group-hover:text-[#D32F2F] transition-all">{count}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{label}</div>
    <div className="text-[9px] text-slate-500 mt-2 font-black italic bg-slate-50 rounded-xl py-1.5 px-4 inline-block border border-slate-100">{sub}</div>
  </div>
);

const SendIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

export default ReportsView;
