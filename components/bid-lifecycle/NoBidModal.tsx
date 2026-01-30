import React from 'react';
import { Flag, ChevronDown } from 'lucide-react';

interface NoBidModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    category: string;
    setCategory: (val: string) => void;
}

const COMMON_NO_BID_REASONS = [
    'Technical Non-Compliance',
    'Budget/Pricing Mismatch',
    'High Delivery Risk',
    'Resource Unavailability',
    'Conflict of Interest',
    'Unfavorable T&Cs',
    'Strategic Realignment',
    'Missing Credentials'
];

const NoBidModal: React.FC<NoBidModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    category,
    setCategory
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
            <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in duration-300">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-red-50 text-red-500 rounded-3xl"><Flag size={32} /></div>
                    <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No-Bid Record</h3><p className="text-sm font-medium text-slate-500">Provide reason for strategic rejection.</p></div>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Category</label>
                        <div className="relative group">
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none appearance-none transition-all">
                                <option value="" disabled>Select Reason...</option>
                                {COMMON_NO_BID_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-10">
                    <button onClick={onClose} className="py-4 rounded-2xl border border-slate-200 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                    <button onClick={onConfirm} className="py-4 rounded-2xl bg-red-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-700 transition-all">Confirm No-Bid</button>
                </div>
            </div>
        </div>
    );
};

export default NoBidModal;
