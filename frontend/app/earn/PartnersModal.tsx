import { X, User, Trophy, Medal, DollarSign, Users } from 'lucide-react';
import { useEffect } from 'react';

interface Partner {
    _id: string;
    username: string;
    first_name?: string;
    tariff: string; // GUEST, PLAYER, MASTER, PARTNER
    level: number;
    incomeGreen: number;
    incomeYellow: number;
}

interface PartnersModalProps {
    isOpen: boolean;
    onClose: () => void;
    partners: Partner[];
    isLoading: boolean;
}

export const PartnersModal = ({ isOpen, onClose, partners, isLoading }: PartnersModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl flex flex-col max-h-[80vh] relative animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <User className="text-blue-400" size={20} />
                        Ваши Партнеры
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500 space-y-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <span className="text-xs">Загрузка списка...</span>
                        </div>
                    ) : partners.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 border border-slate-800 border-dashed rounded-xl">
                            <Users size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">У вас пока нет партнеров.</p>
                            <p className="text-xs text-slate-600 mt-1">Приглашайте друзей по вашей ссылке!</p>
                        </div>
                    ) : (
                        partners.map((p) => (
                            <div key={p._id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex items-center justify-between group hover:bg-slate-800 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 shadow-sm relative">
                                        <User size={18} className="text-slate-400" />
                                        {/* Badge for Tariff */}
                                        {p.tariff !== 'GUEST' && (
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold border border-slate-800 ${p.tariff === 'PARTNER' ? 'bg-yellow-500 text-black' :
                                                p.tariff === 'MASTER' ? 'bg-purple-500 text-white' :
                                                    'bg-blue-500 text-white'
                                                }`}>
                                                {p.tariff === 'PARTNER' ? 'P' : p.tariff === 'MASTER' ? 'M' : 'G'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-200">
                                            {p.first_name || p.username || 'Без имени'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                            {p.username ? (
                                                <a
                                                    href={`https://t.me/${p.username}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="opacity-80 hover:opacity-100 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                                                >
                                                    @{p.username}
                                                </a>
                                            ) : (
                                                <span className="opacity-80">no_username</span>
                                            )}
                                            {p.level > 0 && <span className="bg-slate-700 px-1 rounded text-slate-300">Lvl {p.level}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right flex flex-col items-end gap-0.5">
                                    {/* Green Income */}
                                    <div className="flex items-center gap-1 text-green-400 font-bold text-xs bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/10">
                                        <span className="text-[10px] opacity-70">S:</span>
                                        +${p.incomeGreen.toLocaleString()}
                                    </div>
                                    {/* Yellow Income (Only if > 0) */}
                                    {p.incomeYellow > 0 && (
                                        <div className="flex items-center gap-1 text-yellow-400 font-bold text-xs bg-yellow-900/20 px-1.5 py-0.5 rounded border border-yellow-500/10">
                                            <span className="text-[10px] opacity-70">B:</span>
                                            +${p.incomeYellow.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/80 rounded-b-2xl">
                    <p className="text-[10px] text-slate-500 text-center">
                        S = Спонсорский доход (50%)<br />
                        B = Бонусный доход (в структуру)
                    </p>
                </div>
            </div>
        </div>
    );
};
