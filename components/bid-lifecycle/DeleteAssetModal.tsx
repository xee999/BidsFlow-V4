import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const DeleteAssetModal: React.FC<DeleteAssetModalProps> = ({
    isOpen,
    onClose,
    onConfirm
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-sm p-10 shadow-2xl text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
                <h3 className="text-xl font-black text-slate-900 uppercase mb-2">Delete File?</h3>
                <div className="grid grid-cols-2 gap-4 mt-10">
                    <button onClick={onClose} className="py-4 bg-slate-100 text-slate-500 font-black uppercase text-[10px] rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
                    <button onClick={onConfirm} className="py-4 bg-red-600 text-white font-black uppercase text-[10px] rounded-xl shadow-lg hover:bg-red-700 transition-all">Delete</button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAssetModal;
