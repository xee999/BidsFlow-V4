import React, { useMemo } from 'react';
import { Clock, Zap, AlertCircle, TrendingUp, TrendingDown, Activity, ShieldCheck, Timer } from 'lucide-react';
import { BidRecord, BidStatus, BidStage } from '../../types.ts';
import { SectionCard, KPIStat, STAGE_COLORS, formatPKR } from './ReportHelpers.tsx';
import { calculateDaysInStages } from '../../services/utils.ts';
import { clsx } from 'clsx';

interface Props { bids: BidRecord[]; }

const VelocityEngine: React.FC<Props> = ({ bids }) => {
  const activeBids = useMemo(() => bids.filter(b => b.status === BidStatus.ACTIVE || b.status === BidStatus.SUBMITTED), [bids]);
  const completedBids = useMemo(() => bids.filter(b => [BidStatus.SUBMITTED, BidStatus.WON, BidStatus.LOST].includes(b.status as BidStatus)), [bids]);

  // Stage dwell time stats
  const stageDwell = useMemo(() => {
    const stages = Object.values(BidStage);
    return stages.map(stage => {
      const times = completedBids.map(b => {
        const days = calculateDaysInStages(b.receivedDate, b.stageHistory || [], b.currentStage);
        return days[stage] || 0;
      }).filter(d => d > 0);
      const sorted = [...times].sort((a, b) => a - b);
      return {
        stage,
        avg: times.length > 0 ? parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)) : 0,
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        median: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0,
        count: times.length
      };
    });
  }, [completedBids]);

  const bottleneck = useMemo(() => stageDwell.reduce((a, b) => a.avg > b.avg ? a : b, stageDwell[0]), [stageDwell]);
  const maxDwell = Math.max(...stageDwell.map(s => s.max), 1);

  // Avg end-to-end
  const avgE2E = useMemo(() => {
    const valid = completedBids.filter(b => b.submissionDate && b.receivedDate);
    if (valid.length === 0) return 0;
    return parseFloat((valid.reduce((acc, b) => {
      const s = new Date(b.receivedDate).getTime();
      const e = new Date(b.submissionDate!).getTime();
      return acc + Math.max(0, (e - s) / (1000 * 60 * 60 * 24));
    }, 0) / valid.length).toFixed(1));
  }, [completedBids]);

  // Approval TAT
  const approvalTAT = useMemo(() => {
    const withApproval = bids.filter(b => b.approvalRequestedDate && b.managementApprovalDate);
    if (withApproval.length === 0) return { avg: 0, count: 0 };
    const avg = withApproval.reduce((acc, b) => {
      const s = new Date(b.approvalRequestedDate!).getTime();
      const e = new Date(b.managementApprovalDate!).getTime();
      return acc + Math.max(0, (e - s) / (1000 * 60 * 60 * 24));
    }, 0) / withApproval.length;
    return { avg: parseFloat(avg.toFixed(1)), count: withApproval.length };
  }, [bids]);

  // On-track rate
  const onTrackRate = useMemo(() => {
    const withTargets = activeBids.filter(b => b.phaseTargets);
    if (withTargets.length === 0) return 0;
    const onTrack = withTargets.filter(b => {
      const days = calculateDaysInStages(b.receivedDate, b.stageHistory || [], b.currentStage);
      const target = b.phaseTargets?.[b.currentStage] || Infinity;
      return (days[b.currentStage] || 0) <= target;
    }).length;
    return Math.round((onTrack / withTargets.length) * 100);
  }, [activeBids]);

  // Bid security TAT
  const securityTAT = useMemo(() => {
    const withSecurity = bids.filter(b => b.bidSecurityRaisedDate);
    const raisedAvg = withSecurity.length > 0 ? withSecurity.reduce((acc, b) => {
      const s = new Date(b.receivedDate).getTime();
      const e = new Date(b.bidSecurityRaisedDate!).getTime();
      return acc + Math.max(0, (e - s) / (1000 * 60 * 60 * 24));
    }, 0) / withSecurity.length : 0;
    const readyBids = bids.filter(b => b.bidSecurityRaisedDate && b.bidSecurityReadyDate);
    const readyAvg = readyBids.length > 0 ? readyBids.reduce((acc, b) => {
      const s = new Date(b.bidSecurityRaisedDate!).getTime();
      const e = new Date(b.bidSecurityReadyDate!).getTime();
      return acc + Math.max(0, (e - s) / (1000 * 60 * 60 * 24));
    }, 0) / readyBids.length : 0;
    return { raisedAvg: parseFloat(raisedAvg.toFixed(1)), readyAvg: parseFloat(readyAvg.toFixed(1)), count: withSecurity.length };
  }, [bids]);

  // Complexity impact on cycle time
  const complexityCycle = useMemo(() => {
    return ['Low', 'Medium', 'High'].map(c => {
      const cb = completedBids.filter(b => b.complexity === c && b.submissionDate && b.receivedDate);
      if (cb.length === 0) return { complexity: c, avg: 0, count: 0 };
      const avg = cb.reduce((acc, b) => {
        return acc + Math.max(0, (new Date(b.submissionDate!).getTime() - new Date(b.receivedDate).getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / cb.length;
      return { complexity: c, avg: parseFloat(avg.toFixed(1)), count: cb.length };
    });
  }, [completedBids]);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPIStat label="Avg End-to-End" value={`${avgE2E}d`} sub="Receipt → Submission" color="text-blue-500" icon={<Clock size={16} />} />
        <KPIStat label="Bottleneck" value={bottleneck?.stage || 'N/A'} sub={`${bottleneck?.avg || 0}d average`} color="text-red-500" icon={<AlertCircle size={16} />} />
        <KPIStat label="Approval TAT" value={`${approvalTAT.avg}d`} sub={`${approvalTAT.count} approvals`} color="text-amber-500" icon={<Timer size={16} />} />
        <KPIStat label="On-Track Rate" value={`${onTrackRate}%`} sub="Within phase targets" color="text-emerald-500" icon={<TrendingUp size={16} />} progress={onTrackRate} />
        <KPIStat label="Security TAT" value={`${securityTAT.raisedAvg}d`} sub={`${securityTAT.count} securities raised`} color="text-violet-500" icon={<ShieldCheck size={16} />} />
      </div>

      {/* Stage Dwell Distribution */}
      <SectionCard title="Stage Dwell Time Distribution" subtitle="Min / Median / Max days per stage" icon={<Activity size={18} className="text-sky-500" />}>
        <div className="space-y-5">
          {stageDwell.map((s, i) => (
            <div key={i} className="group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase w-28">{s.stage}</span>
                <div className="flex gap-4 text-[9px] font-bold text-slate-400">
                  <span>Min: <span className="text-slate-600">{s.min.toFixed(1)}d</span></span>
                  <span>Med: <span className="text-slate-600">{s.median.toFixed(1)}d</span></span>
                  <span>Avg: <span className="text-slate-700 font-black">{s.avg}d</span></span>
                  <span>Max: <span className="text-slate-600">{s.max.toFixed(1)}d</span></span>
                </div>
              </div>
              <div className="h-6 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 relative">
                {/* Range bar */}
                <div className={clsx("absolute h-full opacity-20", STAGE_COLORS[s.stage] || 'bg-slate-400')} style={{ left: `${(s.min / maxDwell) * 100}%`, width: `${((s.max - s.min) / maxDwell) * 100}%` }}></div>
                {/* Median marker */}
                <div className="absolute h-full w-0.5 bg-slate-400" style={{ left: `${(s.median / maxDwell) * 100}%` }}></div>
                {/* Average bar */}
                <div className={clsx("h-full rounded-lg transition-all duration-700 hover:brightness-110", STAGE_COLORS[s.stage] || 'bg-slate-400')} style={{ width: `${(s.avg / maxDwell) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Complexity Impact */}
        <SectionCard title="Complexity vs Cycle Time" subtitle="How complexity affects duration" icon={<Zap size={18} className="text-amber-500" />}>
          <div className="space-y-4">
            {complexityCycle.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className={clsx("px-3 py-1.5 rounded-xl text-[10px] font-black uppercase", c.complexity === 'High' ? "bg-red-100 text-red-700" : c.complexity === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{c.complexity}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{c.count} bids</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-slate-800">{c.avg}d</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">Avg Cycle</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Bid Security TAT */}
        <SectionCard title="Bid Security Timeline" subtitle="Days to raise and finalize security" icon={<ShieldCheck size={18} className="text-violet-500" />}>
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div><div className="text-[10px] font-black text-slate-500 uppercase">Intake → Raised</div><div className="text-[9px] text-slate-400 mt-0.5">Average days to send security request</div></div>
              <div className="text-xl font-black text-amber-600">{securityTAT.raisedAvg}d</div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div><div className="text-[10px] font-black text-slate-500 uppercase">Raised → Ready</div><div className="text-[9px] text-slate-400 mt-0.5">Average days to get security ready</div></div>
              <div className="text-xl font-black text-emerald-600">{securityTAT.readyAvg}d</div>
            </div>
            <div className="p-5 bg-violet-50 rounded-2xl border border-violet-100 flex items-center justify-between">
              <div><div className="text-[10px] font-black text-violet-600 uppercase">Total Security Cycle</div></div>
              <div className="text-xl font-black text-violet-700">{(securityTAT.raisedAvg + securityTAT.readyAvg).toFixed(1)}d</div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Lifecycle Velocity Track — keep existing pattern */}
      <SectionCard title="Lifecycle Velocity Track" subtitle="Per-bid stage timing breakdown" icon={<Activity size={18} className="text-[#D32F2F]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Bid</th>
                {Object.values(BidStage).map(s => <th key={s} className="px-3 py-3 text-center">{s}</th>)}
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {completedBids.slice(0, 20).map((bid, i) => {
                const days = calculateDaysInStages(bid.receivedDate, bid.stageHistory || [], bid.currentStage);
                const total = Object.values(days).reduce((a, b) => a + (b as number), 0);
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="text-[10px] font-black text-slate-800 group-hover:text-[#D32F2F] transition-colors truncate max-w-[150px]">{bid.projectName}</div>
                      <div className="text-[9px] text-slate-400 font-bold">{bid.id}</div>
                    </td>
                    {Object.values(BidStage).map(stage => {
                      const d = days[stage] || 0;
                      return (
                        <td key={stage} className="px-3 py-3 text-center">
                          {d > 0 ? (
                            <span className={clsx("inline-block px-2 py-1 rounded-lg text-[10px] font-black", d > 10 ? "bg-red-50 text-red-600" : d > 5 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")}>{d.toFixed(1)}d</span>
                          ) : <span className="text-[10px] text-slate-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right text-xs font-black text-slate-700">{total.toFixed(1)}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

export default VelocityEngine;
