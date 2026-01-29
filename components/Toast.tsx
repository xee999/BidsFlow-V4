import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export interface ToastMessage {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    message: string;
}

interface ToastProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(toast.id), 300);
        }, 5000);

        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
    };

    const iconMap = {
        info: <Info size={18} className="text-blue-500" />,
        warning: <AlertTriangle size={18} className="text-amber-500" />,
        success: <CheckCircle size={18} className="text-emerald-500" />,
        error: <XCircle size={18} className="text-red-500" />
    };

    const bgMap = {
        info: 'bg-blue-50 border-blue-200',
        warning: 'bg-amber-50 border-amber-200',
        success: 'bg-emerald-50 border-emerald-200',
        error: 'bg-red-50 border-red-200'
    };

    return (
        <div
            className={clsx(
                "flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300",
                bgMap[toast.type],
                isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0 animate-in slide-in-from-right-4"
            )}
        >
            <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
            <p className="text-sm font-semibold text-slate-700 flex-1">{toast.message}</p>
            <button
                onClick={handleDismiss}
                className="shrink-0 p-1 hover:bg-white/50 rounded-full transition-colors"
            >
                <X size={14} className="text-slate-400" />
            </button>
        </div>
    );
};

export default Toast;
