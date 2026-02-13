import React, { useMemo, useState } from 'react';
import {
  Trophy, Target, Ban, Clock, Filter, BarChart3, Activity, Zap,
  Search, X, Users, Briefcase, Layers, TrendingUp, Timer, MapPin
} from 'lucide-react';
import { BidRecord, BidStatus, BidStage } from '../types.ts';
import { SOLUTION_OPTIONS } from '../constants.tsx';
import { clsx } from 'clsx';
import BidTimeTrackerView from './BidTimeTrackerView.tsx';

// Import tab components
import ExecutiveCommandCenter from './reports/ExecutiveCommandCenter.tsx';
import PerformanceMatrix from './reports/PerformanceMatrix.tsx';
import JBCPerformanceBench from './reports/JBCPerformanceBench.tsx';
import PipelineAnalytics from './reports/PipelineAnalytics.tsx';
import NoBidForensics from './reports/NoBidForensics.tsx';
import VelocityEngine from './reports/VelocityEngine.tsx';

// Re-export STAGE_COLORS for backward compat
export { STAGE_COLORS } from './reports/ReportHelpers.tsx';

import {
  ReportFilters, DEFAULT_FILTERS, applyFilters, computeStats
} from './reports/ReportHelpers.tsx';

interface ReportsViewProps {
  bids: BidRecord[];
}

type TabKey = 'executive' | 'pipeline' | 'performance' | 'jbc' | 'velocity' | 'noBid' | 'timeTracker';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'executive', label: 'Command Center', icon: <Briefcase size={15} />, color: 'text-slate-700' },
  { key: 'pipeline', label: 'Pipeline', icon: <Layers size={15} />, color: 'text-sky-600' },
  { key: 'performance', label: 'Performance', icon: <Trophy size={15} />, color: 'text-emerald-600' },
  { key: 'jbc', label: 'JBC Bench', icon: <Users size={15} />, color: 'text-violet-600' },
  { key: 'velocity', label: 'Velocity', icon: <Zap size={15} />, color: 'text-amber-600' },
  { key: 'noBid', label: 'No-Bid Forensics', icon: <Ban size={15} />, color: 'text-red-600' },
  { key: 'timeTracker', label: 'Time Tracker', icon: <Timer size={15} />, color: 'text-[#D32F2F]' },
];

const ReportsView: React.FC<ReportsViewProps> = ({ bids }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('executive');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);

  // Extract unique JBC names for filter dropdown
  const uniqueJBCs = useMemo(() => [...new Set(bids.map(b => b.jbcName).filter(Boolean))].sort(), [bids]);

  // Apply filters
  const filteredBids = useMemo(() => applyFilters(bids, filters), [bids, filters]);
  const stats = useMemo(() => computeStats(filteredBids), [filteredBids]);

  const updateFilter = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Advanced Reports</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
            {filteredBids.length} bids in scope {hasActiveFilters && '• Filters Active'}
          </p>
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
            filtersOpen ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
            hasActiveFilters && !filtersOpen && "border-[#D32F2F] text-[#D32F2F]"
          )}
        >
          <Filter size={14} /> Filters {hasActiveFilters && `(${Object.values(filters).filter(v => v !== 'All' && v !== '' && v !== 'received' && (typeof v !== 'object' || (v as any).start || (v as any).end)).length})`}
        </button>
      </div>

      {/* Filter Bar */}
      {filtersOpen && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg p-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Intelligence</span>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1 hover:text-red-700 transition-colors">
                <X size={12} /> Clear All
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text" placeholder="Search bids, customers, JBCs..."
              value={filters.searchQuery}
              onChange={e => updateFilter('searchQuery', e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#D32F2F] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* Status */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Status</label>
              <select value={filters.filterStatus} onChange={e => updateFilter('filterStatus', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All Statuses</option>
                {Object.values(BidStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Stage</label>
              <select value={filters.filterStage} onChange={e => updateFilter('filterStage', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All Stages</option>
                {Object.values(BidStage).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Region</label>
              <select value={filters.filterRegion} onChange={e => updateFilter('filterRegion', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All Regions</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="Central">Central</option>
              </select>
            </div>

            {/* Channel */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Channel</label>
              <select value={filters.filterChannel} onChange={e => updateFilter('filterChannel', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All Channels</option>
                <option value="B2G">B2G</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            {/* Product */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Product</label>
              <select value={filters.filterSolution} onChange={e => updateFilter('filterSolution', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All Products</option>
                {SOLUTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* JBC */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">JBC</label>
              <select value={filters.filterJBC} onChange={e => updateFilter('filterJBC', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All JBCs</option>
                {uniqueJBCs.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>

            {/* Complexity */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Complexity</label>
              <select value={filters.filterComplexity} onChange={e => updateFilter('filterComplexity', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All Complexities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Quick Horizon */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Horizon</label>
              <select value={filters.quickHorizon} onChange={e => updateFilter('quickHorizon', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="All">All Time</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="This Quarter">This Quarter</option>
                <option value="YTD">YTD</option>
              </select>
            </div>

            {/* Date Type */}
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Date By</label>
              <select value={filters.dateType} onChange={e => updateFilter('dateType', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]">
                <option value="received">Intake Date</option>
                <option value="deadline">Due Date</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">From</label>
              <input type="date" value={filters.dateRange.start} onChange={e => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">To</label>
              <input type="date" value={filters.dateRange.end} onChange={e => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-[#D32F2F]" />
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-2 flex flex-wrap gap-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-lg"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'executive' && <ExecutiveCommandCenter bids={filteredBids} stats={stats} />}
        {activeTab === 'pipeline' && <PipelineAnalytics bids={filteredBids} />}
        {activeTab === 'performance' && <PerformanceMatrix bids={filteredBids} />}
        {activeTab === 'jbc' && <JBCPerformanceBench bids={filteredBids} />}
        {activeTab === 'velocity' && <VelocityEngine bids={filteredBids} />}
        {activeTab === 'noBid' && <NoBidForensics bids={filteredBids} />}
        {activeTab === 'timeTracker' && <BidTimeTrackerView bids={filteredBids} />}
      </div>
    </div>
  );
};

export default ReportsView;
