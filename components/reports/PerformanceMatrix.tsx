import React, { useMemo } from 'react';
import { Trophy, Target, BarChart3, Zap, Users, Layers, ShieldAlert, Sparkles, ChevronDown } from 'lucide-react';
import { BidRecord, BidStatus } from '../../types.ts';
import { SectionCard, winRateByDimension, formatPKR } from './ReportHelpers.tsx';
import { clsx } from 'clsx';

interface Props { bids: BidRecord[]; }

const PerformanceMatrix: React.FC<Props> = ({ bids }) => {
  const byRegion = useMemo(() => winRateByDimension(bids, b => b.region || 'Unknown'), [bids]);
  const byChannel = useMemo(() => winRateByDimension(bids, b => b.channel || 'Unknown'), [bids]);
  const byProduct = useMemo(() => winRateByDimension(bids, b => b.requiredSolutions?.length ? b.requiredSolutions : ['Unspecified']), [bids]);
  const byComplexity = useMemo(() => winRateByDimension(bids, b => b.complexity || 'Unknown'), [bids]);
  const byJBC = useMemo(() => winRateByDimension(bids, b => b.jbcName || 'Unknown'), [bids]);

  // AI Accuracy
  const aiAccuracy = useMemo(() => {
    const withAI = bids.filter(b => b.aiQualificationAssessment && [BidStatus.WON, BidStatus.LOST, BidStatus.NO_BID].includes(b.status as BidStatus));
    const goAndWon = withAI.filter(b => b.aiQualificationAssessment === 'Go' && b.status === BidStatus.WON).length;
    const goTotal = withAI.filter(b => b.aiQualificationAssessment === 'Go').length;
    const noGoAndNoBid = withAI.filter(b => b.aiQualificationAssessment === 'No-Go' && b.status === BidStatus.NO_BID).length;
    const noGoTotal = withAI.filter(b => b.aiQualificationAssessment === 'No-Go').length;
    return { total: withAI.length, goAccuracy: goTotal > 0 ? Math.round((goAndWon / goTotal) * 100) : 0, noGoAccuracy: noGoTotal > 0 ? Math.round((noGoAndNoBid / noGoTotal) * 100) : 0, goTotal, noGoTotal, goAndWon, noGoAndNoBid };
  }, [bids]);

  // Risk vs Outcome
  const riskOutcome = useMemo(() => {
    const groups: Record<string, { won: number; lost: number; noBid: number; total: number }> = {};
    ['Low', 'Medium', 'High'].forEach(r => groups[r] = { won: 0, lost: 0, noBid: 0, total: 0 });
    bids.forEach(b => {
      const r = b.riskLevel || 'Low';
      if (!groups[r]) groups[r] = { won: 0, lost: 0, noBid: 0, total: 0 };
      groups[r].total++;
      if (b.status === BidStatus.WON) groups[r].won++;
      if (b.status === BidStatus.LOST) groups[r].lost++;
      if (b.status === BidStatus.NO_BID) groups[r].noBid++;
    });
    return groups;
  }, [bids]);

  // Conversion Funnel
  const funnel = useMemo(() => {
    const now = new Date(); const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const total = bids.length;
    const active = bids.filter(b => { const parts = b.deadline.split('-'); const dl = parts.length >= 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(b.deadline); return b.status === BidStatus.ACTIVE && dl >= startOfToday; }).length;
    const submitted = bids.filter(b => b.status === BidStatus.SUBMITTED).length;
    const won = bids.filter(b => b.status === BidStatus.WON).length;
    const noBid = bids.filter(b => b.status === BidStatus.NO_BID).length;
    return { total, active, submitted, won, noBid };
  }, [bids]);

  const renderTable = (data: ReturnType<typeof winRateByDimension>, title: string) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
          <tr>
            <th className="px-4 py-3">{title}</th>
            <th className="px-4 py-3 text-center">Bids</th>
            <th className="px-4 py-3 text-center">Won</th>
            <th className="px-4 py-3 text-center">Lost</th>
            <th className="px-4 py-3 text-center">No Bid</th>
            <th className="px-4 py-3 text-center">Win %</th>
            <th className="px-4 py-3 text-center">NB %</th>
            <th className="px-4 py-3 text-right">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-4 py-3 text-xs font-black text-slate-800">{row.key}</td>
              <td className="px-4 py-3 text-xs font-bold text-slate-600 text-center">{row.total}</td>
              <td className="px-4 py-3 text-xs font-bold text-emerald-600 text-center">{row.won}</td>
              <td className="px-4 py-3 text-xs font-bold text-slate-500 text-center">{row.lost}</td>
              <td className="px-4 py-3 text-xs font-bold text-red-500 text-center">{row.noBid}</td>
              <td className="px-4 py-3 text-center">
                <span className={clsx("text-xs font-black px-2 py-0.5 rounded-lg", row.winRate >= 50 ? "bg-emerald-50 text-emerald-700" : row.winRate > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-400")}>{row.winRate}%</span>
              </td>
              <td className="px-4 py-3 text-xs font-bold text-red-400 text-center">{row.noBidRate}%</td>
              <td className="px-4 py-3 text-xs font-bold text-slate-600 text-right">{formatPKR(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Conversion Funnel */}
      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Layers size={200} /></div>
        <h2 className="text-xl font-black uppercase tracking-tight mb-8 flex items-center gap-3"><Layers size={22} /> Conversion Funnel</h2>
        <div className="flex items-center justify-center gap-0">
          {[
            { label: 'Total Received', count: funnel.total, color: 'bg-slate-600', width: 'w-48' },
            { label: 'Active Pipeline', count: funnel.active, color: 'bg-blue-600', width: 'w-40' },
            { label: 'Submitted', count: funnel.submitted, color: 'bg-amber-500', width: 'w-32' },
            { label: 'Won', count: funnel.won, color: 'bg-emerald-500', width: 'w-24' },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className={clsx("rounded-2xl flex items-center justify-center h-20 transition-all hover:scale-105", step.color, step.width)}>
                <div className="text-center">
                  <div className="text-2xl font-black">{step.count}</div>
                </div>
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest mt-2 text-slate-400">{step.label}</div>
              {i < 3 && <div className="text-slate-600 my-1"><ChevronDown size={14} /></div>}
              {i < 3 && funnel.total > 0 && (
                <div className="text-[8px] font-black text-slate-500 uppercase">
                  {i === 0 ? `${Math.round(((funnel.total - funnel.noBid) / funnel.total) * 100)}% pursued` :
                   i === 1 ? `${funnel.active > 0 ? Math.round((funnel.submitted / Math.max(1, funnel.active + funnel.submitted + funnel.won)) * 100) : 0}% submitted` :
                   `${funnel.submitted > 0 ? Math.round((funnel.won / Math.max(1, funnel.submitted + funnel.won)) * 100) : 0}% converted`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Performance Tables */}
      <SectionCard title="Performance by Region" icon={<Target size={18} className="text-sky-500" />}>{renderTable(byRegion, 'Region')}</SectionCard>
      <SectionCard title="Performance by Channel" icon={<Users size={18} className="text-violet-500" />}>{renderTable(byChannel, 'Channel')}</SectionCard>
      <SectionCard title="Performance by Product" icon={<BarChart3 size={18} className="text-indigo-500" />}>{renderTable(byProduct, 'Solution')}</SectionCard>
      <SectionCard title="Performance by Complexity" icon={<Zap size={18} className="text-amber-500" />}>{renderTable(byComplexity, 'Complexity')}</SectionCard>
      <SectionCard title="Performance by JBC" subtitle="Sales person accountability" icon={<Trophy size={18} className="text-emerald-500" />}>{renderTable(byJBC, 'JBC Name')}</SectionCard>

      {/* AI Accuracy & Risk Correlation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SectionCard title="AI Intelligence Accuracy" subtitle="How well does AI predict outcomes?" icon={<Sparkles size={18} className="text-amber-500" />}>
          {aiAccuracy.total > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <div className="text-3xl font-black text-emerald-700">{aiAccuracy.goAccuracy}%</div>
                  <div className="text-[9px] font-black text-emerald-500 uppercase mt-1">AI "Go" → Actually Won</div>
                  <div className="text-[10px] text-slate-500 mt-2">{aiAccuracy.goAndWon} of {aiAccuracy.goTotal} Go recommendations</div>
                </div>
                <div className="p-5 bg-red-50 rounded-2xl border border-red-100 text-center">
                  <div className="text-3xl font-black text-red-700">{aiAccuracy.noGoAccuracy}%</div>
                  <div className="text-[9px] font-black text-red-500 uppercase mt-1">AI "No-Go" → Actually No Bid</div>
                  <div className="text-[10px] text-slate-500 mt-2">{aiAccuracy.noGoAndNoBid} of {aiAccuracy.noGoTotal} No-Go signals</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-8">No AI assessment data available yet</p>
          )}
        </SectionCard>

        <SectionCard title="Risk vs Outcome" subtitle="Does risk level correlate with losses?" icon={<ShieldAlert size={18} className="text-red-500" />}>
          <div className="space-y-4">
            {Object.entries(riskOutcome).map(([risk, data]) => {
              const wr = (data.won + data.lost) > 0 ? Math.round((data.won / (data.won + data.lost)) * 100) : 0;
              return (
                <div key={risk} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className={clsx("px-2 py-1 rounded-lg text-[9px] font-black uppercase", risk === 'High' ? "bg-red-100 text-red-700" : risk === 'Medium' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>{risk} Risk</span>
                    <span className="text-[10px] text-slate-400 font-bold">{data.total} bids</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-emerald-600">{data.won}W</span>
                    <span className="text-[10px] font-bold text-slate-400">{data.lost}L</span>
                    <span className="text-[10px] font-bold text-red-400">{data.noBid}NB</span>
                    <span className={clsx("text-sm font-black", wr >= 50 ? "text-emerald-600" : "text-red-500")}>{wr}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default PerformanceMatrix;
