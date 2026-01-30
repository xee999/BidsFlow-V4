import React, { useState } from 'react';
import { Award, ThumbsDown } from 'lucide-react';
import { clsx } from 'clsx';

interface OutcomeModalProps {
    showOutcomeModal: 'Won' | 'Lost' | null;
    onClose: () => void;
    onSave: (type: 'Won' | 'Lost') => void;
    learnings: string;
    setLearnings: (val: string) => void;
}

const OutcomeModal: React.FC<OutcomeModalProps> = ({
    showOutcomeModal,
    onClose,
    onSave,
    learnings,
    setLearnings
}) => {
    if (!showOutcomeModal) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
            <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <div className={clsx("p-4 rounded-3xl", showOutcomeModal === 'Won' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                        {showOutcomeModal === 'Won' ? <Award size={32} /> : <ThumbsDown size={32} />}
                    </div>
                    <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Bid Outcome: {showOutcomeModal}</h3><p className="text-sm font-medium text-slate-500">Record learnings.</p></div>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Learnings</label>
                        <textarea value={learnings} onChange={e => setLearnings(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm font-medium outline-none transition-all" placeholder="Notes..." rows={4} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-10">
                    <button onClick={onClose} className="py-4 rounded-2xl border border-slate-200 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                    <button onClick={() => onSave(showOutcomeModal)} className={clsx("py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl transition-all", showOutcomeModal === 'Won' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-red-600 hover:bg-red-700 shadow-red-100")}>Save Outcome</button>
                </div>
            </div>
        </div>
    );
};

export default OutcomeModal;
