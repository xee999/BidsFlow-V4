
import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Filter,
  ArrowRight,
  ShieldCheck,
  Zap,
  Calendar,
  CreditCard,
  DollarSign,
  Layers,
  Send,
  Timer
} from 'lucide-react';
import { BidRecord, BidStatus, RiskLevel } from '../types.ts';
import { clsx } from 'clsx';
import { sanitizeDateValue } from '../services/utils';

interface ApprovalsViewProps {
  bids: BidRecord[];
  onViewBid: (id: string) => void;
}

const ApprovalsView: React.FC<ApprovalsViewProps> = ({ bids, onViewBid }) => {
  const [filterStatus, setFilterStatus] = useState<BidStatus | 'All'>('All');
  const [sortBy, setSortBy] = useState<'due' | 'value' | 'pending'>('due');

  // Helper to get remaining days
  const getRemainingDays = (deadlineStr: string) => {
    if (!deadlineStr) return 999;
    const deadline = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper to get days pending since approval request
  const getDaysPending = (requestedDateStr?: string, approvalDateStr?: string) => {
    if (!requestedDateStr) return 0;
    const requested = new Date(requestedDateStr);
    const end = approvalDateStr ? new Date(approvalDateStr) : new Date();
    const diffTime = end.getTime() - requested.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Critical Bids: Deadline < 5 days AND Approval status is 'Submitted'
  const criticalBids = useMemo(() => {
    return bids.filter(b =>
      b.managementApprovalStatus === 'Submitted' &&
      getRemainingDays(b.deadline) < 5 &&
      b.status === BidStatus.ACTIVE
    );
  }, [bids]);

  const filteredBids = useMemo(() => {
    let result = filterStatus === 'All' ? [...bids] : bids.filter(b => b.status === filterStatus);
    
    return result.sort((a, b) => {
      if (sortBy === 'due') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      } else if (sortBy === 'value') {
        return (b.tcvExclTax || b.estimatedValue || 0) - (a.tcvExclTax || a.estimatedValue || 0);
      } else if (sortBy === 'pending') {
        const pendingA = getDaysPending(a.approvalRequestedDate, a.managementApprovalDate);
        const pendingB = getDaysPending(b.approvalRequestedDate, b.managementApprovalDate);
        return pendingB - pendingA;
      }
      return 0;
    });
  }, [bids, filterStatus, sortBy]);

  const statusFilters = [
    { id: 'All', label: 'All Bids', count: bids.length },
    { id: BidStatus.ACTIVE, label: 'Active', count: bids.filter(b => b.status === BidStatus.ACTIVE).length },
    { id: BidStatus.SUBMITTED, label: 'Submitted', count: bids.filter(b => b.status === BidStatus.SUBMITTED).length },
    { id: BidStatus.WON, label: 'Won', count: bids.filter(b => b.status === BidStatus.WON).length },
    { id: BidStatus.NO_BID, label: 'No Bid', count: bids.filter(b => b.status === BidStatus.NO_BID).length },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in pb-24 text-left">
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <UserCheck className="text-[#D32F2F]" size={32} />
          Management Approvals Studio
        </h1>
        <p className="text-slate-500 mt-1 font-medium">Tracking high-level governance and submission clearances with precision.</p>
      </div>

      {/* Critical Highlight Section */}
      {criticalBids.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6 text-[#D32F2F]">
            <AlertTriangle size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Urgent Submission Clearances</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {criticalBids.map(bid => {
              const daysLeft = getRemainingDays(bid.deadline);
              const daysPending = getDaysPending(bid.approvalRequestedDate, bid.managementApprovalDate);

              return (
                <div
                  key={bid.id}
                  onClick={() => onViewBid(bid.id)}
                  className="bg-white border-2 border-red-100 rounded-[2.5rem] p-6 shadow-xl shadow-red-50 hover:border-red-500 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                    <AlertTriangle size={80} className="text-red-500" />
                  </div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex gap-2">
                        <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full animate-pulse">
                        Critical Action
                        </span>
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                        {bid.id}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold text-red-500">{daysLeft} Days Left</span>
                  </div>
                  <h3 className="font-black text-slate-900 mb-1 group-hover:text-red-600 transition-colors line-clamp-1">{bid.projectName}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-tight">{bid.customerName}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <DollarSign size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Est. Value</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        {bid.currency} {(bid.estimatedValue / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Layers size={10} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Solution</span>
                      </div>
                      <span className="text-[10px] font-black text-[#D32F2F] uppercase truncate">
                        {bid.requiredSolutions[0] || 'Unspecified'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                    <div className="text-center border-r border-red-100/50 pr-4 flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Authority</p>
                      <p className="text-[10px] font-bold text-slate-800 truncate">{bid.approvingAuthority || 'N/A'}</p>
                    </div>
                    <div className="text-center pl-4 flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Waiting</p>
                      <p className="text-[10px] font-black text-red-600">{daysPending} Days</p>
                    </div>
                  </div>

                  <button className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-700 shadow-lg shadow-red-100">
                    Escalate Clearance <Zap size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header & Filters */}
        <div className="p-8 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
              <ShieldCheck className="text-blue-500" size={24} />
              Submission Clearances Pipeline
            </h2>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              {[
                { id: 'due', label: 'Due Date', icon: <Clock size={12} /> },
                { id: 'value', label: 'Value', icon: <DollarSign size={12} /> },
                { id: 'pending', label: 'Pending', icon: <Timer size={12} /> }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id as any)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    sortBy === opt.id ? "bg-[#0F172A] text-white shadow-md" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-[1.5rem]">
            {statusFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id as any)}
                className={clsx(
                  "px-4 py-2 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all",
                  filterStatus === filter.id
                    ? "bg-[#1E3A5F] text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-600 hover:bg-white"
                )}
              >
                {filter.label} <span className="opacity-40">({filter.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-10 py-6">Customer & Project</th>
                <th className="px-10 py-6">Timeline</th>
                <th className="px-10 py-6">Approving Authority</th>
                <th className="px-10 py-6">Approval Status</th>
                <th className="px-10 py-6 text-center">Process Time</th>
                <th className="px-10 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBids.map(bid => {
                const daysLeft = getRemainingDays(bid.deadline);
                const approvalDays = getDaysPending(bid.approvalRequestedDate, bid.managementApprovalDate);
                const isNearing = daysLeft < 5 && daysLeft >= 0;

                return (
                  <tr key={bid.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-8">
                      <div className="font-black text-slate-900 group-hover:text-[#D32F2F] transition-colors leading-tight">{bid.projectName}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{bid.customerName}</div>
                      <div className="mt-3 flex gap-2">
                        {bid.riskLevel === RiskLevel.HIGH && (
                          <span className="bg-red-50 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-100">HIGH RISK</span>
                        )}
                        <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-slate-200">VALUE: {bid.currency} {(bid.estimatedValue / 1000000).toFixed(1)}M</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className={clsx(
                        "text-xs font-black",
                        isNearing ? "text-red-500 animate-pulse" : "text-slate-700"
                      )}>
                        {sanitizeDateValue(bid.deadline) || bid.deadline}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                        {daysLeft < 0 ? 'Overdue' : `${daysLeft} Days Left`}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                          <UserCheck size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900">{bid.approvingAuthority || 'N/A'}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Assigned Authority</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-2">
                        <span className={clsx(
                          "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 shadow-sm",
                          bid.managementApprovalStatus === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            bid.managementApprovalStatus === 'Submitted' ? "bg-blue-50 text-blue-600 border-blue-100" :
                              "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {bid.managementApprovalStatus === 'Approved' && <CheckCircle2 size={12} />}
                          {bid.managementApprovalStatus === 'Submitted' && <Send size={12} />}
                          {bid.managementApprovalStatus === 'Pending' && <Clock size={12} />}
                          {bid.managementApprovalStatus || 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                      {(bid.managementApprovalStatus === 'Submitted' || bid.managementApprovalStatus === 'Approved') ? (
                        <div className="flex flex-col items-center">
                          <div className={clsx(
                            "text-xl font-black",
                            approvalDays > 5 && bid.managementApprovalStatus === 'Submitted' ? "text-red-600" :
                              bid.managementApprovalStatus === 'Approved' ? "text-emerald-600" : "text-slate-800"
                          )}>
                            {approvalDays}d
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">
                            {bid.managementApprovalStatus === 'Approved' ? 'Approval Time' : 'Waiting Time'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-300">—</div>
                      )}
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button
                        onClick={() => onViewBid(bid.id)}
                        className="p-3 hover:bg-slate-900 hover:text-white text-slate-400 rounded-2xl border border-slate-200 transition-all active:scale-95"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBids.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center text-slate-300">
            <div className="p-8 bg-slate-50 rounded-full mb-6">
              <ShieldCheck size={48} className="opacity-20" />
            </div>
            <p className="text-2xl font-black text-slate-800 uppercase tracking-widest">Clear Pipeline</p>
            <p className="text-sm font-medium italic mt-2">No bids match the chosen filter.</p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <SummaryCard
          label="Pending Submission"
          value={bids.filter(b => b.managementApprovalStatus === 'Submitted').length}
          sub="Awaiting authority review"
          icon={<Clock className="text-amber-500" />}
        />
        <SummaryCard
          label="Submission Deadline Risks"
          value={criticalBids.length}
          sub="Near-expiry clearances"
          icon={<AlertTriangle className="text-red-500" />}
          critical
        />
        <SummaryCard
          label="Average Approval Cycle"
          value={useMemo(() => {
            const approvedBids = bids.filter(b => b.managementApprovalStatus === 'Approved' && b.approvalRequestedDate && b.managementApprovalDate);
            if (approvedBids.length === 0) return 0;
            const total = approvedBids.reduce((acc, b) => acc + getDaysPending(b.approvalRequestedDate, b.managementApprovalDate), 0);
            return Math.round(total / approvedBids.length);
          }, [bids])}
          sub="Days per clearance"
          icon={<Timer className="text-blue-500" />}
        />
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; sub: string; icon: React.ReactNode; critical?: boolean }> = ({ label, value, sub, icon, critical }) => (
  <div className={clsx(
    "bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6",
    critical && "border-red-100 bg-red-50/20"
  )}>
    <div className="p-4 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 shrink-0">
      {icon}
    </div>
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 italic">{sub}</div>
    </div>
  </div>
);

export default ApprovalsView;
