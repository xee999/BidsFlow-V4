import React, { useState, useEffect } from 'react';
import { Flag, Plus, X, MessageSquare, CheckCircle2, ChevronDown } from 'lucide-react';
import { NoBidReason } from '../../types.ts';
import { clsx } from 'clsx';

interface NoBidModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payload: { reasons: string[], comments: string }) => void;
    onAddCustomReason: (label: string) => Promise<NoBidReason>;
    onDeleteReason?: (id: string) => Promise<void>;
    globalReasons: NoBidReason[];
    initialReasons?: string[];
    initialComments?: string;
}

const NoBidModal: React.FC<NoBidModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    onAddCustomReason,
    globalReasons,
    initialReasons = [],
    initialComments = ""
}) => {
    const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
    const [comments, setComments] = useState("");
    const [teamName, setTeamName] = useState("");
    const [showAddInput, setShowAddInput] = useState(false);
    const [newReasonLabel, setNewReasonLabel] = useState("");
    const [isSavingCustom, setIsSavingCustom] = useState(false);

    // Initialize only when opening to prevent background updates from resetting user's unsaved selections
    useEffect(() => {
        if (isOpen) {
            setComments(initialComments);
            
            const selectedLabels: string[] = [];
            let foundTeamName = "";

            (initialReasons || []).forEach(reason => {
                if (reason.startsWith('No Response from ') && reason.endsWith(' Team')) {
                    selectedLabels.push('No Response from Team');
                    foundTeamName = reason.replace('No Response from ', '').replace(' Team', '');
                } else {
                    selectedLabels.push(reason);
                }
            });

            setSelectedReasons(selectedLabels);
            setTeamName(foundTeamName);
            setShowAddInput(false);
            setNewReasonLabel("");
        }
    }, [isOpen]); // Only run when isOpen changes

    if (!isOpen) return null;

    const toggleReason = (label: string) => {
        setSelectedReasons(prev => 
            prev.includes(label) ? prev.filter(r => r !== label) : [...prev, label]
        );
    };

    const handleConfirm = () => {
        const finalReasons = selectedReasons.map(r => {
            if (r === 'No Response from Team') {
                return `No Response from ${teamName || '_______'} Team`;
            }
            return r;
        });
        
        onConfirm({ reasons: finalReasons, comments });
    };

    const handleAddCustom = async () => {
        if (!newReasonLabel.trim()) return;
        setIsSavingCustom(true);
        try {
            const added = await onAddCustomReason(newReasonLabel.trim());
            setSelectedReasons(prev => [...prev, added.label]);
            setNewReasonLabel("");
            setShowAddInput(false);
        } catch (err) {
            console.error("Failed to add reason", err);
        } finally {
            setIsSavingCustom(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
            style={{ zIndex: 99999999 }}
        >
            <div className="bg-white rounded-[1.5rem] w-full max-w-2xl shadow-2xl animate-in zoom-in duration-300 flex flex-col h-[70vh] max-h-[70vh] relative pt-6">
                
                {/* Close Button - Top Right */}
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group"
                >
                    <X size={18} className="group-hover:text-slate-600" />
                </button>

                {/* 1. Styled Header Section */}
                <div className="px-10 py-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-[3px] bg-[#D32F2F] rounded-full"></div>
                        <h3 className="text-[14px] font-black text-[#D32F2F] uppercase tracking-[0.2em]">No Bid Reasons</h3>
                    </div>
                </div>

                {/* 2. Scrollable Reasons Rectangle Area */}
                <div className="flex-1 overflow-y-auto px-10 py-2 no-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {globalReasons.map(reason => {
                            const isSelected = selectedReasons.includes(reason.label);
                            return (
                                <div 
                                    key={reason.id} 
                                    onClick={() => toggleReason(reason.label)}
                                    className={clsx(
                                        "px-5 py-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group h-full min-h-[52px]",
                                        isSelected 
                                            ? "border-slate-200 bg-white" 
                                            : "border-slate-100 bg-slate-50/30 hover:border-slate-200"
                                    )}
                                >
                                    <span className={clsx("text-[11px] font-bold tracking-tight", isSelected ? "text-slate-900" : "text-slate-500")}>
                                        {reason.label}
                                    </span>
                                    <div className={clsx(
                                        "w-5 h-5 rounded border-2 transition-all flex items-center justify-center shrink-0",
                                        isSelected ? "border-slate-200 bg-white shadow-sm" : "border-slate-200 bg-white"
                                    )}>
                                        {isSelected && (
                                            <div className="w-3 h-3 bg-[#D32F2F] rounded-[2px]" />
                                        )}
                                    </div>

                                    {reason.label === 'No Response from Team' && isSelected && (
                                        <div className="absolute inset-x-0 bottom-0 px-2 pb-1" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="text" 
                                                value={teamName}
                                                onChange={e => setTeamName(e.target.value)}
                                                placeholder="e.g. Legal"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-0.5 text-[10px] font-bold outline-none ring-0 placeholder:text-slate-300"
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Add Custom Button Card */}
                        {!showAddInput ? (
                            <div 
                                onClick={() => setShowAddInput(true)}
                                className="px-5 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 flex items-center justify-center gap-2 hover:border-[#D32F2F]/30 hover:text-[#D32F2F]/40 transition-all cursor-pointer h-full min-h-[52px]"
                            >
                                <Plus size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Add Custom</span>
                            </div>
                        ) : (
                            <div className="px-5 py-2 rounded-xl border-2 border-[#D32F2F]/20 bg-white flex items-center gap-2 min-h-[52px] shadow-sm">
                                <input 
                                    type="text" 
                                    value={newReasonLabel}
                                    onChange={e => setNewReasonLabel(e.target.value)}
                                    placeholder="Type reason..."
                                    className="flex-1 bg-transparent border-none p-0 text-[11px] font-bold outline-none ring-0 placeholder:text-slate-300"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                                />
                                <button onClick={handleAddCustom} className="text-[10px] font-black text-[#D32F2F] uppercase px-2 py-1">Save</button>
                                <button onClick={() => setShowAddInput(false)} className="text-slate-300"><X size={14} /></button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Persistent Strategic Context Box */}
                <div className="px-10 pt-4 pb-2 shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-[1.5px] bg-slate-200 rounded-full"></div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <MessageSquare size={13} className="text-[#D32F2F]/80" />
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Strategic Context</h4>
                        </div>
                    </div>
                    <textarea 
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Explain the technical or strategic reason in detail..."
                        className="w-full bg-slate-50/50 border-2 border-slate-200 rounded-2xl px-6 py-4 text-xs font-medium outline-none focus:ring-0 focus:border-slate-300 transition-all h-[100px] resize-none placeholder:text-slate-300"
                    />
                </div>

                {/* 4. Action Footer */}
                <div className="px-10 py-6 shrink-0 flex items-center justify-end">
                    <button 
                        onClick={handleConfirm} 
                        disabled={selectedReasons.length === 0}
                        className="px-12 py-4 rounded-xl bg-[#D32F2F] text-white font-black uppercase text-[11px] tracking-widest transition-all hover:bg-slate-900 shadow-xl disabled:opacity-20 active:scale-95"
                    >
                        Confirm No-Bid
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NoBidModal;
