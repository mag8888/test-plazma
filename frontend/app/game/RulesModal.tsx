import { useState, useRef } from 'react';
import { SMALL_DEALS, BIG_DEALS, MARKET_CARDS, EXPENSE_CARDS, Card } from './cards_data';

interface RulesModalProps {
    onClose: () => void;
    counts?: {
        small: { remaining: number; total: number };
        big: { remaining: number; total: number };
        market: { remaining: number; total: number };
        expense: { remaining: number; total: number };
    };
    isTutorial?: boolean;
    onConfirm?: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose, counts, isTutorial, onConfirm }) => {
    const [activeTab, setActiveTab] = useState<'RULES' | 'SMALL' | 'BIG' | 'MARKET' | 'EXPENSE'>('RULES');
    const [hasRead, setHasRead] = useState(false);

    // ... (renderCard and getTabContent remain same)
    const renderCard = (card: Card) => (
        <div key={card.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex flex-col gap-2 hover:bg-slate-800 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex gap-2 items-center">
                    {card.displayId && <span className="text-[10px] font-mono text-yellow-500/80 font-bold bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">No.{card.displayId}</span>}
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider type-badge">
                        {card.type === 'DEAL_SMALL' ? 'Малая сделка' :
                            card.type === 'DEAL_BIG' ? 'Крупная сделка' :
                                card.type === 'MARKET' ? 'Рынок' : 'Расход'}
                    </span>
                </div>
                {card.symbol && <span className="text-xs font-mono text-blue-400 bg-blue-900/20 px-1.5 rounded">{card.symbol}</span>}
            </div>
            <h4 className="font-bold text-white text-sm leading-tight">{card.title}</h4>
            <p className="text-xs text-slate-400 leading-snug">{card.description}</p>
            <div className="mt-auto pt-2 border-t border-slate-700/50 flex justify-between items-center text-xs">
                {(card.cost || card.downPayment) ? (
                    <span className="text-red-400 font-mono font-bold">-${(card.downPayment ?? card.cost ?? 0).toLocaleString()}</span>
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
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{SMALL_DEALS.map((card, i) => renderCard({ ...card, displayId: i + 1 }))}</div>;
            case 'BIG':
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{BIG_DEALS.map((card, i) => renderCard({ ...card, displayId: i + 1 }))}</div>;
            case 'MARKET':
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{MARKET_CARDS.map((card, i) => renderCard({ ...card, displayId: i + 1 }))}</div>;
            case 'EXPENSE':
                return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{EXPENSE_CARDS.map((card, i) => renderCard({ ...card, displayId: i + 1 }))}</div>;
            default:
                return (
                    <div className="space-y-6 text-slate-300 leading-relaxed">
                        <section className="mb-8">
                            <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6">💡 Философия MONEO</h3>
                            <div className="space-y-4 text-sm md:text-base text-slate-300 leading-relaxed">
                                <p>
                                    <strong className="text-white">MONEO</strong> — это симулятор жизни и финансов. За одну игру вы сможете осознать то, что в обычной жизни требует долгих лет опыта.
                                </p>
                                <p>
                                    Как и в реальности, здесь <strong className="text-white">нет жестких скриптов</strong>. Правила существуют лишь как механика, но каждый сам решает, как ими пользоваться и какую стратегию выбирать.
                                </p>
                                <p>
                                    <strong className="text-white">Каждая игра уникальна</strong>, ведь её творят люди. Динамика поля, уровень агрессии или дружеской поддержки — всё зависит от <strong className="text-yellow-400">ВАС</strong>. Вы сами создаете игру, которая нужна вам именно сейчас, наилучшим образом.
                                </p>
                                <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 p-5 rounded-2xl border-l-4 border-emerald-500 shadow-lg my-6">
                                    <p className="italic text-slate-200">
                                        "Игроки могут мешать или помогать — прямо как в жизни. Но в MONEO у вас есть преимущество: вы всегда можете спросить <span className="text-emerald-400 font-bold">«Почему ты так поступил?»</span>. И в отличие от обычной жизни, вам честно объяснят причины, подсвечивая важные уроки."
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-green-400 mb-2">🎯 Техническая Цель</h3>
                            <p className="text-slate-300">
                                Ваша задача — вырваться из «Крысиных бегов» на «Скоростную дорожку».
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-400">
                                <li>Накопить Пассивный Доход <strong className="text-green-400">≥ $10,000</strong></li>
                                <li>Накопить Наличные <strong className="text-green-400">≥ $200,000</strong></li>
                            </ul>
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
                                <li><strong className="text-red-400">Расходы (Doodad):</strong> Обязательные траты.</li>
                                <li><strong className="text-pink-400">Ребенок:</strong> Увеличивает ваши расходы на содержание семьи.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-cyan-400 mb-2">🚀 Скоростная дорожка (Fast Track)</h3>
                            <p className="mb-2">
                                <strong className="text-white">Как выйти:</strong> Чтобы выйти на Скоростную дорожку:
                                <br />1. Ваш <span className="text-blue-400 font-bold">Пассивный Доход</span> должен быть ≥ $10,000.
                                <br />2. Кредит должен быть полностью погашен (0).
                                <br />3. <span className="text-green-400 font-bold">Наличные: $200,000+</span>
                                <br />После выполнения условий появится кнопка выхода.
                            </p>
                            <p className="mb-2">
                                <strong className="text-white">Условия Победы:</strong>
                                <br />1. Увеличить Пассивный Доход на +$50,000 на Скоростной дорожке.
                                <br />2. Купить 2 бизнеса и свою Мечту.
                            </p>
                            <p className="text-sm text-yellow-400">
                                <strong>Рейтинг:</strong> Игра продолжается даже после победы первого игрока!
                                Организатор завершает игру вручную, после чего формируется итоговая таблица лидеров (1-е место, 2-е место и т.д.).
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

    const startTime = useRef(Date.now());
    const [showFastReadWarning, setShowFastReadWarning] = useState(false);

    const handleConfirmClick = () => {
        const timeSpent = Date.now() - startTime.current;
        if (timeSpent < 10000) { // 10 seconds check
            setShowFastReadWarning(true);
        } else {
            if (onConfirm) onConfirm();
        }
    };

    // ... (rest of renderCard and getTabContent)

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1e293b] rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in duration-300">

                {/* Fast Read Warning Overlay */}
                {showFastReadWarning && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md rounded-2xl p-8 animate-in fade-in duration-200">
                        <div className="text-center max-w-md space-y-6">
                            <div className="text-5xl animate-bounce">🧐</div>
                            <h3 className="text-2xl font-bold text-white">А вы точно прочитали?</h3>
                            <p className="text-slate-300 text-lg leading-relaxed">
                                У нас будут опытные игроки, и эти знания вам <strong className="text-emerald-400">очень помогут</strong> в игре.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                <button
                                    onClick={() => setShowFastReadWarning(false)}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
                                >
                                    📖 Вернуться и дочитать
                                </button>
                                <button
                                    onClick={() => onConfirm && onConfirm()}
                                    className="px-6 py-3 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 rounded-xl font-bold transition-all text-sm"
                                >
                                    Да, я профи
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                {activeTab === 'SMALL' && `${counts.small.total}/${counts.small.remaining}`}
                                {activeTab === 'BIG' && `${counts.big.total}/${counts.big.remaining}`}
                                {activeTab === 'MARKET' && `${counts.market.total}/${counts.market.remaining}`}
                                {activeTab === 'EXPENSE' && `${counts.expense.total}/${counts.expense.remaining}`}
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
                <div
                    className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#151b2b]"
                    onScroll={(e) => {
                        const target = e.currentTarget;
                        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
                            if (!hasRead) setHasRead(true);
                        }
                    }}
                >
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
                            {counts && <span className="text-[9px] opacity-70">{counts.small.total}/{counts.small.remaining}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('BIG')}
                            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center leading-tight ${activeTab === 'BIG' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span>Крупные</span>
                            {counts && <span className="text-[9px] opacity-70">{counts.big.total}/{counts.big.remaining}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('MARKET')}
                            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center leading-tight ${activeTab === 'MARKET' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span>Рынок</span>
                            {counts && <span className="text-[9px] opacity-70">{counts.market.total}/{counts.market.remaining}</span>}
                        </button>
                        <button
                            onClick={() => setActiveTab('EXPENSE')}
                            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center leading-tight ${activeTab === 'EXPENSE' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            <span>Расходы</span>
                            {counts && <span className="text-[9px] opacity-70">{counts.expense.total}/{counts.expense.remaining}</span>}
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

                        {isTutorial ? (
                            <button
                                onClick={handleConfirmClick}
                                disabled={!hasRead}
                                className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${hasRead
                                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg animate-pulse'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {hasRead ? '✅ Я прочитал!' : '📜 Пролистайте вниз'}
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/10"
                            >
                                Закрыть
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
