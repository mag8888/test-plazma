import React from 'react';

interface SelectAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: any[];
    recipientName: string;
    onSelect: (asset: any, index: number) => void;
}

export const SelectAssetModal = ({ isOpen, onClose, assets, recipientName, onSelect }: SelectAssetModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1e293b] w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl p-6 relative flex flex-col gap-4 max-h-[80vh]">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">✕</button>

                <div className="text-center shrink-0">
                    <h2 className="text-xl font-bold text-white uppercase tracking-wide">Передача Актива</h2>
                    <p className="text-xs text-slate-400 mt-1">Выберите актив для передачи игроку <span className="text-white font-bold">{recipientName}</span></p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 min-h-0">
                    {assets.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 italic">У вас нет активов</div>
                    ) : (
                        assets.map((asset, i) => (
                            <button
                                key={i}
                                onClick={() => onSelect(asset, i)}
                                className="flex justify-between items-center text-left p-3 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-blue-500 hover:bg-slate-800 transition-all font-mono group"
                            >
                                <div className="flex flex-col">
                                    <span className="text-white font-bold text-sm">{asset.title}</span>
                                    <span className="text-[10px] text-slate-500">
                                        Поз: ${(asset.cost * (asset.quantity || 1)).toLocaleString()} | Доход: ${asset.cashflow?.toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-blue-400 font-bold text-xs group-hover:block transition-opacity uppercase">
                                    Выбрать
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
