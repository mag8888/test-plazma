import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, DollarSign, Users, BarChart, TreePine, Lock, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { partnershipApi } from '../../../lib/partnershipApi';

const API_URL = '/api/partnership'; // Use internal proxy for Monolith

export default function AdminPage() {
    const router = useRouter();
    const [secret, setSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState<'USERS' | 'STATS' | 'TREE' | 'LOGS'>('USERS');

    // Stats
    const [stats, setStats] = useState<any>(null);

    // Users
    const [userQuery, setUserQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Logs
    const [logs, setLogs] = useState<any[]>([]);

    // Balance Modal
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [operation, setOperation] = useState<'ADD' | 'DEDUCT'>('ADD');
    const [reason, setReason] = useState('');
    const [balanceType, setBalanceType] = useState('GREEN');

    // Tree
    const [treeUserId, setTreeUserId] = useState('');
    const [treeData, setTreeData] = useState<any>(null);

    // Edit Referrer
    const [editReferrerUser, setEditReferrerUser] = useState<any>(null);
    const [newReferrer, setNewReferrer] = useState('');

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
    }, [activeTab, isAuthenticated]);

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

    const fetchWithAuth = async (endpoint: string, options: any = {}, key: string = secret) => {
        const headers = {
            'Content-Type': 'application/json',
            'x-admin-secret': key,
            ...options.headers
        };

        const res = await fetch(`${API_URL}/admin${endpoint}`, {
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

    const searchUsers = async (p: number = 1, key: string = secret) => {
        const res = await fetchWithAuth(`/users?query=${userQuery}&page=${p}`, {}, key);
        if (res.users) {
            setUsers(res.users);
            setTotalPages(res.pages || 1);
            setPage(res.page || 1);
        } else {
            console.warn('Unknown users format', res);
        }
    };

    const fetchStats = async (key: string = secret) => {
        const res = await fetchWithAuth('/stats', {}, key);
        if (!res.error) setStats(res);
    };

    const fetchTree = async () => {
        if (!treeUserId) return;
        // Not proxied through admin right now, tree is public? No, tree needs ID.
        // Actually tree API is public /api/tree/:id
        // But let's use the fetchWithAuth just in case or fetch directly
        // The user wants tree in admin panel.
        // Let's assume we can fetch public tree API.
        const res = await fetch(`${API_URL}/tree/${treeUserId}`);
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
        if (!selectedUser || !amount || !reason) return alert('Please fill all fields');

        const finalAmount = operation === 'DEDUCT' ? -Number(amount) : Number(amount);

        const res = await fetchWithAuth('/balance', {
            method: 'POST',
            body: JSON.stringify({
                userId: selectedUser._id,
                amount: finalAmount,
                type: balanceType,
                description: reason
            })
        });

        if (res.success) {
            alert('Balance Updated!');
            setSelectedUser(null);
            setAmount('');
            setReason('');
            searchUsers(page); // Refresh list
        } else {
            alert(res.error || 'Failed');
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
                        <a href="/admin/users/" className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-500/30"><Users size={18} /> All Users</a>

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
                    </div>
                    <button onClick={logout} className="bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-1.5 rounded-lg text-xs font-bold transition border border-red-500/30">Выйти</button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 py-8 space-y-8">

                {/* GLOBAL STATS BANNER */}
                {stats && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Users</div>
                            <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Avatars</div>
                            <div className="text-2xl font-bold text-purple-400">{stats.totalAvatars}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Green</div>
                            <div className="text-2xl font-bold text-green-400">${stats.totalGreen.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Yellow</div>
                            <div className="text-2xl font-bold text-yellow-400">${stats.totalYellow.toLocaleString()}</div>
                        </div>
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
                                        <th className="p-4">User</th>
                                        <th className="p-4">Referrer</th>
                                        <th className="p-4">Green Bal</th>
                                        <th className="p-4">Yellow Bal</th>
                                        <th className="p-4">Red Bal</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-700/50 transition">
                                            <td className="p-4 font-bold text-white">
                                                {u.username || 'No Name'}
                                                <div className="text-xs text-slate-500 font-mono">{u.telegram_id}</div>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {u.referrer ? (u.referrer.username || u.referrer.telegram_id || u.referrer) : '-'}
                                            </td>
                                            <td className="p-4 text-green-400 font-bold">${u.greenBalance}</td>
                                            <td className="p-4 text-yellow-400 font-bold">${u.yellowBalance}</td>
                                            <td className="p-4 text-red-400 font-bold">${u.balanceRed || 0}</td>
                                            <td className="p-4 flex gap-2">
                                                <button
                                                    onClick={() => setSelectedUser(u)}
                                                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs transition"
                                                >
                                                    Balance
                                                </button>
                                                <button
                                                    onClick={() => setEditReferrerUser(u)}
                                                    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs transition"
                                                >
                                                    Edit Ref
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">No users found</td></tr>
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

            </div>

            {/* BALANCE MODAL */}
            {selectedUser && (
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

                        <div className="flex gap-2">
                            <button onClick={() => setBalanceType('GREEN')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${balanceType === 'GREEN' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Green</button>
                            <button onClick={() => setBalanceType('YELLOW')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${balanceType === 'YELLOW' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Yellow</button>
                            <button onClick={() => setBalanceType('RED')} className={`flex-1 py-2 rounded-xl text-sm font-bold border ${balanceType === 'RED' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Red</button>
                        </div>

                        <input
                            type="number"
                            placeholder="Amount"
                            className="w-full bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
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
            )}

            {/* EDIT REFERRER MODAL */}
            {editReferrerUser && (
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
            )}
        </div>
    );
}
