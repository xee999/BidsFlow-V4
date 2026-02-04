import React, { useState, useMemo } from 'react';
import { Activity, ChevronDown, Search, Filter, User, Calendar, Download, Sparkles, Zap, CheckCircle2, AlertCircle, FileText, ArrowUpRight, ShieldAlert, Clock } from 'lucide-react';
import { ActivityLog, User as UserType, UserRole, USER_ROLE_LABELS } from '../types.ts';
import { clsx } from 'clsx';
import { exportAuditLogsCSV } from '../services/auditService.ts';

interface ActivityLogViewProps {
    auditTrail: ActivityLog[];
}

const ActivityLogView: React.FC<ActivityLogViewProps> = ({ auditTrail }) => {
    const [userFilter, setUserFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');

    const uniqueUsers = useMemo(() => Array.from(new Set(auditTrail.map(log => log.userName))), [auditTrail]);

    const changeTypes = [
        { value: 'stage_change', label: 'Stage Changes' },
        { value: 'document_upload', label: 'Document Uploads' },
        { value: 'approval', label: 'Approvals' },
        { value: 'edit', label: 'Edits' },
        { value: 'status_change', label: 'Status Changes' },
        { value: 'user_action', label: 'User Actions' },
    ];

    const dateRanges = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: '7days', label: 'Last 7 Days' },
        { value: '30days', label: 'Last 30 Days' },
    ];

    const isWithinDateRange = (logId: string): boolean => {
        if (dateRangeFilter === 'all') return true;
        const parts = logId.split('_');
        if (parts.length < 2) return true;
        const logTimestamp = parseInt(parts[1]);
        if (isNaN(logTimestamp)) return true;

        const now = Date.now();
        const logDate = new Date(logTimestamp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dateRangeFilter) {
            case 'today':
                return logDate >= today;
            case '7days':
                return now - logTimestamp < 7 * 24 * 60 * 60 * 1000;
            case '30days':
                return now - logTimestamp < 30 * 24 * 60 * 60 * 1000;
            default:
                return true;
        }
    };

    const filteredAuditTrail = useMemo(() => {
        return auditTrail
            .filter(log => {
                const matchesUser = userFilter === 'all' || log.userName === userFilter;
                const matchesAction = actionFilter === 'all' || log.action === actionFilter;
                const matchesChangeType = changeTypeFilter === 'all' || log.changeType === changeTypeFilter;
                const matchesDateRange = isWithinDateRange(log.id);
                const matchesSearch = searchQuery === '' ||
                    log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    log.subText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (log.projectName && log.projectName.toLowerCase().includes(searchQuery.toLowerCase()));
                return matchesUser && matchesAction && matchesChangeType && matchesSearch && matchesDateRange;
            })
            .sort((a, b) => {
                // Sort chronologically - newest first
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                // Handle invalid dates by falling back to ID timestamp
                const validA = !isNaN(dateA) ? dateA : parseInt(a.id.split('_')[1]) || 0;
                const validB = !isNaN(dateB) ? dateB : parseInt(b.id.split('_')[1]) || 0;
                return validB - validA; // Descending order (newest first)
            });
    }, [auditTrail, userFilter, actionFilter, changeTypeFilter, searchQuery, dateRangeFilter]);


    const getRoleDisplayName = (role: string) => {
        return USER_ROLE_LABELS[role as UserRole] || role;
    };

    const getModalityIcon = (modality: ActivityLog['modality']) => {
        switch (modality) {
            case 'sparkles': return <Sparkles size={16} className="text-amber-500" />;
            case 'zap': return <Zap size={16} className="text-[#D32F2F]" />;
            case 'check': return <CheckCircle2 size={16} className="text-emerald-500" />;
            case 'alert': return <AlertCircle size={16} className="text-slate-500" />;
            default: return <Activity size={16} className="text-slate-400" />;
        }
    };

    const getActionBadgeColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'stage change': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'document upload': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'initiated': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'pre-loaded': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'updated': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            case 'submitted': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in h-[calc(100vh-120px)] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Activity className="text-[#D32F2F]" />
                        Activity Log
                    </h2>
                    <p className="text-xs text-slate-500">Comprehensive audit trail of all system activities</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                        {filteredAuditTrail.length} Events
                    </span>
                </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
                {/* Search */}
                <div className="relative">
                    <div className="flex items-center gap-2 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <Search size={12} />
                        Search
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all"
                        />
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Change Type Filter */}
                <div className="relative">
                    <div className="flex items-center gap-2 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <Filter size={12} />
                        Event Type
                    </div>
                    <div className="relative">
                        <select
                            value={changeTypeFilter}
                            onChange={(e) => setChangeTypeFilter(e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all cursor-pointer"
                        >
                            <option value="all">All Events</option>
                            {changeTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* User Filter */}
                <div className="relative">
                    <div className="flex items-center gap-2 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <User size={12} />
                        User
                    </div>
                    <div className="relative">
                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all cursor-pointer"
                        >
                            <option value="all">All Users</option>
                            {uniqueUsers.map(user => (
                                <option key={user} value={user}>{user}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Date Range Filter */}
                <div className="relative">
                    <div className="flex items-center gap-2 px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        <Calendar size={12} />
                        Date
                    </div>
                    <div className="relative">
                        <select
                            value={dateRangeFilter}
                            onChange={(e) => setDateRangeFilter(e.target.value)}
                            className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] transition-all cursor-pointer"
                        >
                            {dateRanges.map(range => (
                                <option key={range.value} value={range.value}>{range.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                    <button
                        onClick={() => {
                            const csv = exportAuditLogsCSV(filteredAuditTrail);
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D32F2F] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm h-[42px]"
                    >
                        <Download size={14} />
                        Export
                    </button>
                    {(userFilter !== 'all' || actionFilter !== 'all' || changeTypeFilter !== 'all' || dateRangeFilter !== 'all' || searchQuery !== '') && (
                        <button
                            onClick={() => {
                                setUserFilter('all');
                                setActionFilter('all');
                                setChangeTypeFilter('all');
                                setDateRangeFilter('all');
                                setSearchQuery('');
                            }}
                            className="px-3 py-2.5 text-xs font-bold text-[#D32F2F] bg-red-50 hover:bg-red-100 rounded-xl transition-colors h-[42px]"
                            title="Clear Filters"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full table-fixed min-w-[700px]">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                        <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[12%]">Time</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[15%]">User</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[18%]">Project</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[12%]">Action</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[20%]">Change</th>
                            <th className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-[18%]">Details</th>
                            <th className="px-4 py-3 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-[5%]"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredAuditTrail.length > 0 ? (
                            filteredAuditTrail.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={12} />
                                            {(() => {
                                                const date = new Date(log.timestamp);
                                                const isValid = !isNaN(date.getTime());

                                                if (isValid) {
                                                    return (
                                                        <span className="text-xs font-medium tabular-nums">
                                                            {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                            <span className="text-slate-300 mx-1">|</span>
                                                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    );
                                                } else {
                                                    // Handle legacy format "Time · Date"
                                                    const parts = log.timestamp.split('·');
                                                    if (parts.length === 2) {
                                                        return (
                                                            <span className="text-xs font-medium tabular-nums">
                                                                {parts[1].trim()}
                                                                <span className="text-slate-300 mx-1">|</span>
                                                                {parts[0].trim()}
                                                            </span>
                                                        );
                                                    }
                                                    // Fallback for unknown format
                                                    return <span className="text-xs font-medium tabular-nums">{log.timestamp}</span>;
                                                }
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
                                                {log.userName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{log.userName}</p>
                                                <p className="text-[10px] text-slate-400 uppercase">{getRoleDisplayName(log.userRole)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.projectName ? (
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <FileText size={12} className="text-slate-400" />
                                                <span className="text-xs font-bold truncate max-w-[140px]" title={log.projectName}>{log.projectName}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">System / Global</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={clsx(
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border",
                                            getActionBadgeColor(log.action)
                                        )}>
                                            {getModalityIcon(log.modality)}
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <p className="text-xs font-medium text-slate-700">{log.target}</p>
                                            {log.changeType && log.changeType !== 'edit' && <p className="text-[10px] text-slate-400 capitalize">{log.changeType.replace('_', ' ')}</p>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs text-slate-600 leading-snug">
                                            {log.subText}
                                        </div>
                                        {log.previousValue && log.newValue && (
                                            <div className="mt-1 flex items-center gap-2 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100">
                                                <span className="text-red-500 line-through truncate max-w-[80px]">{String(log.previousValue)}</span>
                                                <span className="text-slate-300">→</span>
                                                <span className="text-emerald-500 font-bold truncate max-w-[80px]">{String(log.newValue)}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                            <Search size={20} />
                                        </div>
                                        <p className="text-sm font-medium text-slate-500">No activity found matching your filters.</p>
                                        <button
                                            onClick={() => {
                                                setUserFilter('all');
                                                setActionFilter('all');
                                                setChangeTypeFilter('all');
                                                setDateRangeFilter('all');
                                                setSearchQuery('');
                                            }}
                                            className="text-xs text-[#D32F2F] font-bold hover:underline"
                                        >
                                            Clear all filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ActivityLogView;
