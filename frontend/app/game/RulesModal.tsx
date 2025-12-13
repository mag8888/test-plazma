import { useState } from 'react';
import { SMALL_DEALS, BIG_DEALS, MARKET_CARDS, EXPENSE_CARDS, Card } from './cards_data';

interface RulesModalProps {
    onClose: () => void;
    counts?: {
        small: { remaining: number; total: number };
        big: { remaining: number; total: number };
        market: { remaining: number; total: number };
        expense: { remaining: number; total: number };
    };
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose, counts }) => {
    const [activeTab, setActiveTab] = useState<'RULES' | 'SMALL' | 'BIG' | 'MARKET' | 'EXPENSE'>('RULES');

    // ... (renderCard and getTabContent remain same)
    const renderCard = (card: Card) => (
        <div key={card.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col gap-2 hover:bg-slate-800 transition-colors">
            <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider type-badge">
                    {card.type === 'DEAL_SMALL' ? 'Малая сделка' :
                        card.type === 'DEAL_BIG' ? 'Крупная сделка' :
                            card.type === 'MARKET' ? 'Рынок' : 'Расход'}
                </span>
                {card.symbol && <span className="text-xs font-mono text-blue-400 bg-blue-900/20 px-1.5 rounded">{card.symbol}</span>}
            </div>
            <h4 className="font-bold text-white text-sm leading-tight">{card.title}</h4>
            <p className="text-xs text-slate-400 leading-snug">{card.description}</p>
            <div className="mt-auto pt-2 border-t border-slate-700/50 flex justify-between items-center text-xs">
                {card.cost ? (
                    <span className="text-red-400 font-mono font-bold">-${card.cost.toLocaleString()}</span>
                ) : card.offerPrice ? (
                    <span className="text-green-400 font-mono font-bold text-[10px] leading-tight">Предлагают: ${card.offerPrice.toLocaleString()}</span>
                ) : <span></span>}

                {card.cashflow ? (
                    <span className="text-green-400 font-mono font-bold">+${card.cashflow}/мес</span>
                ) : null}
            </div>
        </div>
    );

    const getTabContent = () => {
        switch (activeTab) {
            case 'SMALL':
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{SMALL_DEALS.map(renderCard)}</div>;
            case 'BIG':
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{BIG_DEALS.map(renderCard)}</div>;
            case 'MARKET':
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{MARKET_CARDS.map(renderCard)}</div>;
            case 'EXPENSE':
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{EXPENSE_CARDS.map(renderCard)}</div>;
            default:
                return (
                    <div className="space-y-6 text-slate-300 leading-relaxed">
                        <section>
                            <h3 className="text-lg font-bold text-green-400 mb-2">🏆 Цель игры</h3>
                            <p>
                                Выйти на пассивный доход и научиться мечтать и естественно купить свою мечту чтоб в следующий раз поставить новую мечту и купить и ее.
                            </p>
                            <p className="mt-2 text-sm text-slate-400">
                                Ваша задача — вырваться из «Крысиных бегов» на «Скоростную дорожку».
                                Для этого ваш <span className="text-blue-400 font-bold">Пассивный Доход</span> должен превысить ваши <span className="text-red-400 font-bold">Расходы</span>.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-yellow-400 mb-2">💰 Финансы</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-white">Payday:</strong> Каждый раз, проходя или останавливаясь на клетке Payday, вы получаете свой Денежный Поток (Cashflow). (это как месяц вашей жизни)</li>
                                <li><strong className="text-white">Кредит:</strong> Вы можете брать кредит в банке (с шагом $1,000) под 10% в месяц. Кнопка «Банк» доступна в любой момент.</li>
                                <li><strong className="text-white">Банкротство:</strong> Если вы не можете оплатить долги и кредит недоступен — вы банкрот. Все ваши активы сгорают, и вы начинаете заново, но уже без возможности брать кредит.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-purple-400 mb-2">🎲 Клетки</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong className="text-green-400">Сделка (Deal):</strong> Возможность купить актив (Бизнес, Недвижимость, Акции). Малые сделки дешевле, Крупные — дороже, но доходнее.</li>
                                <li><strong className="text-blue-400">Рынок (Market):</strong> Возможность продать активы.</li>
                                <li><strong className="text-red-400">Всячина (Doodad):</strong> Обязательные траты.</li>
                                <li><strong className="text-pink-400">Ребенок:</strong> Увеличивает ваши расходы на содержание семьи.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-cyan-400 mb-2">🚀 Скоростная дорожка</h3>
                            <p>
                                Попав сюда, ваша цель — увеличить Денежный Поток на +$50,000 или купить свою <strong>Мечту</strong>.
                                И в этом случае вы занимаете 1е место (в рейтинге участвуют все игроки, поэтому не сдавайтесь после победы первого игрока).
                            </p>
                            <p className="mt-2 text-sm text-yellow-400">
                                <strong>Рейтинг:</strong> В рейтинге участвуют все игроки. Если игроков было 8, то первое место получает 8 баллов, восьмое место — 1.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-white mb-2">💰 Карточки и Бонусы</h3>
                            <p className="text-slate-300 mt-2">
                                <strong>Благотворительность:</strong> Пожертвуйте 10% от общего дохода, чтобы бросать 1 или 2 кубика следующие 3 хода.
                            </p>
                        </section>

                        <div className="h-8"></div>
                    </div>
                );
        }
    };
    // ...

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-300">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-[#0f172a] rounded-t-2xl flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
                        {activeTab === 'RULES' ? 'Правила Игры' :
                            activeTab === 'SMALL' ? `Малые Сделки` :
                                activeTab === 'BIG' ? `Крупные Сделки` :
                                    activeTab === 'MARKET' ? `Рынок` : `Расходы`}
                        {/* Show counts in header if not rules */}
                        {activeTab !== 'RULES' && counts && (
                            <span className="ml-3 text-red-500 text-lg font-mono">
                                {activeTab === 'SMALL' && `${counts.small.remaining}/${counts.small.total}`}
                                {activeTab === 'BIG' && `${counts.big.remaining}/${counts.big.total}`}
                                {activeTab === 'MARKET' && `${counts.market.remaining}/${counts.market.total}`}
                                {activeTab === 'EXPENSE' && `${counts.expense.remaining}/${counts.expense.total}`}
                            </span>
                        )}
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
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#151b2b]">
                    {getTabContent()}
                </div>

                {/* Footer Navigation */}
                <div className="p-4 border-t border-slate-700 bg-[#0f172a] rounded-b-2xl flex flex-wrap gap-2 justify-between items-center flex-shrink-0">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setActiveTab('SMALL')}
                            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center leading-tight ${activeTab === 'SMALL' ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span>Малые</span>
                            {counts && <span className="text-[9px] opacity-70">{counts.small.remaining}/{counts.small.total}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('BIG')}
                            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center leading-tight ${activeTab === 'BIG' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span>Крупные</span>
                            {counts && <span className="text-[9px] opacity-70">{counts.big.remaining}/{counts.big.total}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('MARKET')}
                            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center leading-tight ${activeTab === 'MARKET' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span>Рынок</span>
                            {counts && <span className="text-[9px] opacity-70">{counts.market.remaining}/{counts.market.total}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('EXPENSE')}
                            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center leading-tight ${activeTab === 'EXPENSE' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span>Всячина</span>
                            {counts && <span className="text-[9px] opacity-70">{counts.expense.remaining}/{counts.expense.total}</span>}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {activeTab !== 'RULES' && (
                            <button
                                onClick={() => setActiveTab('RULES')}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all text-sm"
                            >
                                📜 Правила
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/10"
                        >
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
