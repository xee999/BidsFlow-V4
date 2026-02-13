import React, { useRef, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Flag, Ban } from 'lucide-react';
import { clsx } from 'clsx';
import { BidRecord, BidStage, BidStatus } from '../../types';
import { STAGE_ICONS } from '../../constants';

interface BidLifecycleHeaderProps {
    bid: BidRecord;
    viewingStage: BidStage;
    setViewingStage: (stage: BidStage) => void;
    onClose: () => void;
    userRole?: string;
    handleProgressStage: () => void;
    setShowNoBidModal: (show: boolean) => void;
    stagesOrder: BidStage[];
    currentOfficialIndex: number;
    onEditIntake?: () => void;
}

const BidLifecycleHeader: React.FC<BidLifecycleHeaderProps> = ({
    bid,
    viewingStage,
    setViewingStage,
    onClose,
    userRole,
    handleProgressStage,
    setShowNoBidModal,
    stagesOrder,
    currentOfficialIndex,
    onEditIntake
}) => {
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (navRef.current) {
            const activeBtn = navRef.current.querySelector('.active-stage-btn');
            if (activeBtn) {
                activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [viewingStage]);

    return (
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-20 shrink-0">
            <div className="flex items-center gap-6 min-w-0">
                <button
                    onClick={onClose}
                    className="w-10 h-10 bg-[#D32F2F] text-white flex items-center justify-center rounded-full transition-all hover:bg-red-700 shadow-md active:scale-90 shrink-0"
                    title="Return to Repository"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="h-8 w-px bg-slate-100 shrink-0"></div>
                <nav ref={navRef} className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-2xl min-w-0">
                    {stagesOrder.map((stage, idx) => {
                        const isViewing = viewingStage === stage;
                        const isDone = currentOfficialIndex > idx;
                        return (
                            <button
                                key={stage}
                                onClick={() => setViewingStage(stage)}
                                className={clsx(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 group relative",
                                    isViewing ? "bg-[#1E3A5F] text-white shadow-lg active-stage-btn" : isDone ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {isDone ? <CheckCircle2 size={12} /> : STAGE_ICONS[stage]} {stage}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                {bid.status === BidStatus.NO_BID ? (
                    <div className="flex items-center gap-3 px-6 py-2.5 bg-slate-100 border-2 border-slate-300 rounded-xl shadow-sm">
                        <Ban size={16} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            No-Bid Opportunity
                        </span>
                    </div>
                ) : (
                    <>
                        {viewingStage === bid.currentStage && viewingStage !== BidStage.FINAL_REVIEW && userRole !== 'VIEWER' && (
                            <button
                                onClick={handleProgressStage}
                                className="px-6 py-2.5 text-[10px] font-black text-white bg-emerald-600 rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
                            >
                                Finish Phase <CheckCircle2 size={14} />
                            </button>
                        )}

                        {userRole !== 'VIEWER' && (
                            <button
                                onClick={() => setShowNoBidModal(true)}
                                className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-white bg-red-600 rounded-xl uppercase tracking-widest hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-100"
                            >
                                No-Bid <Flag size={14} />
                            </button>
                        )}

                        {userRole !== 'VIEWER' && onEditIntake && (
                            <button
                                onClick={onEditIntake}
                                className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-[#1E3A5F] bg-white border-2 border-[#1E3A5F] rounded-xl uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                            >
                                Edit Bid Info <CheckCircle2 size={14} className="rotate-180" />
                            </button>
                        )}
                    </>
                )}
            </div>
        </header>
    );
};

export default BidLifecycleHeader;
