import React from 'react';

interface RulesModalProps {
    onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#0f172a] rounded-t-2xl">
                    <h2 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
                        Правила Игры
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-slate-300 leading-relaxed">

                    <section>
                        <h3 className="text-lg font-bold text-green-400 mb-2">🏆 Цель игры</h3>
                        <p>
                            Ваша задача — вырваться из «Крысиных бегов» на «Скоростную дорожку».
                            Для этого ваш <span className="text-blue-400 font-bold">Пассивный Доход</span> должен превысить ваши <span className="text-red-400 font-bold">Расходы</span>.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-yellow-400 mb-2">💰 Финансы</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-white">Payday:</strong> Каждый раз, проходя или останавливаясь на клетке Payday, вы получаете свой Денежный Поток (Cashflow).</li>
                            <li><strong className="text-white">Кредит:</strong> Вы можете брать кредит в банке (с шагом $1,000) под 10% в месяц. Кнопка «Банк» доступна в любой момент.</li>
                            <li><strong className="text-white">Банкротство:</strong> Если вы не можете оплатить долги и кредит недоступен — вы банкрот. Все ваши активы сгорают, и вы начинаете заново.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-purple-400 mb-2">🎲 Клетки</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong className="text-green-400">Сделка (Deal):</strong> Возможность купить актив (Бизнес, Недвижимость, Акции). Малые сделки дешевле, Крупные — дороже, но доходнее.</li>
                            <li><strong className="text-blue-400">Рынок (Market):</strong> Возможность продать активы.</li>
                            <li><strong className="text-red-400">Всячина (Doodad):</strong> Обязательные ненужные траты.</li>
                            <li><strong className="text-pink-400">Ребенок:</strong> Увеличивает ваши расходы на содержание семьи.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-cyan-400 mb-2">🚀 Скоростная дорожка</h3>
                        <p>
                            Попав сюда, ваша цель — увеличить Денежный Поток на +$50,000 или купить свою <strong>Мечту</strong>.
                        </p>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-[#0f172a] rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
                    >
                        Понятно
                    </button>
                </div>
            </div>
        </div>
    );
};
