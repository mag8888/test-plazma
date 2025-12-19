'use client';

import { useTelegram } from '../../components/TelegramProvider';
import { User, Shield, TrendingUp, DollarSign, Trophy, Medal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { partnershipApi } from '../../lib/partnershipApi';

type Tab = 'stats' | 'rankings';

interface RankingUser {
    _id: string;
    username: string;
    firstName?: string;
    first_name?: string;
    photoUrl?: string; // from backend map
    photo_url?: string;
    wins: number;
    balanceRed: number;
    isMaster?: boolean;
}

export default function ProfilePage() {
    const { webApp, user } = useTelegram();
    const [activeTab, setActiveTab] = useState<Tab>('stats');

    // Stats Data
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // Rankings Data
    const [rankings, setRankings] = useState<RankingUser[]>([]);
    const [loadingRankings, setLoadingRankings] = useState(false);

    // Consolidated user balances
    const balanceRed = user?.balanceRed || 0;
    // GREEN Balance is now fetched from Partnership API
    const [partnershipBalance, setPartnershipBalance] = useState(0);

    // Fetch History Effect
    useEffect(() => {
        const fetchHistory = async () => {
            if (!user || !webApp) return;
            try {
                const res = await fetch('/api/transactions', {
                    headers: { 'Authorization': `Bearer ${webApp.initData}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTransactions(data);
                }
            } catch (e) {
                console.error("History fetch error", e);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
        fetchHistory();

        if (user?.id) {
            // Fetch partnership balance
            partnershipApi.getStats(user.id.toString())
                .then(data => {
                    if (data && data.greenBalance !== undefined) {
                        setPartnershipBalance(data.greenBalance);
                    }
                })
                .catch(e => console.error("Profile partnership fetch error", e));
        }
    }, [user]);

    // Fetch Rankings Effect (Lazy load on tab switch)
    useEffect(() => {
        if (activeTab === 'rankings' && rankings.length === 0) {
            setLoadingRankings(true);
            fetch('/api/rankings')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setRankings(data);
                })
                .catch(err => console.error("Rankings error", err))
                .finally(() => setLoadingRankings(false));
        }
    }, [activeTab]);

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
            <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-900/20 to-slate-900 pointer-events-none"></div>

            <div className="p-4 pt-6 space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {user?.photoUrl ? (
                            <img src={user.photoUrl} className="w-16 h-16 rounded-full border-2 border-blue-500 shadow-lg shadow-blue-500/20" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
                                <User size={32} className="text-slate-400" />
                            </div>
                        )}
                        <div>
                            <h1 className="font-bold text-xl leading-tight">{user?.firstName || user?.first_name || 'Гость'}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                {user?.isMaster ? (
                                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
                                        <Medal size={10} /> Мастер
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Игрок</span>
                                )}
                                <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">
                                    ID: {user?.id?.toString().slice(-4)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'stats' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Статистика
                    </button>
                    <button
                        onClick={() => setActiveTab('rankings')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'rankings' ? 'bg-gradient-to-r from-yellow-600/20 to-orange-600/20 text-yellow-200 border border-yellow-500/20 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Trophy size={14} className={activeTab === 'rankings' ? 'text-yellow-400' : ''} />
                        Рейтинг
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'stats' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Balance Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={40} /></div>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Игровой счет</p>
                                <h2 className="text-2xl font-black text-red-400 mt-1">${balanceRed}</h2>
                            </div>
                            <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 p-4 rounded-2xl border border-blue-500/20 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp size={40} /></div>
                                <p className="text-blue-300/70 text-[10px] font-bold uppercase tracking-wider">Реальный счет</p>
                                <p className="text-blue-300/70 text-[10px] font-bold uppercase tracking-wider">Реальный счет</p>
                                <h2 className="text-2xl font-black text-green-400 mt-1">${partnershipBalance}</h2>
                            </div>
                        </div>

                        {/* History Section */}
                        <div className="space-y-3">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Shield size={18} className="text-slate-400" />
                                История операций
                            </h3>

                            {transactions.length > 0 ? (
                                <div className="space-y-2">
                                    {transactions.map((tx) => {
                                        // Handle related user (populated or just ID)
                                        const sourceUser = tx.relatedUserId;
                                        const sourceName = sourceUser ? (sourceUser.username || sourceUser.firstName || sourceUser.first_name || 'Unknown') : null;
                                        const sourceLink = sourceUser?.username ? `https://t.me/${sourceUser.username}` : null;

                                        return (
                                            <div key={tx._id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex justify-between items-center hover:bg-slate-800 transition-colors">
                                                <div>
                                                    <div className="font-bold text-sm text-slate-200">
                                                        {tx.description}
                                                        {sourceName && (
                                                            <span className="ml-1 text-slate-400 font-normal">
                                                                от{' '}
                                                                {sourceLink ? (
                                                                    <a
                                                                        href={sourceLink}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-400 hover:underline hover:text-blue-300"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        @{sourceName}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-400">{sourceName}</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                        {new Date(tx.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <div className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}$
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-xl p-8 text-center text-slate-500 text-sm border border-slate-800/50 border-dashed">
                                    <div className="mb-2 text-2xl opacity-30 grayscale">🧾</div>
                                    {loadingHistory ? 'Загрузка...' : 'История пока пуста...'}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-gradient-to-r from-yellow-600/10 to-orange-600/10 p-4 rounded-xl border border-yellow-500/20 text-center">
                            <h3 className="text-yellow-200 font-bold text-lg mb-1">Топ Игроков</h3>
                            <p className="text-slate-400 text-xs">Лидеры по количеству побед и накопленному капиталу</p>
                        </div>

                        {loadingRankings ? (
                            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div></div>
                        ) : (
                            <div className="space-y-2">
                                {rankings.map((player, index) => {
                                    const isMe = user?.id && player._id === user.id; // Check ID match if possible, or visually highlight
                                    // Note: local user.id might be telegram ID, backend returns Mongo ID.
                                    // Better visual styling for Top 3

                                    let placeColor = 'bg-slate-800 border-slate-700';
                                    let rankIcon = <span className="text-slate-500 font-mono text-sm w-5 text-center">{index + 1}</span>;

                                    if (index === 0) {
                                        placeColor = 'bg-gradient-to-r from-yellow-900/40 to-slate-800 border-yellow-500/50';
                                        rankIcon = <span className="text-2xl">🥇</span>;
                                    } else if (index === 1) {
                                        placeColor = 'bg-gradient-to-r from-slate-400/20 to-slate-800 border-slate-400/30';
                                        rankIcon = <span className="text-2xl">🥈</span>;
                                    } else if (index === 2) {
                                        placeColor = 'bg-gradient-to-r from-orange-700/20 to-slate-800 border-orange-700/30';
                                        rankIcon = <span className="text-2xl">🥉</span>;
                                    }

                                    const name = player.first_name || player.firstName || player.username || 'Игрок';
                                    const photo = player.photo_url || player.photoUrl;

                                    return (
                                        <div key={player._id} className={`${placeColor} rounded-xl p-3 border flex items-center justify-between shadow-sm`}>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8">
                                                    {rankIcon}
                                                </div>

                                                {photo ? (
                                                    <img src={photo} className="w-10 h-10 rounded-full bg-slate-700 object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                                        <User size={18} className="text-slate-400" />
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="font-bold text-sm text-white flex items-center gap-1">
                                                        {name}
                                                        {player.isMaster && <Medal size={12} className="text-purple-400" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        Побед: <span className="text-yellow-400 font-bold">{player.wins || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xs font-bold text-slate-300 bg-slate-900/50 px-2 py-1 rounded">
                                                    ${player.balanceRed?.toLocaleString() || 0}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
