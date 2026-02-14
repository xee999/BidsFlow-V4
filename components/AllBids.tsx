
import React, { useState, useMemo } from 'react';
import { Search, Calendar, Filter, Clock, Send, Trophy, ZapOff, Ban, Briefcase, ChevronDown, Zap, AlertCircle, LayoutGrid, List, Building2 } from 'lucide-react';
import { BidRecord, BidStatus, BidStage } from '../types.ts';
import { SOLUTION_OPTIONS, SOLUTION_COLORS } from '../constants.tsx';
import { clsx } from 'clsx';
import { sanitizeDateValue, calculateIntegrity, getIntegrityColor, formatCurrency } from '../services/utils';

interface AllBidsProps {
    bids: BidRecord[];
    onViewBid: (id: string) => void;
    initialStatus?: string;
}

const AllBids: React.FC<AllBidsProps> = ({ bids, onViewBid, initialStatus = 'All' }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [statusFilter, setStatusFilter] = useState<string>(initialStatus === 'All' ? BidStatus.ACTIVE : initialStatus);
    const [quickHorizon, setQuickHorizon] = useState<string>('All');
    const [phaseFilter, setPhaseFilter] = useState<string>('All');
    const [solutionFilter, setSolutionFilter] = useState<string>('All');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [dateType, setDateType] = useState<string>('deadline');

    const formatDateToDeadline = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // Check if it's YYYY-MM-DD manually if Date fails (common for some strings)
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const y = parts[0].slice(-2);
                const m = parts[1].padStart(2, '0');
                const d = parts[2].padStart(2, '0');
                return `${d}-${m}-${y}`;
            }
            return dateStr;
        }
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = String(date.getFullYear()).slice(-2);
        return `${d}-${m}-${y}`;
    };

    const filteredBids = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return bids.filter(bid => {
            // Search Filter
            const matchesSearch = !searchQuery ||
                bid.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bid.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bid.jbcName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (bid.region && bid.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (bid.channel && bid.channel.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (bid.complexity && bid.complexity.toLowerCase().includes(searchQuery.toLowerCase())) ||
                bid.id.toLowerCase().includes(searchQuery.toLowerCase());

            // Status Filter - Complex logic for Active vs Not Submitted
            let matchesStatus = false;
            if (statusFilter === 'All') {
                matchesStatus = true;
            } else if (statusFilter === BidStatus.ACTIVE) {
                // True Active are only those where deadline is today or future
                const parts = bid.deadline.split('-');
                const deadlineDate = parts.length >= 3
                    ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                    : new Date(bid.deadline);
                matchesStatus = bid.status === BidStatus.ACTIVE && deadlineDate >= startOfToday;
            } else if (statusFilter === BidStatus.NOT_SUBMITTED) {
                // Not Submitted are those marked Active but deadline has passed
                const parts = bid.deadline.split('-');
                const deadlineDate = parts.length >= 3
                    ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
                    : new Date(bid.deadline);
                matchesStatus = (bid.status === BidStatus.ACTIVE || bid.status === BidStatus.NOT_SUBMITTED) && deadlineDate < startOfToday;
            } else {
                matchesStatus = bid.status === statusFilter;
            }

            // Phase Filter
            const matchesPhase = phaseFilter === 'All' || bid.currentStage === phaseFilter;

            // Solution Filter
            const matchesSolution = solutionFilter === 'All' || (bid.requiredSolutions && bid.requiredSolutions.includes(solutionFilter));

            // Determining dates for horizon/timeline
            const parseLocalDate = (dateStr: string) => {
                if (!dateStr) return null;
                const [y, m, d] = dateStr.split('-').map(Number);
                return new Date(y, m - 1, d);
            };

            let targetDateStr = bid.receivedDate;
            if (dateType === 'deadline') targetDateStr = bid.deadline;
            if (dateType === 'published') targetDateStr = bid.publishDate || '';

            const bidDate = parseLocalDate(targetDateStr);

            // Quick Horizon Filter
            let matchesHorizon = true;
            if (bidDate) {
                if (quickHorizon === 'This Week') {
                    const startOfWeek = new Date(startOfToday);
                    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    endOfWeek.setHours(23, 59, 59, 999);
                    matchesHorizon = bidDate >= startOfWeek && bidDate <= endOfWeek;
                } else if (quickHorizon === 'This Month') {
                    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
                    const endOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 0);
                    endOfMonth.setHours(23, 59, 59, 999);
                    matchesHorizon = bidDate >= startOfMonth && bidDate <= endOfMonth;
                }
            } else if (quickHorizon !== 'All') {
                matchesHorizon = false;
            }

            // Custom Timeline Filter
            let matchesTimeline = true;
            if (startDate || endDate) {
                if (!bidDate) {
                    matchesTimeline = false;
                } else {
                    if (startDate) {
                        const s = parseLocalDate(startDate);
                        matchesTimeline = matchesTimeline && (s ? bidDate >= s : true);
                    }
                    if (endDate) {
                        const e = parseLocalDate(endDate);
                        if (e) e.setHours(23, 59, 59, 999);
                        matchesTimeline = matchesTimeline && (e ? bidDate <= e : true);
                    }
                }
            }

            return matchesSearch && matchesStatus && matchesPhase && matchesSolution && matchesHorizon && matchesTimeline;
        }).sort((a, b) => {
            const getVal = (bid: BidRecord) => {
                if (dateType === 'deadline') return bid.deadline;
                if (dateType === 'published') return bid.publishDate || '0000-00-00';
                return bid.receivedDate;
            };

            const valA = getVal(a);
            const valB = getVal(b);

            if (!valA) return 1;
            if (!valB) return -1;

            const timeA = new Date(valA).getTime();
            const timeB = new Date(valB).getTime();

            if (dateType === 'deadline') {
                // Due date: Soonest first (ascending)
                return timeA - timeB;
            } else {
                // Intake or Published: Newest first (descending)
                return timeB - timeA;
            }
        });
    }, [bids, searchQuery, statusFilter, phaseFilter, solutionFilter, quickHorizon, startDate, endDate, dateType]);

    const statusOptions = [
        { label: 'ALL', value: 'All', icon: <Filter size={18} />, color: 'bg-[#0F172A] text-white border-transparent' },
        { label: 'ACTIVE', value: BidStatus.ACTIVE, icon: <Clock size={18} />, color: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]' },
        { label: 'NOT SUBMITTED', value: BidStatus.NOT_SUBMITTED, icon: <AlertCircle size={18} />, color: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]' },
        { label: 'SUBMITTED', value: BidStatus.SUBMITTED, icon: <Send size={18} />, color: 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]' },
        { label: 'WON', value: BidStatus.WON, icon: <Trophy size={18} />, color: 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]' },
        { label: 'LOST', value: BidStatus.LOST, icon: <ZapOff size={18} />, color: 'bg-[#F8FAFC] text-[#64748B] border-[#F1F5F9]' },
        { label: 'NO BID', value: BidStatus.NO_BID, icon: <Ban size={18} />, color: 'bg-[#F9FAFB] text-slate-500 border-slate-200' },
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6 pb-20 text-left bg-[#F1F5F9]/30 min-h-screen">
            {/* Header & Search Bar - High Contrast, Clean Minimalist Design */}
            <div className="flex justify-between items-end mb-10 px-2">
                <div>
                    <h1 className="text-4xl font-black text-[#0F172A] tracking-tighter mb-2 leading-none uppercase">Bid Repository</h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                        <span className="w-8 h-[2px] bg-slate-200"></span>
                        Strategic Business Database
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] h-[50px] items-center">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={clsx(
                                "p-3 rounded-xl transition-all duration-300",
                                viewMode === 'grid' ? "bg-slate-100 text-[#0F172A] shadow-sm" : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-3 rounded-xl transition-all duration-300",
                                viewMode === 'list' ? "bg-slate-100 text-[#0F172A] shadow-sm" : "text-slate-300 hover:text-slate-500 hover:bg-slate-50"
                            )}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <div className="relative w-96">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            type="text"
                            placeholder="SEARCH BIDS..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent outline-none transition-all placeholder:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            {/* Comprehensive Filter Panel - High-Density UX Design */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.02)] space-y-6">

                {/* primary filters row - High Density Layout */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">

                    {/* Status Filter - Tight Wrapping Box */}
                    <div className="space-y-3 min-w-0">
                        <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1">Current Status</label>
                        <div className="bg-[#F8FAFC] p-1 rounded-2xl border border-slate-50 flex flex-nowrap gap-1 w-fit">
                            {statusOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStatusFilter(opt.value)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-2 whitespace-nowrap",
                                        statusFilter === opt.value
                                            ? `${opt.color} shadow-sm border-transparent`
                                            : "bg-transparent text-slate-400 border-transparent hover:text-slate-600 hover:bg-white"
                                    )}
                                >
                                    {React.cloneElement(opt.icon as React.ReactElement, { size: 14 })}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Horizon Filter - Compact Width */}
                    <div className="space-y-3 min-w-[240px]">
                        <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1">Quick Horizon</label>
                        <div className="bg-[#F8FAFC] p-1 rounded-2xl border border-slate-50 flex gap-1">
                            {['All', 'This Week', 'This Month'].map((horizon) => (
                                <button
                                    key={horizon}
                                    onClick={() => setQuickHorizon(horizon)}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                        quickHorizon === horizon
                                            ? "bg-[#DC2626] text-white shadow-sm"
                                            : "text-slate-400 hover:text-slate-600 hover:bg-white"
                                    )}
                                >
                                    {horizon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* secondary filters row - Dense Grid with Narrow Selects */}
                <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-12 gap-6 pt-6 border-t border-slate-50 items-end">

                    {/* Custom Timeline Area - Compact sizing */}
                    <div className="space-y-3 xl:col-span-5">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <Clock size={12} className="text-slate-400" /> Custom Range
                            </label>

                            {/* Date Type Selector */}
                            <div className="bg-[#F8FAFC] p-0.5 rounded-lg border border-slate-100 flex gap-0.5">
                                {[
                                    { id: 'received', label: 'Intake' },
                                    { id: 'deadline', label: 'Due' },
                                    { id: 'published', label: 'Published' }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setDateType(type.id)}
                                        className={clsx(
                                            "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                                            dateType === type.id
                                                ? "bg-white text-[#1E293B] shadow-sm border border-slate-100"
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 max-w-[180px]">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full h-9 bg-[#F8FAFC] border border-slate-100 rounded-xl pl-10 pr-3 text-[10px] font-black text-[#1E293B] focus:ring-1 focus:ring-[#D32F2F] focus:border-transparent outline-none tracking-widest"
                                />
                            </div>
                            <span className="text-slate-200 font-bold">—</span>
                            <div className="relative flex-1 max-w-[180px]">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full h-9 bg-[#F8FAFC] border border-slate-100 rounded-xl pl-10 pr-3 text-[10px] font-black text-[#1E293B] focus:ring-1 focus:ring-[#D32F2F] focus:border-transparent outline-none tracking-widest"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Phase Selector - Narrow Width component */}
                    <div className="space-y-3 xl:col-span-3">
                        <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Briefcase size={12} className="text-slate-400" /> Phase
                        </label>
                        <div className="relative max-w-[280px]">
                            <select
                                value={phaseFilter}
                                onChange={(e) => setPhaseFilter(e.target.value)}
                                className="w-full h-9 appearance-none bg-[#F8FAFC] border border-slate-100 rounded-xl px-5 text-[10px] font-black uppercase tracking-widest text-[#1E293B] hover:border-slate-200 focus:ring-1 focus:ring-[#D32F2F] focus:border-transparent outline-none cursor-pointer transition-all"
                            >
                                <option value="All">ALL PHASES</option>
                                {Object.values(BidStage).map(stage => (
                                    <option key={stage} value={stage}>{stage.toUpperCase()}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {/* Solution Portfolio Selector - Narrow Width component */}
                    <div className="space-y-3 xl:col-span-4">
                        <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Zap size={12} className="text-slate-400" /> Solution portfolio
                        </label>
                        <div className="relative max-w-[280px]">
                            <select
                                value={solutionFilter}
                                onChange={(e) => setSolutionFilter(e.target.value)}
                                className="w-full h-9 appearance-none bg-[#F8FAFC] border border-slate-100 rounded-xl px-5 text-[10px] font-black uppercase tracking-widest text-[#1E293B] hover:border-slate-200 focus:ring-1 focus:ring-[#D32F2F] focus:border-transparent outline-none cursor-pointer transition-all"
                            >
                                <option value="All">ALL SOLUTIONS</option>
                                {SOLUTION_OPTIONS.map(sol => (
                                    <option key={sol} value={sol}>{sol.toUpperCase()}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Grid - High-Fidelity Cards */}
            {/* Results Display */}
            {filteredBids.length > 0 ? (
                viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16 px-1">
                        {filteredBids.map(bid => (
                            <div
                                key={bid.id}
                                onClick={() => onViewBid(bid.id)}
                                className="bg-white p-10 rounded-[3.5rem] border border-slate-50 shadow-[0_4px_25px_rgba(0,0,0,0.015)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.05)] hover:-translate-y-3 transition-all duration-500 cursor-pointer group flex flex-col h-full overflow-hidden relative"
                            >
                                {/* Status Accent Strip */}
                                <div className={clsx(
                                    "absolute top-0 left-0 w-full h-[6px] transition-all duration-500",
                                    bid.status === BidStatus.WON ? "bg-emerald-400 translate-y-[-2px] group-hover:translate-y-0" :
                                        bid.status === BidStatus.LOST ? "bg-slate-300 translate-y-[-2px] group-hover:translate-y-0" :
                                            bid.status === BidStatus.ACTIVE ? "bg-blue-400 translate-y-[-2px] group-hover:translate-y-0" :
                                                bid.status === BidStatus.SUBMITTED ? "bg-orange-400 translate-y-[-2px] group-hover:translate-y-0" :
                                                    "bg-slate-100"
                                )} />

                                <div className="flex justify-between items-start mb-8 mt-2">
                                    <div className="flex items-center gap-3">
                                        <span className={clsx(
                                            "px-5 h-8 flex items-center rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border",
                                            bid.status === BidStatus.WON ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                bid.status === BidStatus.LOST ? "bg-slate-50 text-slate-500 border-slate-100" :
                                                    bid.status === BidStatus.ACTIVE ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                        bid.status === BidStatus.SUBMITTED ? "bg-orange-50 text-orange-600 border-orange-100" :
                                                            "bg-slate-50 text-slate-400 border-slate-100"
                                        )}>
                                            {bid.status}
                                        </span>
                                        <span className="px-3 h-8 flex items-center rounded-full text-[10px] font-bold uppercase tracking-[0.15em] bg-slate-100 text-slate-500">
                                            {bid.id}
                                        </span>
                                        {bid.jvAllowed && (
                                            <span className="px-3 h-8 flex items-center rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                                                JV
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter italic opacity-80 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[12px] align-top mt-1 mr-1">{bid.currency}</span>
                                        {((bid.tcvExclTax || bid.estimatedValue) / 1000000).toFixed(1)}M
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-[#0F172A] group-hover:text-[#D32F2F] transition-colors line-clamp-2 leading-[1.05] uppercase tracking-tighter mb-3 pr-4">
                                    {bid.projectName}
                                </h3>

                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                    {bid.customerName}
                                </p>

                                {/* Solution Pill - Prominent placement */}
                                {bid.requiredSolutions && bid.requiredSolutions.length > 0 && (() => {
                                    const solutionName = bid.requiredSolutions[0];
                                    const sc = SOLUTION_COLORS[solutionName] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100' };
                                    return (
                                        <span className={clsx(
                                            "inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border mb-6",
                                            sc.bg, sc.text, sc.border
                                        )}>
                                            {solutionName}
                                        </span>
                                    );
                                })()}

                                {/* Progress Bar - Visual separator */}
                                {(() => {
                                    const integrity = calculateIntegrity(bid);

                                    return (
                                        <div className="mt-auto mb-6 space-y-3 group cursor-help" title={`CURRENT STAGE: ${bid.currentStage.toUpperCase()}`}>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest h-4">
                                                <div className="flex-1">
                                                    <span className="text-slate-400 group-hover:hidden transition-all">Bid Progression</span>
                                                    <span className="text-[#D32F2F] hidden group-hover:block animate-in fade-in slide-in-from-bottom-1">STAGE: {bid.currentStage.toUpperCase()}</span>
                                                </div>
                                                <span className="text-slate-900">{integrity}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner">
                                                <div className="h-full transition-all duration-1000 group-hover:bg-[#D32F2F]" style={{ width: `${integrity}%`, backgroundColor: getIntegrityColor(integrity) }}></div>
                                            </div>
                                        </div>
                                    );

                                })()}


                                {/* Footer - Clean date display */}
                                <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">
                                    <Calendar size={14} className="text-[#D32F2F]/60 group-hover:text-[#D32F2F]" />
                                    Due: {formatDateToDeadline(bid.deadline)}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mt-8 mx-4 bg-white rounded-[20px] border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
                        {/* Redesigned List View Table */}
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-5 pl-32 pr-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[30%] text-left">Opportunity</th>
                                    <th className="py-5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[25%]">Stage Progress</th>
                                    <th className="py-5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[25%]">Value & Status</th>
                                    <th className="py-5 pl-4 pr-12 text-[11px] font-bold text-slate-400 uppercase tracking-widest w-[20%] text-right">Deadline</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredBids.map((bid) => {
                                    const integrity = calculateIntegrity(bid);
                                    const integrityColor = getIntegrityColor(integrity);
                                    
                                    const deadlineDate = new Date(bid.deadline);
                                    const today = new Date();
                                    
                                    // Reset time for accurate day difference count
                                    const todayReset = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                    const deadlineReset = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
                                    
                                    const diffTime = deadlineReset.getTime() - todayReset.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    const isUrgent = diffDays >= 0 && diffDays <= 3;
                                    const isOverdue = deadlineReset < todayReset;

                                    return (
                                        <tr 
                                            key={bid.id} 
                                            onClick={() => onViewBid(bid.id)} 
                                            className="hover:bg-slate-50 transition-colors duration-200 cursor-pointer group"
                                        >
                                            {/* Opportunity Column */}
                                            <td className="py-6 pl-32 pr-4 align-top">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                                                        <Building2 size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-[15px] leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                                                            {bid.projectName}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                                                            {bid.customerName}
                                                        </div>
                                                        <div className="inline-flex items-center gap-2">
                                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-mono font-medium">
                                                                {bid.id}
                                                            </span>
                                                            {bid.jvAllowed && (
                                                                <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                                    JV
                                                                </span>
                                                            )}
                                                            {bid.requiredSolutions && bid.requiredSolutions.length > 0 && (() => {
                                                                 const solName = bid.requiredSolutions[0];
                                                                 const sc = SOLUTION_COLORS[solName] || { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' };
                                                                 return (
                                                                    <span className={clsx(
                                                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                                        sc.bg, sc.text, sc.border
                                                                    )}>
                                                                        {solName}
                                                                    </span>
                                                                 );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Stage Progress Column */}
                                            <td className="py-6 px-4 align-top">
                                                <div className="max-w-[180px] mt-1">
                                                    <div className="flex justify-between items-end mb-2">
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                                            {bid.currentStage.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {integrity}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ 
                                                                width: `${integrity}%`,
                                                                backgroundColor: integrityColor
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Value & Status Column */}
                                            <td className="py-6 px-4 align-top">
                                                <div className="flex flex-col gap-2 mt-1">
                                                    <div className="font-bold text-slate-800 text-[15px]">
                                                        {bid.currency} {formatCurrency(bid.tcvExclTax || bid.estimatedValue || 0)}
                                                    </div>
                                                    <div>
                                                        <span className={clsx(
                                                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5",
                                                            bid.status === BidStatus.WON ? "bg-emerald-50 text-emerald-600" :
                                                                bid.status === BidStatus.LOST ? "bg-slate-100 text-slate-500" :
                                                                    bid.status === BidStatus.ACTIVE ? "bg-blue-50 text-blue-600" :
                                                                        bid.status === BidStatus.SUBMITTED ? "bg-orange-50 text-orange-600" :
                                                                            "bg-slate-50 text-slate-400"
                                                        )}>
                                                            <div className={clsx(
                                                                "w-1.5 h-1.5 rounded-full",
                                                                bid.status === BidStatus.WON ? "bg-emerald-500" :
                                                                    bid.status === BidStatus.LOST ? "bg-slate-400" :
                                                                        bid.status === BidStatus.ACTIVE ? "bg-blue-500" :
                                                                            bid.status === BidStatus.SUBMITTED ? "bg-orange-500" :
                                                                                "bg-slate-400"
                                                            )} />
                                                            {bid.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Deadline Column */}
                                            <td className="py-6 pl-4 pr-12 align-top text-right">
                                                <div className="flex flex-col items-end gap-1 mt-1.5">
                                                    <div className={clsx(
                                                        "text-[13px] font-bold font-mono tracking-tight",
                                                        isUrgent ? "text-red-500" : "text-slate-600"
                                                    )}>
                                                        {formatDateToDeadline(bid.deadline)}
                                                    </div>
                                                    {isOverdue && bid.status === BidStatus.ACTIVE && (
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overdue</span>
                                                    )}
                                                    {isUrgent && bid.status === BidStatus.ACTIVE && (
                                                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Urgent</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="py-32 text-center bg-white rounded-[4rem] border border-dashed border-slate-200 mt-16">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Search className="text-slate-300" size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">No strategic matches</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-4">Expand your selection parameters or search criteria</p>
                </div>
            )}
        </div>
    );
};

export default AllBids;

