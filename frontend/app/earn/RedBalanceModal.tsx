import { X, Trophy, Users, TrendingUp, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RedBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    partners: any[];
    isLoading?: boolean;
}

export function RedBalanceModal({ isOpen, onClose, partners, isLoading }: RedBalanceModalProps) {
    if (!isOpen) return null;

    // Filter partners who brought red income or just show all with their contribution
    // Sort by income Red desc
    const sortedPartners = [...partners].sort((a, b) => (b.incomeRed || 0) - (a.incomeRed || 0));

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col relative border border-red-500/30 shadow-2xl shadow-red-900/20 overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-red-500/20 bg-gradient-to-r from-red-900/20 to-slate-900 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-red-500/20 p-2 rounded-lg">
                                <TrendingUp className="text-red-500 w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Красный баланс</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors bg-slate-800/50 p-2 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto p-4 space-y-6">

                        {/* Info Section */}
                        <div className="space-y-4 text-sm text-slate-300">
                            <h3 className="text-red-400 font-bold text-lg flex items-center gap-2">
                                🔴 Зачем приглашать друзей?
                            </h3>
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-3">
                                <p className="leading-relaxed">
                                    Игра «Монео» — это не просто про деньги. Это про <span className="text-white font-bold">среду, связи и стратегию роста</span>.
                                </p>
                                <div className="flex items-start gap-2 bg-red-900/10 p-3 rounded-lg border border-red-500/10">
                                    <Users className="text-red-400 w-5 h-5 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-white font-bold">Бонус за друга</div>
                                        <div className="text-xs text-red-300">Каждый приглашённый вами друг — это <span className="font-bold text-white">+10$</span> на красный баланс.</div>
                                    </div>
                                </div>
                                <p>
                                    Красный баланс — это ваш <span className="text-red-400">игровой капитал</span>, который открывает доступ к более высоким уровням игры.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="font-bold text-white flex items-center gap-2">
                                    <Trophy className="text-yellow-500 w-4 h-4" />
                                    Что даёт красный баланс?
                                </div>
                                <ul className="grid grid-cols-1 gap-2 text-xs">
                                    {[
                                        'Участие в турнирах',
                                        'Переход на следующие этапы',
                                        'Доступ к призовым фондам',
                                        'Игра без личных вложений'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs italic text-slate-500 mt-2">
                                    "Красный баланс — это энергия вашей сети. Чем она сильнее, тем дальше вы проходите в игре."
                                </p>
                            </div>

                            <div className="bg-green-900/10 rounded-xl p-4 border border-green-500/10 space-y-2">
                                <h4 className="flex items-center gap-2 text-green-400 font-bold">
                                    🟢 Как заработать реальные деньги?
                                </h4>
                                <p className="text-xs text-slate-300">
                                    В турнирах разыгрывается <span className="text-green-400">зелёный баланс</span> — это реальные деньги для вывода.
                                </p>
                                <div className="space-y-1 mt-2">
                                    <div className="flex justify-between text-xs bg-black/20 p-2 rounded">
                                        <span>Вход в турнир:</span>
                                        <span className="font-bold text-white">20$</span>
                                    </div>
                                    <div className="flex justify-between text-xs bg-black/20 p-2 rounded">
                                        <span>Второй этап:</span>
                                        <span className="font-bold text-white">100$</span>
                                    </div>
                                    <div className="flex justify-between text-xs bg-gradient-to-r from-yellow-900/20 to-transparent p-2 rounded border border-yellow-500/20">
                                        <span className="text-yellow-200">Призовой фонд (Март):</span>
                                        <span className="font-bold text-yellow-400">15 000$</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Friends List Table */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-white flex items-center justify-between">
                                <span>История начислений</span>
                                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                                    Всего: ${partners.reduce((acc, p) => acc + (p.incomeRed || 0), 0)}
                                </span>
                            </h3>

                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
                                </div>
                            ) : sortedPartners.length > 0 ? (
                                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-900/50 text-slate-400 uppercase font-bold">
                                                <tr>
                                                    <th className="p-3">Игрок</th>
                                                    <th className="p-3 text-right">Red Bonus</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700">
                                                {sortedPartners.map((partner) => (
                                                    <tr key={partner._id} className="hover:bg-slate-700/50 transition-colors">
                                                        <td className="p-3">
                                                            <div className="font-medium text-white">
                                                                {partner.username || `User ${partner.telegramId}`}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500">
                                                                {new Date(partner.joinedAt).toLocaleDateString()}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="font-bold text-red-400">
                                                                +${partner.incomeRed || 0}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                                    <Users className="mx-auto text-slate-600 mb-2" />
                                    <div className="text-slate-400 text-sm">Нет приглашенных друзей</div>
                                    <div className="text-slate-600 text-xs mt-1">Пригласите друзей, чтобы получить бонус!</div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
