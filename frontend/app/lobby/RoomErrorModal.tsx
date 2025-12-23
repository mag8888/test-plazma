import React from 'react';

interface RoomErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    message: string;
    confirmText?: string;
    isSubmitting?: boolean;
}

export const RoomErrorModal = ({
    isOpen,
    onClose,
    onConfirm,
    message,
    confirmText = "Покинуть и создать",
    isSubmitting = false
}: RoomErrorModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#1e293b] w-full max-w-sm md:max-w-md p-6 rounded-3xl border border-red-500/30 shadow-2xl relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>

                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">⚠️</span> Внимание
                </h2>

                <p className="text-slate-300 mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-sm shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Обработка...</span>
                        ) : (
                            <>
                                <span>🚪</span> {confirmText}
                            </>
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold uppercase tracking-widest text-sm transition-all"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
};
