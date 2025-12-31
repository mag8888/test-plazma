'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, DollarSign, Users, BarChart, TreePine, Lock, History, ChevronLeft, ChevronRight, CreditCard, Trash2, Calendar, XCircle, RefreshCw } from 'lucide-react';
import { partnershipApi } from '../../lib/partnershipApi';
import CardEditor from './CardEditor';
import { MatrixView } from '../../earn/MatrixView';
import AdminAvatarSelector from './components/AdminAvatarSelector';
import BroadcastModal from './BroadcastModal';

const ADMIN_PARTNERSHIP_URL = '/api/partnership';
const GAME_API_URL = '/api'; // Direct game backend

export default function AdminPage() {
    const router = useRouter();
    const [secret, setSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'USERS' | 'STATS' | 'TREE' | 'LOGS' | 'CARDS' | 'GAMES'>('USERS');
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);

    // Stats
    const [stats, setStats] = useState<any>({
        totalUsers: 0,
        totalAvatars: 0,
        totalGreen: 0,
        totalYellow: 0
    });

    // Users
    const [userQuery, setUserQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // Games
    const [games, setGames] = useState<any[]>([]);
    const [gamesPage, setGamesPage] = useState(1);
    const [gamesTotalPages, setGamesTotalPages] = useState(1);
    const [gamesLoading, setGamesLoading] = useState(false);

    // Avatar Visualization
    const [selectAvatarUser, setSelectAvatarUser] = useState<any>(null);
    const [visualizeAvatar, setVisualizeAvatar] = useState<{ id: string, type: string } | null>(null);

    // Logs
    const [logs, setLogs] = useState<any[]>([]);

    // Balance Modal
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [operation, setOperation] = useState<'ADD' | 'DEDUCT'>('ADD');
    const [reason, setReason] = useState('');
    const [balanceType, setBalanceType] = useState('GREEN');
    const [bonusDescription, setBonusDescription] = useState(''); // Initialized

    // Tree
    const [treeUserId, setTreeUserId] = useState('');
    const [treeData, setTreeData] = useState<any>(null);

    // Edit Referrer
    const [editReferrerUser, setEditReferrerUser] = useState<any>(null);
    const [newReferrer, setNewReferrer] = useState('');

    // Add Avatar Modal
    const [addAvatarUser, setAddAvatarUser] = useState<any>(null);
    const [newAvatarType, setNewAvatarType] = useState('BASIC');
    const [deductBalance, setDeductBalance] = useState(false); // New state for balance deduction

    // History Modal
    const [historyUser, setHistoryUser] = useState<any>(null);
    const [historyData, setHistoryData] = useState<any>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyTab, setHistoryTab] = useState<'TRANSACTIONS' | 'REFERRALS' | 'INVITER'>('TRANSACTIONS');

    const fetchWithAuth = async (endpoint: string, options: any = {}, key: string = secret, baseUrl: string = ADMIN_PARTNERSHIP_URL) => {
        // Fallback to localStorage to prevent stale closure issues with useCallback
        const token = key || localStorage.getItem('admin_secret') || '';

        const headers = {
            'Content-Type': 'application/json',
            'x-admin-secret': token,
            ...options.headers
        };

        const separator = baseUrl === GAME_API_URL ? '/admin' : '/admin'; // Both use /admin prefix in their respective areas
        const finalUrl = `${baseUrl}${separator}${endpoint}`;

        const res = await fetch(finalUrl, {
            ...options,
            headers
        });

        if (res.status === 403) {
            alert('Admin secret invalid or expired. Logging out.');
            logout();
            return { error: 'Unauthorized' };
        }

        return res.json();
    };


    const handleViewHistory = async (user: any) => {
        setHistoryUser(user);
        setHistoryLoading(true);
        setHistoryTab('TRANSACTIONS');
        try {
            const res = await fetchWithAuth(`/users/${user._id}/history`);
            if (res && !res.error) {
                setHistoryData(res);
            } else {
                alert('Failed to fetch history');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setHistoryLoading(false);
        }
    };

    const createAvatar = async () => {
        if (!addAvatarUser) return;

        const actionText = deductBalance ? `PURCHASE active ${newAvatarType} avatar for ${addAvatarUser.username} (COST: check backend)` : `GIFT active ${newAvatarType} avatar for ${addAvatarUser.username}`;
        if (!confirm(`${actionText}?\n\nThis will modify the matrix structure.`)) return;

        const res = await fetchWithAuth('/avatars/add', {
            method: 'POST',
            body: JSON.stringify({
                userId: addAvatarUser._id,
                type: newAvatarType,
                deductBalance: deductBalance
            })
        });

        if (res.success) {
            alert('Avatar created successfully!');
            setAddAvatarUser(null);
            setDeductBalance(false);
            searchUsers(page);
        } else {
            alert(res.error || 'Failed to create avatar');
        }
    };

    const handleCardClick = (type: string) => {
        // Clear search to show full list for the selected category
        setUserQuery('');

        if (type === 'AVATARS') {
            setSortField('avatarsCount');
            setSortOrder('desc');
            setPage(1); // Reset page
        } else if (type === 'GREEN') {
            setSortField('greenBalance');
            setSortOrder('desc');
            setPage(1);
        } else if (type === 'YELLOW') {
            setSortField('yellowBalance');
            setSortOrder('desc');
            setPage(1);
        }

        // Switch to Users tab to visualize
        setActiveTab('USERS');
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            // Toggle order
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, default to desc (highest first)
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const renderSortArrow = (field: string) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    const updateReferrer = async () => {
        if (!editReferrerUser) return;
        if (!confirm(`Change referrer for ${editReferrerUser.username} to ${newReferrer || 'Nobody'}?`)) return;

        const res = await fetchWithAuth('/referrer', {
            method: 'POST',
            body: JSON.stringify({
                userId: editReferrerUser._id,
                referrerIdentifier: newReferrer
            })
        });

        if (res.success) {
            alert(res.message);
            setEditReferrerUser(null);
            setNewReferrer('');
            searchUsers(page);
        } else {
            alert(res.error || 'Error');
        }
    };

    const rebuildReferrals = async () => {
        if (!confirm('Rebuild all referral links from referredBy strings? This will update users without referrer ObjectIds.')) {
            return;
        }

        const res = await fetchWithAuth('/rebuild-referrals', {
            method: 'POST'
        });

        if (res.success) {
            alert(`Referrals rebuilt!\nUpdated: ${res.updated}\nSkipped: ${res.skipped}\nErrors: ${res.errors}`);
            searchUsers(page);
        } else {
            alert(res.error || 'Error rebuilding referrals');
        }
    };

    const fetchGames = useCallback(async (p: number = 1, key: string = secret) => {
        setGamesLoading(true);
        try {
            // Uses GAME_API_URL
            const res = await fetchWithAuth(`/games?page=${p}&limit=20`, {}, key, GAME_API_URL);
            if (res.games) {
                setGames(res.games);
                setGamesTotalPages(res.pages || 1);
                setGamesPage(res.page || 1);
            } else {
                console.warn('Unknown games format', res);
            }
        } catch (e) {
            console.error("Fetch games error", e);
        } finally {
            setGamesLoading(false);
        }
    }, []);

    const cancelGame = async (gameId: string) => {
        if (!confirm('Are you sure you want to CANCEL this game? Players will be notified.')) return;
        try {
            // Uses GAME_API_URL
            const res = await fetchWithAuth(`/games/${gameId}`, { method: 'DELETE' }, secret, GAME_API_URL);
            if (res.success) {
                alert('Game cancelled successfully');
                fetchGames(gamesPage);
            } else {
                alert('Failed to delete: ' + res.error);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    // Auto-login from storage
    useEffect(() => {
        const stored = localStorage.getItem('admin_secret');
        if (stored) {
            setSecret(stored);
            setIsAuthenticated(true);
            fetchStats(stored);
            searchUsers(1, stored);
        }
    }, []);

    // Also reload when switching tabs
    useEffect(() => {
        if (activeTab === 'USERS' && isAuthenticated) {
            searchUsers(page);
        }
        if (activeTab === 'TREE' && isAuthenticated) {
            fetchTree();
        }
        if (activeTab === 'LOGS' && isAuthenticated) {
            fetchLogs();
        }
        if (activeTab === 'GAMES' && isAuthenticated) {
            fetchGames(1);
        }
    }, [activeTab, isAuthenticated, page, sortField, sortOrder, fetchGames]);

    const login = () => {
        if (secret) {
            localStorage.setItem('admin_secret', secret); // persistence enabled
            setIsAuthenticated(true);
            fetchStats(secret);
            searchUsers(1, secret);
        }
    };

    const logout = () => {
        localStorage.removeItem('admin_secret');
        setSecret('');
        setIsAuthenticated(false);
        // router.push('/admin/login'); // No need to redirect, just show login state
    };




    /* fetchWithAuth implementation moved up and refactored */

    const searchUsers = useCallback(async (p: number = 1, key: string = secret) => {
        setIsLoading(true);
        try {
            const res = await fetchWithAuth(`/users?query=${userQuery}&page=${p}&sortBy=${sortField}&order=${sortOrder}`, {}, key);
            if (res.users) {
                setUsers(res.users);
                setTotalPages(res.pages || 1);
                setPage(res.page || 1);
            } else {
                console.warn('Unknown users format', res);
            }
        } catch (e) {
            console.error("Fetch users error", e);
        } finally {
            setIsLoading(false);
        }
    }, [userQuery, sortField, sortOrder]); // Added sortField and sortOrder to dependencies

    const fetchStats = async (key: string = secret) => {
        try {
            const res = await fetchWithAuth('/stats', {}, key);
            if (res && !res.error) {
                setStats(res);
            }
        } catch (e) {
            console.error("Fetch stats error", e);
        }
    };

    const fetchTree = async () => {
        if (!treeUserId) return;
        // Fetching tree from partnership service public endpoint
        const res = await fetch(`${ADMIN_PARTNERSHIP_URL}/tree/${treeUserId}`);
        const data = await res.json();
        setTreeData(data);
    };

    const fetchLogs = async () => {
        const res = await fetchWithAuth('/logs');
        if (Array.isArray(res)) {
            setLogs(res);
        }
    };

    const updateBalance = async () => {
        if (!selectedUser || !amount) return alert('Amount is required');

        const val = Number(amount);
        const finalAmount = operation === 'DEDUCT' ? -val : val;

        console.log('Sending balance update:', {
            userId: selectedUser?._id, // Log ID explicitly
            amount,
            finalAmount,
            balanceType,
            fullUser: selectedUser
        });

        const res = await fetchWithAuth('/balance', {
            method: 'POST',
            body: JSON.stringify({
                userId: selectedUser.telegram_id || selectedUser._id, // Prefer Telegram ID per user request
                amount: finalAmount,
                type: balanceType,
                description: reason,
                bonusDescription: bonusDescription
            })
        });

        if (res.success) {
            alert('Balance updated!');
            // Reset fields
            setAmount('');
            setReason('');
            setBonusDescription('');
            setSelectedUser(null);
            searchUsers(page); // Refresh list
        } else {
            alert(res.error || 'Failed to update balance');
        }
    };

    const handleResetRatings = async () => {
        if (!confirm('⚠️ Are you sure you want to RESET ALL USER RATINGS TO 0? This cannot be undone.')) return;

        const res = await fetchWithAuth('/reset-ratings', {
            method: 'POST'
        });

        if (res.success) {
            alert(res.message);
            searchUsers(page);
        } else {
            alert(res.error || 'Failed to reset ratings');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-96 space-y-6 shadow-2xl">
                    <div className="flex justify-center">
                        <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                            <Lock className="text-red-500" size={32} />
                        </div>
                    </div>
                    <div className="text-center text-white text-xl font-bold">Admin Access</div>
                    <input
                        type="password"
                        placeholder="Enter Admin Secret"
                        className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none transition"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                    />
                    <button
                        onClick={login}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold transition shadow-lg shadow-blue-500/20"
                    >
                        Login
                    </button>
                    <div className="text-center text-xs text-slate-600">Secure Area for Moneo Admins</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200">
            {/* Nav */}
            <div className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-lg text-white">
                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">ADMIN</span>
                        Partnership Panel
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'USERS' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
                            <Users size={18} /> Users
                        </button>
                        <button onClick={() => setActiveTab('STATS')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'STATS' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
                            <BarChart size={18} /> Stats
                        </button>
                        <button onClick={() => setActiveTab('TREE')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'TREE' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
                            <TreePine size={18} /> Tree
                        </button>
                        <button onClick={() => setActiveTab('LOGS')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'LOGS' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
                            <History size={18} /> Logs
                        </button>
                        <button onClick={() => setActiveTab('CARDS')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'CARDS' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
                            <CreditCard size={18} /> Cards
                        </button>
                        <button onClick={() => setActiveTab('GAMES')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${activeTab === 'GAMES' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
                            <Calendar size={18} /> Games
                        </button>
                    </div>
                    <button onClick={logout} className="bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-1.5 rounded-lg text-xs font-bold transition border border-red-500/30">Выйти</button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 py-8 space-y-8">

                {/* Dashboard Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Users className="text-blue-400" />
                                Action Center
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={async () => {
                                        if (!confirm('Rebuild all referral links based on "referredBy" field? This may take a while.')) return;
                                        const res = await fetchWithAuth('/rebuild-referrals', { method: 'POST' });
                                        if (res.success) {
                                            alert(`Rebuild Complete!\nUpdated: ${res.updated}\nSkipped: ${res.skipped}\nErrors: ${res.errors}`);
                                        } else {
                                            alert('Error: ' + res.error);
                                        }
                                    }}
                                    className="bg-blue-900/50 hover:bg-blue-900/70 text-blue-300 p-4 rounded-xl border border-blue-700/50 flex flex-col items-center gap-2 transition"
                                >
                                    <Users size={24} />
                                    <span className="font-bold">Sync Referrals</span>
                                    <span className="text-[10px] opacity-70">Link broken referrals</span>
                                </button>

                                <button
                                    onClick={() => setShowBroadcastModal(true)}
                                    className="bg-purple-900/50 hover:bg-purple-900/70 text-purple-300 p-4 rounded-xl border border-purple-700/50 flex flex-col items-center gap-2 transition"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                    </svg>
                                    <span className="font-bold">Рассылка</span>
                                    <span className="text-[10px] opacity-70">Создать рассылку</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        if (!confirm('Активировать все аватары и пересчитать тарифы?\n\nЭто установит isActive=true для всех аватаров.')) return;
                                        setIsLoading(true);
                                        try {
                                            const res = await fetchWithAuth('/avatars/recalculate', { method: 'POST' });
                                            if (res.success) {
                                                alert(`Пересчет завершен!\nВсего аватаров: ${res.total}\nАктивировано: ${res.activated}\nОбновлено: ${res.updated}${res.errors ? `\nОшибок: ${res.errors.length}` : ''}`);
                                            } else {
                                                alert('Ошибка: ' + res.error);
                                            }
                                        } catch (e: any) {
                                            alert('Ошибка сети: ' + e.message);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="bg-green-900/50 hover:bg-green-900/70 text-green-300 p-4 rounded-xl border border-green-700/50 flex flex-col items-center gap-2 transition"
                                >
                                    <BarChart size={24} />
                                    <span className="font-bold">Пересчитать</span>
                                    <span className="text-[10px] opacity-70">Активировать тарифы</span>
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                            <h2 className="text-xl font-bold mb-4">Users</h2>
                            <div className="text-4xl font-bold text-white">{stats.totalUsers}</div>
                        </div>
                        <div
                            onClick={() => {
                                setActiveTab('USERS');
                                setSortField('avatarsCount'); // Now supported by backend
                                setSortOrder('desc');
                                setTimeout(() => searchUsers(1), 0);
                            }}
                            className="bg-slate-800 p-6 rounded-2xl border border-slate-700 cursor-pointer hover:scale-[1.02] transition-transform group"
                        >
                            <div className="text-slate-400 text-sm font-bold uppercase mb-2 group-hover:text-white transition-colors">Total Avatars</div>
                            <div className="text-3xl font-bold text-white">{stats.totalAvatars}</div>
                        </div>

                        <div
                            onClick={() => {
                                setActiveTab('USERS');
                                setSortField('greenBalance');
                                setSortOrder('desc');
                                setTimeout(() => searchUsers(1), 0); // Trigger search
                            }}
                            className="bg-slate-800 p-6 rounded-2xl border border-slate-700 cursor-pointer hover:scale-[1.02] transition-transform group"
                        >
                            <div className="text-slate-400 text-sm font-bold uppercase mb-2 group-hover:text-green-400 transition-colors">Green Circulation</div>
                            <div className="text-3xl font-bold text-green-400">${stats.totalGreen.toLocaleString()}</div>
                        </div>

                        <div
                            onClick={() => {
                                setActiveTab('USERS');
                                setSortField('yellowBalance');
                                setSortOrder('desc');
                                setTimeout(() => searchUsers(1), 0);
                            }}
                            className="bg-slate-800 p-6 rounded-2xl border border-slate-700 cursor-pointer hover:scale-[1.02] transition-transform group"
                        >
                            <div className="text-slate-400 text-sm font-bold uppercase mb-2 group-hover:text-yellow-400 transition-colors">Yellow Circulation</div>
                            <div className="text-3xl font-bold text-yellow-400">${stats.totalYellow.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">Storage Stats</h3>
                            <div className="text-3xl font-bold text-blue-400">{stats.storageUsed || '0 MB'}</div>
                            <div className="text-xs text-slate-500 mt-2">Total backups size</div>
                        </div>
                    </div>
                )}

                {/* Rebuild Referrals Button (in STATS tab) */}
                {activeTab === 'STATS' && (
                    <div className="mt-6">
                        <button
                            onClick={rebuildReferrals}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
                        >
                            🔄 Rebuild Referrals
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Reconstructs referrer links from referredBy strings</p>
                    </div>
                )}

                {/* LOGS TAB */}
                {activeTab === 'LOGS' && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white">Admin Logs</h2>
                        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-4">Time</th>
                                        <th className="p-4">Admin</th>
                                        <th className="p-4">Action</th>
                                        <th className="p-4">Target User</th>
                                        <th className="p-4">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {logs.map((log: any) => (
                                        <tr key={log._id} className="hover:bg-slate-700/50 transition">
                                            <td className="p-4 text-slate-400 text-sm">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                            <td className="p-4 font-bold text-blue-400">
                                                {log.adminName}
                                            </td>
                                            <td className="p-4 text-white">
                                                <span className="bg-slate-700 px-2 py-1 rounded text-xs">{log.action}</span>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {log.targetUser ? (log.targetUser.username || log.targetUser.telegram_id || 'ID:' + log.targetUser) : 'N/A'}
                                            </td>
                                            <td className="p-4 text-slate-400 text-sm">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">No logs found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TABS */}
                {activeTab === 'USERS' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3 text-slate-500" size={20} />
                                <input
                                    className="w-full bg-slate-950 text-white pl-10 p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                    placeholder="Search by username or Telegram ID..."
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchUsers(1)}
                                />
                            </div>
                            <button onClick={() => searchUsers(1)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition">
                                Search
                            </button>
                        </div>

                        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-4 text-left cursor-pointer hover:text-white" onClick={() => handleSort('createdAt')}>User {renderSortArrow('createdAt')}</th>
                                        <th className="p-4 text-left">Referrer</th>
                                        <th className="p-4 text-left cursor-pointer hover:text-green-400" onClick={() => handleSort('greenBalance')}>Green Bal {renderSortArrow('greenBalance')}</th>
                                        <th className="p-4 text-left cursor-pointer hover:text-yellow-400" onClick={() => handleSort('yellowBalance')}>Yellow Bal {renderSortArrow('yellowBalance')}</th>
                                        <th className="p-4 text-left cursor-pointer hover:text-red-400" onClick={() => handleSort('balanceRed')}>Red Bal {renderSortArrow('balanceRed')}</th>
                                        <th className="p-4 text-left cursor-pointer hover:text-purple-400" onClick={() => handleSort('rating')}>Rating {renderSortArrow('rating')}</th>
                                        <th className="p-4 text-left cursor-pointer hover:text-white" onClick={() => handleSort('gamesPlayed')}>Games {renderSortArrow('gamesPlayed')}</th>
                                        <th className="p-4 text-left cursor-pointer hover:text-white" onClick={() => handleSort('referralsCount')}>Invited {renderSortArrow('referralsCount')}</th>
                                        <th className="p-4 text-left cursor-pointer hover:text-white" onClick={() => handleSort('avatarsCount')}>Avatars {renderSortArrow('avatarsCount')}</th>
                                        <th className="p-4 text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-700/50 transition">
                                            <td className="p-4 font-bold text-white">
                                                {u.username ? (
                                                    <a
                                                        href={`https://t.me/${u.username}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-white hover:text-blue-400 hover:underline"
                                                    >
                                                        {u.username}
                                                    </a>
                                                ) : 'No Name'}
                                                <div className="text-xs text-slate-500 font-mono">{u.telegram_id}</div>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {u.referrer ? (
                                                    <a
                                                        href={`https://t.me/${u.referrer.username}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-blue-400 hover:underline"
                                                    >
                                                        {u.referrer.username || u.referrer.telegram_id || u.referrer}
                                                    </a>
                                                ) : (u.referredBy || '-')}
                                            </td>
                                            <td className="p-4 text-green-400 font-bold">${u.greenBalance}</td>
                                            <td className="p-4 text-yellow-400 font-bold">${u.yellowBalance}</td>
                                            <td className="p-4 text-red-400 font-bold">${u.balanceRed || 0}</td>
                                            <td className="p-4 text-purple-400 font-bold">{u.rating || 0}</td>
                                            <td className="p-4 text-slate-300">{u.gamesPlayed || 0}</td>
                                            <td className="p-4 text-slate-300">{u.referralsCount || 0}</td>
                                            <td className="p-4">
                                                {u.avatarCounts && u.avatarCounts.total > 0 ? (
                                                    <div className="flex gap-1 text-xs">
                                                        {u.avatarCounts.basic > 0 && <span className="bg-green-900/30 border border-green-500/30 px-2 py-1 rounded text-green-400">{u.avatarCounts.basic}</span>}
                                                        {u.avatarCounts.advanced > 0 && <span className="bg-blue-900/30 border border-blue-500/30 px-2 py-1 rounded text-blue-400">{u.avatarCounts.advanced}</span>}
                                                        {u.avatarCounts.premium > 0 && <span className="bg-yellow-900/30 border border-yellow-500/30 px-2 py-1 rounded text-yellow-400">{u.avatarCounts.premium}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 flex gap-2 flex-wrap max-w-[200px]">
                                                <button
                                                    onClick={() => handleViewHistory(u)}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded text-xs transition flex-1 border border-purple-500/30"
                                                >
                                                    History
                                                </button>
                                                <button
                                                    onClick={() => setSelectedUser(u)}
                                                    className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition flex-1"
                                                >
                                                    Balance
                                                </button>
                                                <button
                                                    onClick={() => setEditReferrerUser(u)}
                                                    className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition flex-1"
                                                >
                                                    Edit Ref
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setTreeUserId(u._id);
                                                        setActiveTab('TREE');
                                                    }}
                                                    className="bg-purple-900/50 hover:bg-purple-800 text-purple-300 px-2 py-1 rounded text-xs transition flex-1 border border-purple-500/30"
                                                >
                                                    Tree
                                                </button>
                                                <button
                                                    onClick={() => setAddAvatarUser(u)}
                                                    className="bg-green-900/50 hover:bg-green-800 text-green-300 px-2 py-1 rounded text-xs transition flex-1 border border-green-500/30"
                                                >
                                                    +Avatar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr><td colSpan={10} className="p-8 text-center text-slate-500">No users found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center text-slate-400 text-sm">
                            <div>Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => searchUsers(page - 1)}
                                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => searchUsers(page + 1)}
                                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {/* ... (TREE TAB - Keep existing) ... */}
                {activeTab === 'TREE' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                placeholder="Enter User ID for Tree View"
                                value={treeUserId}
                                onChange={(e) => setTreeUserId(e.target.value)}
                            />
                            <button onClick={fetchTree} className="bg-purple-600 hover:bg-purple-500 text-white px-6 rounded-xl font-bold transition">
                                Load
                            </button>
                        </div>
                        {treeData && (
                            <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 overflow-auto">
                                <pre className="text-xs text-green-400 font-mono">
                                    {JSON.stringify(treeData, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* GAMES TAB */}
                {activeTab === 'GAMES' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Scheduled Games</h2>
                            <button onClick={() => fetchGames(1)} className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg transition">
                                <RefreshCw size={20} />
                            </button>
                        </div>

                        {gamesLoading && <div className="text-center text-slate-500 animate-pulse">Loading games...</div>}

                        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-4">Time</th>
                                        <th className="p-4">Host</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Players</th>
                                        <th className="p-4">Price</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {games.map(game => (
                                        <tr key={game._id} className="hover:bg-slate-700/50 transition">
                                            <td className="p-4 text-white">
                                                <div className="font-bold">{new Date(game.startTime).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-400">{new Date(game.startTime).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {game.hostId ? (
                                                    <a href={`https://t.me/${game.hostId.username}`} target="_blank" className="hover:text-blue-400">
                                                        {game.hostId.first_name} (@{game.hostId.username})
                                                    </a>
                                                ) : 'Unknown'}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${game.status === 'SCHEDULED' ? 'bg-green-900/30 text-green-400' :
                                                    game.status === 'CANCELLED' ? 'bg-red-900/30 text-red-400' :
                                                        'bg-slate-700 text-slate-400'
                                                    }`}>
                                                    {game.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {game.participants?.length || 0} / {game.maxPlayers}
                                            </td>
                                            <td className="p-4 text-yellow-400 font-bold">
                                                {game.price}
                                            </td>
                                            <td className="p-4">
                                                {game.status === 'SCHEDULED' && (
                                                    <button
                                                        onClick={() => cancelGame(game._id)}
                                                        className="bg-red-900/50 hover:bg-red-800 text-red-300 px-3 py-1.5 rounded-lg text-xs transition border border-red-500/30 flex items-center gap-1"
                                                    >
                                                        <XCircle size={14} /> Cancel
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {games.length === 0 && !gamesLoading && (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">No games found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center text-slate-400 text-sm">
                            <div>Page {gamesPage} of {gamesTotalPages}</div>
                            <div className="flex gap-2">
                                <button
                                    disabled={gamesPage <= 1}
                                    onClick={() => fetchGames(gamesPage - 1)}
                                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    disabled={gamesPage >= gamesTotalPages}
                                    onClick={() => fetchGames(gamesPage + 1)}
                                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </div>

            {/* HISTORY MODAL */}
            {historyUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-2xl flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-950 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <History className="text-purple-500" />
                                    User History: {historyUser.username}
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">ID: {historyUser.telegram_id}</p>
                            </div>
                            <button onClick={() => setHistoryUser(null)} className="text-slate-400 hover:text-white p-2">✕</button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-700 bg-slate-900">
                            <button
                                onClick={() => setHistoryTab('TRANSACTIONS')}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${historyTab === 'TRANSACTIONS' ? 'border-purple-500 text-purple-400 bg-purple-900/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                💸 Transactions
                            </button>
                            <button
                                onClick={() => setHistoryTab('REFERRALS')}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${historyTab === 'REFERRALS' ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                👥 Referrals ({historyData?.referralsCount || 0})
                            </button>
                            <button
                                onClick={() => setHistoryTab('INVITER')}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${historyTab === 'INVITER' ? 'border-green-500 text-green-400 bg-green-900/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                            >
                                🔗 Inviter
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-6 bg-slate-900">
                            {historyLoading ? (
                                <div className="flex justify-center items-center h-full text-slate-500 animate-pulse">Loading history...</div>
                            ) : !historyData ? (
                                <div className="text-center text-red-400">Failed to load data</div>
                            ) : (
                                <>
                                    {/* TRANSACTIONS TAB */}
                                    {historyTab === 'TRANSACTIONS' && (
                                        <div className="space-y-4">
                                            <div className="flex gap-4 mb-4">
                                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-1">
                                                    <div className="text-xs text-slate-500 uppercase">Green Balance</div>
                                                    <div className="text-2xl font-bold text-green-400">${historyData.user.greenBalance?.toLocaleString()}</div>
                                                </div>
                                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-1">
                                                    <div className="text-xs text-slate-500 uppercase">Yellow Balance</div>
                                                    <div className="text-2xl font-bold text-yellow-400">${historyData.user.yellowBalance?.toLocaleString()}</div>
                                                </div>
                                            </div>

                                            <table className="w-full text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-950">
                                                    <tr>
                                                        <th className="p-3">Date</th>
                                                        <th className="p-3">Type</th>
                                                        <th className="p-3">Amount</th>
                                                        <th className="p-3">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-800 text-sm">
                                                    {historyData.transactions?.map((tx: any) => (
                                                        <tr key={tx._id} className="hover:bg-slate-800/50">
                                                            <td className="p-3 text-slate-400 whitespace-nowrap">
                                                                {new Date(tx.createdAt).toLocaleString()}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type.includes('BONUS') ? 'bg-green-900/30 text-green-400' :
                                                                    tx.type === 'WITHDRAWAL' ? 'bg-red-900/30 text-red-400' :
                                                                        'bg-slate-800 text-slate-300'
                                                                    }`}>
                                                                    {tx.type}
                                                                </span>
                                                            </td>
                                                            <td className={`p-3 font-bold ${tx.amount > 0 ? (tx.currency === 'YELLOW' ? 'text-yellow-400' : 'text-green-400') : 'text-red-400'
                                                                }`}>
                                                                {tx.amount > 0 ? '+' : ''}{tx.amount} {tx.currency === 'YELLOW' ? 'Y' : '$'}
                                                            </td>
                                                            <td className="p-3 text-slate-300 max-w-xs truncate">
                                                                {tx.description}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!historyData.transactions || historyData.transactions.length === 0) && (
                                                        <tr><td colSpan={4} className="p-8 text-center text-slate-600">No transactions found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* REFERRALS TAB */}
                                    {historyTab === 'REFERRALS' && (
                                        <div>
                                            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl mb-4 text-blue-300 text-sm">
                                                Total Direct Referrals: <span className="font-bold text-white">{historyData.referralsCount}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {historyData.referrals?.map((ref: any) => (
                                                    <div key={ref._id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                                                            {ref.photo_url ? (
                                                                <img src={ref.photo_url} alt={ref.username} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">{ref.username?.[0] || '?'}</div>
                                                            )}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-bold text-white truncate">{ref.username || 'No Name'}</div>
                                                            <div className="text-xs text-slate-500">ID: {ref.telegram_id}</div>
                                                            <div className="text-xs text-green-400 mt-1">Bal: ${ref.greenBalance}</div>
                                                        </div>
                                                        <div className="ml-auto text-xs text-slate-600">
                                                            {new Date(ref.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                ))}
                                                {historyData.referrals?.length === 0 && (
                                                    <div className="col-span-full text-center text-slate-500 p-8">No referrals yet</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* INVITER TAB */}
                                    {historyTab === 'INVITER' && (
                                        <div className="max-w-md mx-auto mt-10">
                                            {historyData.inviter ? (
                                                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center space-y-4">
                                                    <div className="w-24 h-24 rounded-full bg-slate-700 mx-auto overflow-hidden ring-4 ring-green-500/20">
                                                        {historyData.inviter.photo_url ? (
                                                            <img src={historyData.inviter.photo_url} alt="Inviter" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-3xl text-slate-500 font-bold">
                                                                {historyData.inviter.username?.[0] || '?'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-green-400 font-bold uppercase mb-1">Invited By</div>
                                                        <h3 className="text-2xl font-bold text-white">{historyData.inviter.username || 'Unknown'}</h3>
                                                        <div className="text-slate-400 font-mono text-sm mt-1">ID: {historyData.inviter.telegram_id}</div>
                                                    </div>
                                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                                        <div className="text-xs text-slate-500">Inviter's Balance</div>
                                                        <div className="text-xl font-bold text-green-400">${historyData.inviter.greenBalance}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center border-dashed">
                                                    <div className="text-5xl mb-4">👻</div>
                                                    <h3 className="text-xl font-bold text-white">No Inviter</h3>
                                                    <p className="text-slate-500 mt-2">This user joined directly or was seeded.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* BALANCE MODAL */}
            {
                selectedUser && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md space-y-6">
                            <h2 className="text-xl font-bold text-white">Manage Balance</h2>
                            <div className="text-slate-400 text-sm">User: <span className="text-white font-bold">{selectedUser.username}</span></div>

                            {/* Operation Toggle */}
                            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl">
                                <button
                                    onClick={() => setOperation('ADD')}
                                    className={`py-2 rounded-lg text-sm font-bold transition ${operation === 'ADD' ? 'bg-green-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                                >
                                    Add (+)
                                </button>
                                <button
                                    onClick={() => setOperation('DEDUCT')}
                                    className={`py-2 rounded-lg text-sm font-bold transition ${operation === 'DEDUCT' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                                >
                                    Deduct (-)
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => setBalanceType('GREEN')} className={`w-full py-2 rounded-xl text-sm font-bold border ${balanceType === 'GREEN' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Green</button>
                                    <div className="text-center text-green-500 font-bold">{selectedUser.greenBalance || 0}</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => setBalanceType('YELLOW')} className={`w-full py-2 rounded-xl text-sm font-bold border ${balanceType === 'YELLOW' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Yellow</button>
                                    <div className="text-center text-yellow-500 font-bold">{selectedUser.yellowBalance || 0}</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => setBalanceType('RED')} className={`w-full py-2 rounded-xl text-sm font-bold border ${balanceType === 'RED' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Red</button>
                                    <div className="text-center text-red-500 font-bold">{selectedUser.balanceRed || 0}</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button onClick={() => setBalanceType('RATING')} className={`w-full py-2 rounded-xl text-sm font-bold border ${balanceType === 'RATING' ? 'bg-purple-900/50 border-purple-500 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Rating</button>
                                    <div className="text-center text-purple-500 font-bold">{selectedUser.rating || 0}</div>
                                </div>
                            </div>

                            <input
                                type="number"
                                placeholder="Amount"
                                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />

                            <input
                                type="text"
                                placeholder="Bonus Description (Optional)"
                                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                value={bonusDescription}
                                onChange={(e) => setBonusDescription(e.target.value)}
                            />

                            <textarea
                                placeholder="Reason (Mandatory)"
                                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none h-24 resize-none"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />

                            <div className="flex gap-2">
                                <button onClick={() => setSelectedUser(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold transition">Cancel</button>
                                <button onClick={updateBalance} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold transition">
                                    {operation === 'ADD' ? 'Top Up' : 'Write Off'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ADD AVATAR MODAL */}
            {
                addAvatarUser && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md space-y-6">
                            <h2 className="text-xl font-bold text-white">Add Avatar (Admin)</h2>
                            <div className="text-slate-400 text-sm">User: <span className="text-white font-bold">{addAvatarUser.username}</span></div>
                            <div className="bg-red-900/20 text-red-400 text-xs p-3 rounded border border-red-500/20">
                                Warning: This creates an active avatar directly in the matrix. No balance will be deducted.
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-slate-400 uppercase font-bold">Avatar Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setNewAvatarType('BASIC')}
                                        className={`p-3 rounded-xl border font-bold text-sm transition ${newAvatarType === 'BASIC' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        BASIC
                                    </button>
                                    <button
                                        onClick={() => setNewAvatarType('ADVANCED')}
                                        className={`p-3 rounded-xl border font-bold text-sm transition ${newAvatarType === 'ADVANCED' ? 'bg-blue-900/50 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        ADVANCED
                                    </button>
                                    <button
                                        onClick={() => setNewAvatarType('PREMIUM')}
                                        className={`p-3 rounded-xl border font-bold text-sm transition ${newAvatarType === 'PREMIUM' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        PREMIUM
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={deductBalance}
                                        onChange={(e) => setDeductBalance(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-yellow-500">Buy with Balance</span>
                                        <span className="text-xs text-slate-400">Deduct balance & distribute referral commissions</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setAddAvatarUser(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold transition">Cancel</button>
                                <button onClick={createAvatar} className="flex-1 bg-green-600 hover:bg-green-500 text-white p-3 rounded-xl font-bold transition shadow-lg shadow-green-500/20">
                                    Create Avatar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* EDIT REFERRER MODAL */}
            {
                editReferrerUser && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md space-y-6">
                            <h2 className="text-xl font-bold text-white">Edit Referrer</h2>
                            <div className="text-slate-400 text-sm">User: <span className="text-white font-bold">{editReferrerUser.username}</span></div>
                            <div className="text-slate-500 text-xs">Current: {editReferrerUser.referrer ? (editReferrerUser.referrer.username || editReferrerUser.referrer) : 'None'}</div>

                            <input
                                type="text"
                                placeholder="Enter new referrer Username or Telegram ID"
                                className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                value={newReferrer}
                                onChange={(e) => setNewReferrer(e.target.value)}
                            />
                            <div className="text-xs text-yellow-500">
                                Leave empty to remove referrer.
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setEditReferrerUser(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl font-bold transition">Cancel</button>
                                <button onClick={updateReferrer} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold transition">Save</button>
                            </div>
                        </div>
                    </div>
                )
            }



            {/* Broadcast Modal */}
            <BroadcastModal isOpen={showBroadcastModal} onClose={() => setShowBroadcastModal(false)} />
        </div>
    );
}
