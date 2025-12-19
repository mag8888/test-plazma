import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

export function ProgramDescription() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full mt-8 pb-10">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4 rounded-xl flex items-center justify-between transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <Info size={20} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white text-sm">Подробнее о программе</div>
                        <div className="text-xs text-slate-400">Как работает Тринар и распределение</div>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
            </button>

            {isOpen && (
                <div className="mt-4 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 space-y-8 animate-in slide-in-from-top-2 duration-300 text-slate-300 text-sm leading-relaxed">

                    {/* Key Idea */}
                    <section className="space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                            <span>🧠</span> Ключевая идея модели
                        </h3>
                        <ul className="space-y-2 list-disc pl-5 marker:text-blue-500">
                            <li><strong className="text-white">100% денег</strong> работают внутри системы</li>
                            <li>Подписка = актив</li>
                            <li>Аватар = автономный доходный модуль</li>
                        </ul>
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="mb-2 font-bold text-slate-400 text-xs uppercase tracking-widest">Чем выше тариф:</div>
                            <ul className="list-disc pl-5 space-y-1 mb-3 marker:text-green-500">
                                <li>тем выше доход</li>
                                <li>тем больше доступный вывод</li>
                            </ul>
                            <div className="font-bold text-white text-center text-xs bg-slate-700/50 py-1 rounded">
                                Всё автоматизировано • прозрачно • масштабируемо
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-slate-700/50"></div>

                    {/* Marketing */}
                    <section className="space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                            <span>🔺</span> Маркетинг «Тринар»
                        </h3>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">1️⃣ Распределение оплат (ключевой принцип)</h4>
                            <p className="text-slate-400 text-xs">С каждой оплаты приглашённого пользователя 100% суммы распределяется внутри системы — деньги не выводятся из оборота.</p>

                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/20">
                                    <div className="text-green-400 font-bold mb-1">50%</div>
                                    <div className="text-xs text-white font-bold mb-1">На Ваш Зеленый баланс</div>
                                    <div className="text-[10px] text-slate-400">Доступно к выводу согласно тарифу</div>
                                </div>
                                <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/20">
                                    <div className="text-yellow-400 font-bold mb-1">50%</div>
                                    <div className="text-xs text-white font-bold mb-1">В Желтый бонус</div>
                                    <div className="text-[10px] text-slate-400">Накапливается в структуре. При закрытии 5-го уровня → конвертируется в деньги владельца.</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">2️⃣ Подписка = Аватар</h4>
                            <p>При покупке любой платной подписки пользователь автоматически получает аватара.</p>
                            <ul className="list-disc pl-5 marker:text-purple-500 space-y-1">
                                <li>Сразу размещается в своей тринарной сетке</li>
                                <li>Начинает работать на доход владельца</li>
                                <li>Система автоматически ставит аватара под первого незаполненного в структуре</li>
                            </ul>
                        </div>
                    </section>

                    <div className="h-px bg-slate-700/50"></div>

                    {/* Tariffs */}
                    <section className="space-y-6">
                        <h3 className="text-white font-bold text-lg">3️⃣ Тарифы участия</h3>

                        {/* Guest */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-slate-600"></div>
                            <h4 className="font-bold text-white text-base mb-2">🟢 Тариф «Гость» — 0$</h4>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400 mb-3">
                                <li>Аватар не предоставляется</li>
                                <li>Можно играть и приглашать друзей</li>
                                <li>Вывод реальных средств: <span className="text-white font-bold">30%</span></li>
                            </ul>
                        </div>

                        {/* Player */}
                        <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                            <h4 className="font-bold text-blue-300 text-base mb-2">🔵 Тариф «Игрок» — 20$</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Номинал аватара:</span>
                                    <span className="text-white font-bold">20$</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Доход (при закрытии 5ур):</span>
                                    <span className="text-green-400 font-bold">480$</span>
                                </div>
                                <div className="flex justify-between bg-blue-500/10 p-2 rounded">
                                    <span className="text-slate-300">Доступный вывод:</span>
                                    <span className="text-white font-bold">50%</span>
                                </div>
                            </div>
                        </div>

                        {/* Master */}
                        <div className="bg-purple-900/10 p-4 rounded-xl border border-purple-500/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                            <h4 className="font-bold text-purple-300 text-base mb-2">🟣 Тариф «Мастер» — 100$</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Номинал аватара:</span>
                                    <span className="text-white font-bold">100$</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Доход (при закрытии 5ур):</span>
                                    <span className="text-green-400 font-bold">2400$</span>
                                </div>
                                <div className="flex justify-between bg-purple-500/10 p-2 rounded">
                                    <span className="text-slate-300">Доступный вывод:</span>
                                    <span className="text-white font-bold">60%</span>
                                </div>
                            </div>
                        </div>

                        {/* Partner */}
                        <div className="bg-yellow-900/10 p-4 rounded-xl border border-yellow-500/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-2 h-full bg-yellow-500"></div>
                            <h4 className="font-bold text-yellow-300 text-base mb-2">🔶 Тариф «Партнёр» — 1000$</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Номинал аватара:</span>
                                    <span className="text-white font-bold">1000$</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Доход (при закрытии 5ур):</span>
                                    <span className="text-green-400 font-bold">24 000$</span>
                                </div>
                                <div className="flex justify-between bg-yellow-500/10 p-2 rounded">
                                    <span className="text-slate-300">Доступный вывод:</span>
                                    <span className="text-white font-bold">80%</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-slate-700/50"></div>

                    {/* Logic */}
                    <section className="space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                            <span>4️⃣</span> Логика работы аватара
                        </h3>
                        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <div className="mb-4">
                                <div className="font-bold text-white mb-1">Каждый аватар:</div>
                                <ul className="list-disc pl-5 text-xs text-slate-400">
                                    <li>Имеет максимум 3 партнёра в первой линии</li>
                                    <li>Развивается автономно в тринарной структуре</li>
                                </ul>
                            </div>

                            <div>
                                <div className="font-bold text-green-400 mb-1">🔥 Условие выплаты:</div>
                                <div className="text-xs text-slate-300 bg-green-900/20 p-2 rounded border border-green-500/20">
                                    Когда набирается <strong>3 партнёра 4-го уровня</strong> — аватар закрывает 5-й уровень и переводит <strong>весь желтый бонус</strong> владельцу, после чего завершает работу.
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
