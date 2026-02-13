
import React, { useState, useMemo } from 'react';
import { Search, Trash2, AlertCircle, Building2, Calendar, ShieldAlert, Filter, Clock, Send, Trophy, ZapOff, Ban, ChevronDown, Briefcase, Zap } from 'lucide-react';
import { BidRecord, BidStatus, BidStage } from '../types.ts';
import { SOLUTION_OPTIONS } from '../constants.tsx';
import { clsx } from 'clsx';
import { bidApi } from '../services/api.ts';
import { sanitizeDateValue } from '../services/utils';

interface DeleteBidsViewProps {
    bids: BidRecord[];
    onDeleteSuccess: (id: string) => void;
}

const DeleteBidsView: React.FC<DeleteBidsViewProps> = ({ bids, onDeleteSuccess }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [quickHorizon, setQuickHorizon] = useState<string>('All');
    const [phaseFilter, setPhaseFilter] = useState<string>('All');
    const [solutionFilter, setSolutionFilter] = useState<string>('All');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [dateType, setDateType] = useState<string>('received');

    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState<string | null>(null);

    const filteredBids = useMemo(() => {
        if (!bids) return [];

        return bids.filter(bid => {
            // 1. Search Filter
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query ||
                (bid.projectName && bid.projectName.toLowerCase().includes(query)) ||
                (bid.customerName && bid.customerName.toLowerCase().includes(query)) ||
                (bid.jbcName && bid.jbcName.toLowerCase().includes(query)) ||
                (bid.region && bid.region.toLowerCase().includes(query)) ||
                (bid.channel && bid.channel.toLowerCase().includes(query)) ||
                (bid.complexity && bid.complexity.toLowerCase().includes(query)) ||
                (bid.id && bid.id.toLowerCase().includes(query));

            // 2. Status Filter
            const matchesStatus = statusFilter === 'All' || bid.status === statusFilter;

            // 3. Phase Filter
            const matchesPhase = phaseFilter === 'All' || bid.currentStage === phaseFilter;

            // 4. Solution Filter
            const matchesSolution = solutionFilter === 'All' || (bid.requiredSolutions && bid.requiredSolutions.includes(solutionFilter));

            // 5. Date Filtering Logic
            const parseLocalDate = (dateStr: string) => {
                if (!dateStr) return null;
                // Normalize separators
                const normalized = dateStr.replace(/\//g, '-');
                const parts = normalized.split('-');

                let y, m, d;
                if (parts.length === 3) {
                    // Check if first part is Year (4 digits)
                    if (parts[0].length === 4) {
                        [y, m, d] = parts.map(Number);
                    } else {
                        // Assume DD-MM-YYYY
                        [d, m, y] = parts.map(Number);
                    }
                    if (y && m && d) return new Date(y, m - 1, d);
                }

                // Fallback to standard Date parse
                const parsed = new Date(dateStr);
                return isNaN(parsed.getTime()) ? null : parsed;
            };

            let targetDateStr = bid.receivedDate;
            if (dateType === 'deadline') targetDateStr = bid.deadline;
            if (dateType === 'published') targetDateStr = bid.publishDate || '';

            const bidDate = parseLocalDate(targetDateStr);

            // Debug Log (only first bid)
            if (bids.length > 0 && bid === bids[0]) {
                console.log('DEBUG FILTER:', {
                    id: bid.id,
                    targetDateStr,
                    bidDate,
                    dateType,
                    quickHorizon,
                    startDate,
                    endDate,
                    matchesHorizon: true, // simplified assumption for log
                });
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // 6. Quick Horizon
            let matchesHorizon = true;
            if (bidDate) {
                if (quickHorizon === 'This Week') {
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - today.getDay());
                    matchesHorizon = bidDate >= startOfWeek;
                } else if (quickHorizon === 'This Month') {
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    matchesHorizon = bidDate >= startOfMonth;
                }
            } else if (quickHorizon !== 'All') {
                matchesHorizon = false;
            }

            // 7. Custom Range
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
        });
    }, [bids, searchQuery, statusFilter, phaseFilter, solutionFilter, quickHorizon, startDate, endDate, dateType]);

    const handleDelete = async (id: string) => {
        setIsDeleting(id);
        try {
            await bidApi.remove(id);
            onDeleteSuccess(id);
            setShowConfirm(null);
        } catch (err) {
            console.error('Failed to delete bid:', err);
            alert('Error: Could not delete the bid. Please try again.');
        } finally {
            setIsDeleting(null);
        }
    };

    const statusOptions = [
        { label: 'ALL', value: 'All', icon: <Filter size={18} />, color: 'bg-[#0F172A] text-white border-transparent' },
        { label: 'ACTIVE', value: BidStatus.ACTIVE, icon: <Clock size={18} />, color: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]' },
        { label: 'SUBMITTED', value: BidStatus.SUBMITTED, icon: <Send size={18} />, color: 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]' },
        { label: 'WON', value: BidStatus.WON, icon: <Trophy size={18} />, color: 'bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]' },
        { label: 'LOST', value: BidStatus.LOST, icon: <ZapOff size={18} />, color: 'bg-[#F8FAFC] text-[#64748B] border-[#F1F5F9]' },
        { label: 'NO BID', value: BidStatus.NO_BID, icon: <Ban size={18} />, color: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]' },
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6 pb-20 text-left bg-[#F1F5F9]/30 min-h-screen">
            {/* Header & Search Bar */}
            <div className="flex justify-between items-end mb-10 px-2">
                <div>
                    <h1 className="text-4xl font-black text-[#0F172A] tracking-tighter mb-2 leading-none uppercase">
                        Delete Manager
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                        <span className="w-8 h-[2px] bg-[#D32F2F]"></span>
                        Permanent Excision Protocol
                    </p>
                </div>

                <div className="relative w-96">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                        type="text"
                        placeholder="SEARCH BIDS TO DELETE..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent outline-none transition-all placeholder:text-slate-200"
                    />
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-50 border border-red-100 rounded-[2rem] p-6 flex items-start gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                    <AlertCircle className="text-[#D32F2F]" size={24} />
                </div>
                <div>
                    <h3 className="text-[#D32F2F] font-black text-sm uppercase tracking-wider mb-1">Safety Warning</h3>
                    <p className="text-slate-500 text-xs font-bold leading-relaxed">
                        Actions in this section are <span className="text-[#D32F2F] underline underline-offset-4">PERMANENT</span>.
                        Deleting a tender will remove all associated documents, pricing data, and history from the main database.
                        There is no "Undo" for these actions.
                    </p>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.02)] space-y-6">

                {/* Primary Filters Row */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    {/* Status Filter */}
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

                    {/* Quick Horizon */}
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

                {/* Secondary Filters Row */}
                <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-12 gap-6 pt-6 border-t border-slate-50 items-end">

                    {/* Custom Range */}
                    <div className="space-y-3 xl:col-span-5">
                        <div className="flex justify-between items-center">
                            <label className="text-[9px] font-black text-[#94A3B8] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <Clock size={12} className="text-slate-400" /> Custom Range
                            </label>

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

                    {/* Phase Selector */}
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

                    {/* Solution Portfolio Selector */}
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

            {/* List */}
            <div className="space-y-4">
                {filteredBids.map(bid => (
                    <div
                        key={bid.id || Math.random().toString()}
                        className="bg-white border border-slate-100 rounded-[2rem] p-6 flex items-center justify-between group hover:border-[#D32F2F]/20 hover:shadow-xl hover:shadow-red-900/5 transition-all duration-300"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xs uppercase group-hover:bg-red-50 group-hover:text-[#D32F2F] transition-colors">
                                {(bid.customerName || '??').substring(0, 2)}
                            </div>
                            <div>
                                <h4 className="text-[#0F172A] font-black text-base uppercase tracking-tight mb-1 group-hover:text-[#D32F2F] transition-colors">
                                    {bid.projectName || 'Untitled Project'}
                                </h4>
                                <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-md border text-[9px] flex items-center gap-1",
                                        bid.status === BidStatus.WON ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                            bid.status === BidStatus.LOST ? "bg-slate-50 text-slate-500 border-slate-100" :
                                                "bg-blue-50 text-blue-600 border-blue-100"
                                    )}>
                                        {bid.status}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Building2 size={12} /> {bid.customerName || 'Unknown Customer'}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={12} /> {sanitizeDateValue(bid.deadline) || bid.deadline || 'No Date'}
                                    </span>
                                    <span className="text-slate-200 opacity-50">ID: {bid.id || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => bid.id && setShowConfirm(bid.id)}
                                className="bg-white border border-slate-100 text-slate-400 hover:text-[#D32F2F] hover:bg-red-50 hover:border-red-100 p-4 rounded-xl transition-all duration-300 shadow-sm"
                                title="Initiate Deletion"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredBids.length === 0 && (
                    <div className="py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                        <ShieldAlert className="text-slate-200 mx-auto mb-4" size={48} />
                        <h3 className="text-slate-900 font-black uppercase tracking-tight">No Bids Found</h3>
                        <p className="text-slate-400 text-xs font-bold mt-2">Try searching by Project Name or Customer</p>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {
                showConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="text-[#D32F2F]" size={32} />
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 text-center uppercase tracking-tight mb-2">
                                Confirm Deletion
                            </h3>

                            <p className="text-center text-slate-500 font-medium text-sm mb-8 leading-relaxed">
                                Are you sure you want to permanently delete this bid?
                                <br />
                                <span className="text-[#D32F2F] font-bold">This action cannot be undone.</span>
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(null)}
                                    className="flex-1 bg-slate-100 text-slate-600 px-4 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => showConfirm && handleDelete(showConfirm)}
                                    disabled={!!isDeleting}
                                    className="flex-1 bg-[#D32F2F] text-white px-4 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>Processing...</>
                                    ) : (
                                        <>
                                            <Trash2 size={16} /> Delete Forever
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DeleteBidsView;
