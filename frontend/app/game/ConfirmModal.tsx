import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'warning' | 'danger' | 'info';
}

export const ConfirmModal = ({
    isOpen,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    onConfirm,
    onCancel,
    variant = 'warning'
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    const variantStyles = {
        warning: {
            bg: 'from-yellow-600 to-amber-600',
            hoverBg: 'from-yellow-500 to-amber-500',
            icon: '⚠️'
        },
        danger: {
            bg: 'from-red-600 to-rose-600',
            hoverBg: 'from-red-500 to-rose-500',
            icon: '🚨'
        },
        info: {
            bg: 'from-blue-600 to-indigo-600',
            hoverBg: 'from-blue-500 to-indigo-500',
            icon: 'ℹ️'
        }
    };

    const style = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1e293b] w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{style.icon}</span>
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold uppercase tracking-wider text-sm transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 rounded-xl bg-gradient-to-r ${style.bg} hover:${style.hoverBg} text-white font-bold uppercase tracking-wider text-sm shadow-lg transition-all active:scale-95`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
