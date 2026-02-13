import React, { useMemo } from 'react';
import { Trophy, TrendingUp, BarChart3, Calendar, Users } from 'lucide-react';
import { BidRecord, BidStatus } from '../../types.ts';
import { SectionCard, winRateByDimension, formatPKR, MiniBar } from './ReportHelpers.tsx';
import { clsx } from 'clsx';

interface Props { bids: BidRecord[]; }

const JBCPerformanceBench: React.FC<Props> = ({ bids }) => {
  const byJBC = useMemo(() => winRateByDimension(bids, b => b.jbcName || 'Unknown'), [bids]);

  // Weekly submissions per JBC (last 8 weeks)
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; start: Date; end: Date }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      weeks.push({ label: `W${8 - i}`, start, end });
    }
    const jbcNames = [...new Set(bids.map(b => b.jbcName || 'Unknown'))];
    const matrix: Record<string, number[]> = {};
    jbcNames.forEach(jbc => {
      matrix[jbc] = weeks.map(w => {
        return bids.filter(b => {
          if ((b.jbcName || 'Unknown') !== jbc) return false;
          if (b.status !== BidStatus.SUBMITTED && b.status !== BidStatus.WON && b.status !== BidStatus.LOST) return false;
          const sd = b.submissionDate ? new Date(b.submissionDate) : null;
          if (!sd) return false;
          return sd >= w.start && sd <= w.end;
        }).length;
      });
    });
    return { weeks: weeks.map(w => w.label), matrix, jbcNames };
  }, [bids]);

  // JBC × Product heatmap
  const jbcProducts = useMemo(() => {
    const products = [...new Set(bids.flatMap(b => b.requiredSolutions || []))].filter(Boolean);
    const jbcNames = [...new Set(bids.map(b => b.jbcName || 'Unknown'))];
    const heat: Record<string, Record<string, number>> = {};
    jbcNames.forEach(j => { heat[j] = {}; products.forEach(p => heat[j][p] = 0); });
    bids.forEach(b => {
      const j = b.jbcName || 'Unknown';
      (b.requiredSolutions || []).forEach(p => { if (heat[j]) heat[j][p] = (heat[j][p] || 0) + 1; });
    });
    return { products, jbcNames, heat };
  }, [bids]);

  const maxWeekly = useMemo(() => Math.max(...Object.values(weeklyData.matrix).flat(), 1), [weeklyData]);

  // Avg cycle per JBC
  const jbcCycle = useMemo(() => {
    const result: Record<string, number> = {};
    byJBC.forEach(j => {
      const jbcBids = bids.filter(b => (b.jbcName || 'Unknown') === j.key && b.submissionDate && b.receivedDate);
      if (jbcBids.length === 0) { result[j.key] = 0; return; }
      const avg = jbcBids.reduce((acc, b) => {
        const s = new Date(b.receivedDate).getTime();
        const e = new Date(b.submissionDate!).getTime();
        return acc + Math.max(0, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
      }, 0) / jbcBids.length;
      result[j.key] = Math.round(avg);
    });
    return result;
  }, [bids, byJBC]);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* JBC Leaderboard */}
      <SectionCard title="JBC Leaderboard" subtitle="Sales person performance ranking" icon={<Trophy size={18} className="text-amber-500" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">JBC Name</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-center">Active</th>
                <th className="px-4 py-3 text-center">Submitted</th>
                <th className="px-4 py-3 text-center">Won</th>
                <th className="px-4 py-3 text-center">Lost</th>
                <th className="px-4 py-3 text-center">No Bid</th>
                <th className="px-4 py-3 text-center">Win %</th>
                <th className="px-4 py-3 text-right">Pipeline Value</th>
                <th className="px-4 py-3 text-right">Won Value</th>
                <th className="px-4 py-3 text-center">Avg Cycle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {byJBC.map((j, i) => {
                const wonValue = bids.filter(b => (b.jbcName || 'Unknown') === j.key && b.status === BidStatus.WON).reduce((a, b) => a + (b.estimatedValue || 0), 0);
                const activeCount = bids.filter(b => (b.jbcName || 'Unknown') === j.key && b.status === BidStatus.ACTIVE).length;
                const submittedCount = bids.filter(b => (b.jbcName || 'Unknown') === j.key && b.status === BidStatus.SUBMITTED).length;
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <span className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black", i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400")}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-black text-slate-800 group-hover:text-[#D32F2F] transition-colors">{j.key}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600 text-center">{j.total}</td>
                    <td className="px-4 py-3 text-xs font-bold text-blue-600 text-center">{activeCount}</td>
                    <td className="px-4 py-3 text-xs font-bold text-amber-600 text-center">{submittedCount}</td>
                    <td className="px-4 py-3 text-xs font-bold text-emerald-600 text-center">{j.won}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-400 text-center">{j.lost}</td>
                    <td className="px-4 py-3 text-xs font-bold text-red-500 text-center">{j.noBid}</td>
                    <td className="px-4 py-3 text-center"><span className={clsx("text-xs font-black px-2 py-0.5 rounded-lg", j.winRate >= 50 ? "bg-emerald-50 text-emerald-700" : j.winRate > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-400")}>{j.winRate}%</span></td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600 text-right">{formatPKR(j.value)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-emerald-600 text-right">{formatPKR(wonValue)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-500 text-center">{jbcCycle[j.key] || '-'}d</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Submission Tracker */}
        <SectionCard title="Weekly Submissions" subtitle="Last 8 weeks per JBC" icon={<Calendar size={18} className="text-blue-500" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2">JBC</th>
                  {weeklyData.weeks.map((w, i) => <th key={i} className="px-2 py-2 text-center">{w}</th>)}
                  <th className="px-3 py-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {weeklyData.jbcNames.map((jbc, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2.5 text-[10px] font-black text-slate-700 truncate max-w-[100px]">{jbc}</td>
                    {weeklyData.matrix[jbc].map((count, j) => (
                      <td key={j} className="px-2 py-2.5 text-center">
                        {count > 0 ? (
                          <span className={clsx("inline-block w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center mx-auto", count >= 3 ? "bg-emerald-500 text-white" : count >= 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-600")}>{count}</span>
                        ) : (
                          <span className="text-[10px] text-slate-200">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center text-xs font-black text-slate-700">{weeklyData.matrix[jbc].reduce((a, b) => a + b, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* JBC × Product Heatmap */}
        <SectionCard title="JBC × Product Matrix" subtitle="Which solutions each JBC handles" icon={<BarChart3 size={18} className="text-indigo-500" />}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-2 py-2">JBC</th>
                  {jbcProducts.products.slice(0, 8).map((p, i) => (
                    <th key={i} className="px-1 py-2 text-center" title={p}><span className="block truncate max-w-[50px]">{p.split(' ')[0]}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jbcProducts.jbcNames.map((jbc, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-2 py-2 text-[9px] font-black text-slate-700 truncate max-w-[80px]">{jbc}</td>
                    {jbcProducts.products.slice(0, 8).map((p, j) => {
                      const v = jbcProducts.heat[jbc]?.[p] || 0;
                      return (
                        <td key={j} className="px-1 py-2 text-center">
                          <span className={clsx("inline-block w-6 h-6 rounded text-[9px] font-black flex items-center justify-center mx-auto", v > 3 ? "bg-indigo-500 text-white" : v > 1 ? "bg-indigo-100 text-indigo-700" : v === 1 ? "bg-indigo-50 text-indigo-400" : "bg-slate-50 text-slate-200")}>{v || '·'}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default JBCPerformanceBench;
