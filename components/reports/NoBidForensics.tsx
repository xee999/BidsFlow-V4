import React, { useMemo, useState } from 'react';
import { Ban, PieChart, MapPin, Users, BarChart3, TrendingDown, DollarSign, Layers, Sparkles } from 'lucide-react';
import { BidRecord, BidStatus } from '../../types.ts';
import { SectionCard, winRateByDimension, formatPKR, monthlyTrend } from './ReportHelpers.tsx';
import { clsx } from 'clsx';

interface Props { bids: BidRecord[]; }

const NoBidForensics: React.FC<Props> = ({ bids }) => {
  const noBids = useMemo(() => bids.filter(b => b.status === BidStatus.NO_BID), [bids]);

  // No-Bid by reason category
  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    noBids.forEach(b => {
      const cat = b.noBidReasonCategory || 'Uncategorized';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [noBids]);
  const maxCat = Math.max(...byCategory.map(([, v]) => v), 1);

  // By stage where no-bid happened
  const byStage = useMemo(() => {
    const stages: Record<string, number> = {};
    noBids.forEach(b => {
      const s = b.noBidStage || b.currentStage || 'Unknown';
      stages[s] = (stages[s] || 0) + 1;
    });
    return Object.entries(stages).sort((a, b) => b[1] - a[1]);
  }, [noBids]);

  // By product
  const byProduct = useMemo(() => {
    const prods: Record<string, number> = {};
    noBids.forEach(b => (b.requiredSolutions || []).forEach(s => { prods[s] = (prods[s] || 0) + 1; }));
    return Object.entries(prods).sort((a, b) => b[1] - a[1]);
  }, [noBids]);

  // By region
  const byRegion = useMemo(() => {
    const regs: Record<string, number> = {};
    noBids.forEach(b => { const r = b.region || 'Unknown'; regs[r] = (regs[r] || 0) + 1; });
    return Object.entries(regs).sort((a, b) => b[1] - a[1]);
  }, [noBids]);

  // By JBC
  const byJBC = useMemo(() => {
    const jbcs: Record<string, number> = {};
    noBids.forEach(b => { const j = b.jbcName || 'Unknown'; jbcs[j] = (jbcs[j] || 0) + 1; });
    return Object.entries(jbcs).sort((a, b) => b[1] - a[1]);
  }, [noBids]);

  // Value lost
  const valueLost = useMemo(() => noBids.reduce((acc, b) => acc + (b.estimatedValue || 0), 0), [noBids]);

  // Monthly trend
  const trend = useMemo(() => {
    const now = new Date();
    const result: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      result.push({
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        count: noBids.filter(b => { const rd = new Date(b.receivedDate); return rd.getMonth() === m && rd.getFullYear() === y; }).length
      });
    }
    return result;
  }, [noBids]);
  const maxTrend = Math.max(...trend.map(t => t.count), 1);

  // No-bid reasons list
  const allReasons = useMemo(() => {
    const reasons: Record<string, number> = {};
    noBids.forEach(b => {
      (b.noBidReasons || []).forEach(r => { reasons[r] = (reasons[r] || 0) + 1; });
      if (b.noBidReason && !(b.noBidReasons || []).length) reasons[b.noBidReason] = (reasons[b.noBidReason] || 0) + 1;
    });
    return Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  }, [noBids]);

  const noBidRate = bids.length > 0 ? Math.round((noBids.length / bids.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100">
          <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-3">Total No-Bids</div>
          <div className="text-3xl font-black text-red-700">{noBids.length}</div>
          <div className="text-[10px] text-red-400 font-bold mt-1">{noBidRate}% of all bids</div>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2.5rem]">
          <div className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-3">Value Lost</div>
          <div className="text-2xl font-black text-white">{formatPKR(valueLost)}</div>
          <div className="text-[10px] text-white/40 font-bold mt-1">Cost of Selectivity</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Reason</div>
          <div className="text-sm font-black text-slate-800">{byCategory[0]?.[0] || 'N/A'}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-1">{byCategory[0]?.[1] || 0} occurrences</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200">
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Kill Stage</div>
          <div className="text-sm font-black text-slate-800">{byStage[0]?.[0] || 'N/A'}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-1">Most common exit point</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reason Distribution */}
        <SectionCard title="Rejection Reasons" subtitle="Why we say no" icon={<PieChart size={18} className="text-red-500" />}>
          <div className="space-y-3">
            {allReasons.slice(0, 10).map(([reason, count], i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-slate-600 truncate max-w-[70%]">{reason}</span>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{count}</span>
                </div>
                <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div className="h-full bg-red-400 rounded-full transition-all duration-700 group-hover:bg-red-500" style={{ width: `${(count / maxCat) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Monthly Trend */}
        <SectionCard title="Monthly No-Bid Trend" subtitle="12-month rejection trajectory" icon={<TrendingDown size={18} className="text-orange-500" />}>
          <div className="flex items-end gap-1.5 h-40">
            {trend.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="text-[8px] font-black text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</div>
                <div className="w-full bg-red-400 rounded-t-lg hover:bg-red-500 transition-all cursor-help" style={{ height: `${(m.count / maxTrend) * 100}%`, minHeight: m.count > 0 ? '4px' : '0' }}></div>
                <div className="text-[7px] font-bold text-slate-400 mt-1.5 -rotate-45 origin-top-left">{m.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* By Stage */}
        <SectionCard title="No-Bid by Stage" subtitle="Exit points" icon={<Layers size={18} className="text-sky-500" />}>
          <div className="space-y-3">
            {byStage.map(([stage, count], i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-700 uppercase">{stage}</span>
                <span className="text-sm font-black text-slate-800">{count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* By Region */}
        <SectionCard title="No-Bid by Region" subtitle="Geographic rejection" icon={<MapPin size={18} className="text-emerald-500" />}>
          <div className="space-y-3">
            {byRegion.map(([region, count], i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-700 uppercase">{region}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800">{count}</span>
                  <span className="text-[9px] font-bold text-slate-400">{bids.length > 0 ? Math.round((count / noBids.length) * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* By JBC */}
        <SectionCard title="No-Bid by JBC" subtitle="Who flags most no-bids" icon={<Users size={18} className="text-violet-500" />}>
          <div className="space-y-3">
            {byJBC.slice(0, 6).map(([jbc, count], i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-700 truncate max-w-[60%]">{jbc}</span>
                <span className="text-sm font-black text-slate-800">{count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* By Product */}
      <SectionCard title="No-Bid by Product" subtitle="Which solutions are we rejecting most?" icon={<BarChart3 size={18} className="text-indigo-500" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byProduct.map(([product, count], i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center hover:bg-white hover:shadow-sm transition-all">
              <div className="text-lg font-black text-slate-800">{count}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase mt-1 truncate">{product}</div>
              <div className="text-[9px] text-red-400 font-bold mt-1">{formatPKR(noBids.filter(b => (b.requiredSolutions || []).includes(product)).reduce((a, b) => a + (b.estimatedValue || 0), 0))} lost</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

export default NoBidForensics;
