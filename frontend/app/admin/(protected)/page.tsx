'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, DollarSign, Users, BarChart, TreePine, Lock } from 'lucide-react';
import { partnershipApi } from '../../../lib/partnershipApi';

const API_URL = '/api/partnership'; // Use internal proxy for Monolith

export default function AdminPage() {
    const router = useRouter();
    const [secret, setSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activeTab, setActiveTab] = useState<'USERS' | 'STATS' | 'TREE'>('USERS');

    // Stats
    const [stats, setStats] = useState<any>(null);

    // Users
    const [userQuery, setUserQuery] = useState('');
    const [users, setUsers] = useState<any[]>([]);

    // Balance Modal
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [balanceType, setBalanceType] = useState('GREEN');

    // Tree
    const [treeUserId, setTreeUserId] = useState('');
    const [treeData, setTreeData] = useState<any>(null);

    // Removed auto-login useEffect to prevent 403 loops and enforce manual login
    // useEffect(() => {
    //     const stored = localStorage.getItem('admin_secret');
    //     if (stored) {
    //         setSecret(stored);
    //         setIsAuthenticated(true);
    //         fetchStats(stored);
    //         searchUsers(stored); // Load users on mount
    //     }
    // }, []);

    // Also reload when switching tabs
    useEffect(() => {
        if (activeTab === 'USERS' && isAuthenticated) {
            searchUsers();
        }
        if (activeTab === 'TREE' && isAuthenticated) {
            fetchTree();
        }
    }, [activeTab, isAuthenticated]);

    const login = () => {
        if (secret) {
            // localStorage.setItem('admin_secret', secret); // disable persistence as requested
            setIsAuthenticated(true);
            fetchStats(secret);
            searchUsers(secret);
        }
    };

    const logout = () => {
        // localStorage.removeItem('admin_secret');
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
        try {
            const res = await fetch(`${API_URL}/admin${endpoint}`, { ...options, headers });

            // Auto-logout on 403 (Invalid Secret)
            if (res.status === 403) {
                console.warn('Admin secret invalid or expired. Logging out.');
                localStorage.removeItem('admin_secret');
                setIsAuthenticated(false);
                setSecret('');
                return { error: 'Unauthorized' };
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        } catch (e) {
            console.error(e);
            return { error: 'Fetch failed' };
        }
    };

    const fetchStats = async (key: string = secret) => {
        const headers = { 'x-admin-secret': key };
        try {
            const res = await fetch(`${API_URL}/admin/stats`, { headers });
            const data = await res.json();
            if (data.error) {
                if (data.error.includes('Unauthorized')) logout();
            } else {
                setStats(data);
            }
        } catch (e) {
            console.error('Stats error:', e);
        }
    };

    const searchUsers = async (key: string = secret) => {
        const data = await fetchWithAuth(`/users?query=${userQuery}`, {}, key);
        if (data.users && Array.isArray(data.users)) {
            setUsers(data.users);
        } else if (Array.isArray(data)) {
            setUsers(data);
        } else {
            console.warn('Unknown users format', data);
            setUsers([]);
        }
    };

    const updateBalance = async () => {
        if (!selectedUser || !amount) return;
        if (!confirm(`Are you sure you want to add ${amount} to ${selectedUser.username} (${balanceType})?`)) return;

        const res = await fetchWithAuth('/balance', {
            method: 'POST',
            body: JSON.stringify({
                userId: selectedUser._id,
                amount: Number(amount),
                type: balanceType
            })
        });

        if (res.success) {
            alert('Balance updated');
            setSelectedUser(null);
            setAmount('');
            searchUsers(); // Refresh list
        } else {
            alert(res.error || 'Error');
        }
    };

    const fetchTree = async () => {
        // Reuse public API or authenticated one? 
        // Let's use public for now since we just need data, but maybe we want a raw view
        // Using existing partnershipApi for tree
        const data = await partnershipApi.getTree(treeUserId);
        setTreeData(data);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full space-y-6">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center ring-4 ring-red-500/10">
                            <Lock size={32} className="text-red-500" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center text-white">Admin Access</h1>
                    <input
                        type="password"
                        placeholder="Enter Admin Secret"
                        className="w-full bg-slate-950 text-white p-4 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && login()}
                    />
                    <button onClick={login} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">
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
                                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                                />
                            </div>
                            <button onClick={() => searchUsers()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition">
                                Search
                            </button>
                        </div>

                        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-4">User</th>
                                        <th className="p-4">Telegram ID</th>
                                        <th className="p-4">Green Bal</th>
                                        <th className="p-4">Yellow Bal</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {users.map(u => (
                                        <tr key={u._id} className="hover:bg-slate-700/50 transition">
                                            <td className="p-4 font-bold text-white">{u.username || 'No Name'}</td>
                                            <td className="p-4 font-mono text-slate-400 text-sm">{u.telegram_id}</td>
                                            <td className="p-4 text-green-400 font-bold">${u.greenBalance}</td>
                                            <td className="p-4 text-yellow-400 font-bold">${u.yellowBalance}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => setSelectedUser(u)}
                                                    className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg transition border border-slate-600"
                                                >
                                                    Manage Balance
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-500">No users found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'TREE' && (
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-slate-950 text-white p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                placeholder="Enter User ID for Tree..."
                                value={treeUserId}
                                onChange={(e) => setTreeUserId(e.target.value)}
                            />
                            <button onClick={fetchTree} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition">
                                Load Tree
                            </button>
                        </div>
                        {treeData && (
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-auto font-mono text-xs text-green-400 whitespace-pre">
                                {JSON.stringify(treeData, null, 2)}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* BALANCE MODAL */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl space-y-4">
                        <h2 className="text-xl font-bold text-white">Manage Balance</h2>
                        <div className="text-sm text-slate-400">User: <span className="text-white font-bold">{selectedUser.username}</span></div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setBalanceType('GREEN')}
                                className={`p-3 rounded-xl border text-sm font-bold transition ${balanceType === 'GREEN' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                            >
                                Green Balance
                            </button>
                            <button
                                onClick={() => setBalanceType('YELLOW')}
                                className={`p-3 rounded-xl border text-sm font-bold transition ${balanceType === 'YELLOW' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                            >
                                Yellow Balance
                            </button>
                        </div>

                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 text-slate-500" size={20} />
                            <input
                                type="number"
                                className="w-full bg-slate-950 text-white pl-10 p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                                placeholder="Amount (negative to deduct)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setSelectedUser(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition">
                                Cancel
                            </button>
                            <button onClick={updateBalance} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
