import React, { useMemo } from 'react';
import { Layers, MapPin, Users, BarChart3, Zap, Building2, Repeat } from 'lucide-react';
import { BidRecord, BidStatus, BidStage } from '../../types.ts';
import { SectionCard, winRateByDimension, formatPKR, MiniBar, STAGE_COLORS } from './ReportHelpers.tsx';
import { clsx } from 'clsx';

interface Props { bids: BidRecord[]; }

const PipelineAnalytics: React.FC<Props> = ({ bids }) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const activeBids = useMemo(() => bids.filter(b => {
    const parts = b.deadline.split('-');
    const dl = parts.length >= 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(b.deadline);
    return b.status === BidStatus.ACTIVE && dl >= startOfToday;
  }), [bids]);

  // Pipeline by stage
  const byStage = useMemo(() => {
    const stages = Object.values(BidStage);
    return stages.map(s => ({
      stage: s, count: activeBids.filter(b => b.currentStage === s).length,
      value: activeBids.filter(b => b.currentStage === s).reduce((a, b) => a + (b.estimatedValue || 0), 0)
    }));
  }, [activeBids]);
  const maxStageCount = Math.max(...byStage.map(s => s.count), 1);

  // By region with details
  const byRegion = useMemo(() => {
    const regions = ['North', 'South', 'Central'];
    return regions.map(r => {
      const rb = bids.filter(b => b.region === r);
      const ra = activeBids.filter(b => b.region === r);
      const won = rb.filter(b => b.status === BidStatus.WON);
      const lost = rb.filter(b => b.status === BidStatus.LOST);
      return { region: r, total: rb.length, active: ra.length, won: won.length, lost: lost.length, value: ra.reduce((a, b) => a + (b.estimatedValue || 0), 0), winRate: (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0 };
    });
  }, [bids, activeBids]);

  // Customer analysis
  const customerData = useMemo(() => {
    const cust: Record<string, { count: number; won: number; lost: number; value: number }> = {};
    bids.forEach(b => {
      const c = b.customerName;
      if (!cust[c]) cust[c] = { count: 0, won: 0, lost: 0, value: 0 };
      cust[c].count++;
      cust[c].value += b.estimatedValue || 0;
      if (b.status === BidStatus.WON) cust[c].won++;
      if (b.status === BidStatus.LOST) cust[c].lost++;
    });
    const sorted = Object.entries(cust).sort((a, b) => b[1].count - a[1].count);
    const repeat = sorted.filter(([, v]) => v.count > 1).length;
    const unique = sorted.length;
    return { top10: sorted.slice(0, 10), repeatRate: unique > 0 ? Math.round((repeat / unique) * 100) : 0, repeat, unique };
  }, [bids]);

  // By complexity
  const byComplexity = useMemo(() => {
    return ['Low', 'Medium', 'High'].map(c => {
      const cb = bids.filter(b => b.complexity === c);
      const ca = activeBids.filter(b => b.complexity === c);
      const won = cb.filter(b => b.status === BidStatus.WON);
      const lost = cb.filter(b => b.status === BidStatus.LOST);
      return { complexity: c, total: cb.length, active: ca.length, value: ca.reduce((a, b) => a + (b.estimatedValue || 0), 0), winRate: (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0 };
    });
  }, [bids, activeBids]);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Pipeline by Stage */}
      <SectionCard title="Active Pipeline by Stage" subtitle="Current stage distribution of active bids" icon={<Layers size={18} className="text-sky-500" />}>
        <div className="space-y-4">
          {byStage.map((s, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-28 shrink-0 text-right"><span className="text-[10px] font-black text-slate-500 uppercase">{s.stage}</span></div>
              <div className="flex-1 h-10 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative group cursor-help">
                <div className={clsx("h-full rounded-xl transition-all duration-700 hover:brightness-110", STAGE_COLORS[s.stage] || 'bg-slate-400')} style={{ width: `${(s.count / maxStageCount) * 100}%` }}></div>
                <div className="absolute inset-0 flex items-center px-4"><span className="text-[10px] font-black text-slate-700">{s.count} bids • {formatPKR(s.value)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Region Comparison */}
      <SectionCard title="Pipeline by Region" subtitle="Regional comparison" icon={<MapPin size={18} className="text-emerald-500" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {byRegion.map((r, i) => (
            <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
              <div className="text-lg font-black text-slate-800 mb-1">{r.region}</div>
              <div className="text-[9px] font-black text-slate-400 uppercase">{r.total} Total Bids</div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div><div className="text-[8px] font-black text-slate-400 uppercase">Active</div><div className="text-xl font-black text-blue-600">{r.active}</div></div>
                <div><div className="text-[8px] font-black text-slate-400 uppercase">Win Rate</div><div className={clsx("text-xl font-black", r.winRate >= 50 ? "text-emerald-600" : "text-amber-600")}>{r.winRate}%</div></div>
                <div><div className="text-[8px] font-black text-slate-400 uppercase">Won</div><div className="text-lg font-black text-emerald-600">{r.won}</div></div>
                <div><div className="text-[8px] font-black text-slate-400 uppercase">Lost</div><div className="text-lg font-black text-slate-400">{r.lost}</div></div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200"><div className="text-[9px] font-black text-slate-400 uppercase">Active Value</div><div className="text-sm font-black text-slate-800">{formatPKR(r.value)}</div></div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Complexity Analysis */}
        <SectionCard title="Pipeline by Complexity" subtitle="Effort distribution" icon={<Zap size={18} className="text-amber-500" />}>
          <div className="space-y-4">
            {byComplexity.map((c, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:bg-white hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-black uppercase", c.complexity === 'High' ? "bg-red-100 text-red-700" : c.complexity === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{c.complexity}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-600">{c.total} total • {c.active} active</div>
                    <div className="text-[10px] text-slate-400 font-bold">{formatPKR(c.value)}</div>
                  </div>
                </div>
                <span className={clsx("text-lg font-black", c.winRate >= 50 ? "text-emerald-600" : "text-amber-600")}>{c.winRate}%</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Customer Heatmap */}
        <SectionCard title="Top Customers" subtitle={`${customerData.repeatRate}% repeat rate (${customerData.repeat}/${customerData.unique})`} icon={<Building2 size={18} className="text-violet-500" />}>
          <div className="space-y-2">
            {customerData.top10.map(([name, data], i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-[10px] font-black text-slate-400 w-4">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-700 truncate group-hover:text-[#D32F2F] transition-colors">{name}</div>
                    <div className="text-[9px] text-slate-400 font-bold">{data.count} bids • {data.won}W / {data.lost}L</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {data.count > 1 && <Repeat size={12} className="text-violet-400" />}
                  <span className="text-[10px] font-bold text-slate-500">{formatPKR(data.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default PipelineAnalytics;
