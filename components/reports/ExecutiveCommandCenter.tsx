import React, { useMemo } from 'react';
import { Trophy, Target, Ban, Clock, TrendingUp, DollarSign, BarChart3, Zap, Activity, Users, Briefcase } from 'lucide-react';
import { BidRecord, BidStatus } from '../../types.ts';
import { KPIStat, LegendItem, SectionCard, MiniBar, formatPKR, winRateByDimension, monthlyTrend } from './ReportHelpers.tsx';
import { clsx } from 'clsx';
import { SOLUTION_OPTIONS } from '../../constants.tsx';

interface Props { bids: BidRecord[]; stats: ReturnType<typeof import('./ReportHelpers.tsx').computeStats>; }

const ExecutiveCommandCenter: React.FC<Props> = ({ bids, stats }) => {
  const trend = useMemo(() => monthlyTrend(bids, 12), [bids]);
  const maxMonthly = useMemo(() => Math.max(...trend.map(t => t.won + t.lost + t.noBid + t.submitted + t.active), 1), [trend]);

  const byProduct = useMemo(() => winRateByDimension(bids, b => b.requiredSolutions?.length ? b.requiredSolutions : ['Unspecified']), [bids]);
  const byRegion = useMemo(() => winRateByDimension(bids, b => b.region || 'Unknown'), [bids]);
  const byChannel = useMemo(() => winRateByDimension(bids, b => b.channel || 'Unknown'), [bids]);

  const maxProductValue = useMemo(() => Math.max(...byProduct.map(p => p.value), 1), [byProduct]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPIStat label="Total Bids" value={`${stats.total}`} sub="In Scope" color="text-slate-500" icon={<Briefcase size={16} />} />
        <KPIStat label="Win Rate" value={`${stats.winRate}%`} sub="Won ÷ (Won+Lost)" color="text-emerald-500" icon={<Trophy size={16} />} progress={stats.winRate} />
        <KPIStat label="Active Pipeline" value={formatPKR(stats.activeValue)} sub="Estimated Value" color="text-blue-500" icon={<Target size={16} />} />
        <KPIStat label="Revenue Won" value={formatPKR(stats.wonValue)} sub="Closed Value" color="text-emerald-600" icon={<DollarSign size={16} />} />
        <KPIStat label="Avg Cycle" value={`${stats.avgCycle}d`} sub="Receipt → Submit" color="text-amber-500" icon={<Clock size={16} />} />
        <KPIStat label="Bid / No-Bid" value={stats.bidNoBidRatio} sub="Selectivity Ratio" color="text-red-500" icon={<Ban size={16} />} />
      </div>

      {/* Status Funnel */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 text-left">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Bid Portfolio Distribution</h2>
            <p className="text-xs text-slate-400 font-bold uppercase mt-1">Current Opportunity Landscape</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <LegendItem label={`Won (${stats.won.length})`} color="bg-emerald-500" />
            <LegendItem label={`Lost (${stats.lost.length})`} color="bg-slate-400" />
            <LegendItem label={`No Bid (${stats.noBid.length})`} color="bg-red-500" />
            <LegendItem label={`Active (${stats.active.length})`} color="bg-blue-500" />
            <LegendItem label={`Submitted (${stats.submitted.length})`} color="bg-amber-500" />
            <LegendItem label={`Not Submitted (${stats.notSubmitted.length})`} color="bg-orange-400" />
          </div>
        </div>
        <div className="h-20 w-full flex rounded-[1.2rem] overflow-hidden shadow-inner border-[6px] border-white ring-1 ring-slate-100">
          {[
            { pct: stats.wonPercent, color: 'bg-emerald-500', label: `Won: ${stats.won.length}` },
            { pct: stats.lostPercent, color: 'bg-slate-400', label: `Lost: ${stats.lost.length}` },
            { pct: stats.noBidPercent, color: 'bg-red-500', label: `No Bid: ${stats.noBid.length}` },
            { pct: stats.activePercent, color: 'bg-blue-500', label: `Active: ${stats.active.length}` },
            { pct: stats.submittedPercent, color: 'bg-amber-500', label: `Submitted: ${stats.submitted.length}` },
            { pct: stats.notSubmittedPercent, color: 'bg-orange-400', label: `Not Submitted: ${stats.notSubmitted.length}` },
          ].map((s, i) => (
            <div key={i} className={clsx("h-full hover:brightness-110 transition-all cursor-help", s.color)} style={{ width: `${s.pct}%` }} title={s.label}></div>
          ))}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 mt-10 text-center gap-4 md:divide-x md:divide-slate-100">
          {[
            { count: stats.won.length, label: 'Won', sub: formatPKR(stats.wonValue) },
            { count: stats.lost.length, label: 'Lost', sub: 'Historical' },
            { count: stats.noBid.length, label: 'No Bid', sub: 'Strategic' },
            { count: stats.active.length, label: 'Active', sub: 'Pipeline' },
            { count: stats.submitted.length, label: 'Submitted', sub: 'Awaiting' },
            { count: stats.notSubmitted.length, label: 'Not Submitted', sub: 'Expired' },
          ].map((s, i) => (
            <div key={i} className="px-4 group">
              <div className="text-2xl font-black text-slate-900 group-hover:text-[#D32F2F] transition-all">{s.count}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</div>
              <div className="text-[9px] text-slate-500 mt-2 font-black italic bg-slate-50 rounded-xl py-1 px-3 inline-block border border-slate-100">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trend */}
        <SectionCard title="Monthly Bid Trend" subtitle="Last 12 months by received date" icon={<TrendingUp size={18} className="text-blue-500" />}>
          <div className="space-y-3">
            {trend.map((m, i) => {
              const total = m.won + m.lost + m.noBid + m.submitted + m.active;
              return (
                <div key={i} className="flex items-center gap-4 group">
                  <span className="text-[10px] font-black text-slate-400 uppercase w-16 shrink-0">{m.label}</span>
                  <div className="flex-1 h-7 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex">
                    {m.won > 0 && <div className="h-full bg-emerald-500 hover:brightness-110 transition-all" style={{ width: `${(m.won / maxMonthly) * 100}%` }} title={`Won: ${m.won}`}></div>}
                    {m.lost > 0 && <div className="h-full bg-slate-400 hover:brightness-110 transition-all" style={{ width: `${(m.lost / maxMonthly) * 100}%` }} title={`Lost: ${m.lost}`}></div>}
                    {m.noBid > 0 && <div className="h-full bg-red-400 hover:brightness-110 transition-all" style={{ width: `${(m.noBid / maxMonthly) * 100}%` }} title={`No Bid: ${m.noBid}`}></div>}
                    {m.submitted > 0 && <div className="h-full bg-amber-400 hover:brightness-110 transition-all" style={{ width: `${(m.submitted / maxMonthly) * 100}%` }} title={`Submitted: ${m.submitted}`}></div>}
                    {m.active > 0 && <div className="h-full bg-blue-400 hover:brightness-110 transition-all" style={{ width: `${(m.active / maxMonthly) * 100}%` }} title={`Active: ${m.active}`}></div>}
                  </div>
                  <span className="text-[10px] font-black text-slate-600 w-6 text-right">{total}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100">
            <LegendItem label="Won" color="bg-emerald-500" /><LegendItem label="Lost" color="bg-slate-400" />
            <LegendItem label="No Bid" color="bg-red-400" /><LegendItem label="Submitted" color="bg-amber-400" />
            <LegendItem label="Active" color="bg-blue-400" />
          </div>
        </SectionCard>

        {/* Pipeline Value by Product */}
        <SectionCard title="Pipeline by Product" subtitle="Estimated value per solution line" icon={<BarChart3 size={18} className="text-indigo-500" />}>
          <div className="space-y-4">
            {byProduct.map((p, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-slate-700 truncate max-w-[60%]">{p.key}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400">{p.total} bids</span>
                    <span className="text-[10px] font-black text-emerald-600">{p.winRate}% win</span>
                  </div>
                </div>
                <MiniBar value={p.value} max={maxProductValue} color="bg-indigo-500" label={formatPKR(p.value).replace('PKR ', '')} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Win Rate Comparison — Region × Channel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SectionCard title="Win Rate by Region" subtitle="Geographic performance" icon={<Activity size={18} className="text-sky-500" />}>
          <div className="space-y-4">
            {byRegion.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                <div>
                  <div className="text-sm font-black text-slate-900">{r.key}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">{r.total} bids • {r.won}W / {r.lost}L / {r.noBid}NB</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-600">{r.winRate}%</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Win Rate</div>
                  </div>
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray={`${r.winRate} ${100 - r.winRate}`} strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Win Rate by Channel" subtitle="B2G vs Enterprise" icon={<Users size={18} className="text-violet-500" />}>
          <div className="space-y-4">
            {byChannel.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                <div>
                  <div className="text-sm font-black text-slate-900">{c.key}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">{c.total} bids • {formatPKR(c.value)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-black text-emerald-600">{c.winRate}%</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Win Rate</div>
                  </div>
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray={`${c.winRate} ${100 - c.winRate}`} strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default ExecutiveCommandCenter;
