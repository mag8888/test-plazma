'use client';

import { useState } from 'react';
import { Search, Users as UsersIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface User {
    _id: string;
    username: string;
    first_name?: string;
    telegram_id?: number;
    referralBalance: number;
    balanceRed: number;
    greenBalance?: number;
    referralsCount: number;
    referredBy?: string;
    createdAt: string;
}

export default function AllUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [referrals, setReferrals] = useState<any[]>([]);

    const fetchAllUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users/all');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (e) {
            alert('Error fetching users');
        }
        setLoading(false);
    };

    const searchUsers = async () => {
        if (!searchQuery) return fetchAllUsers();
        setLoading(true);
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            setUsers(data.users || []);
        } catch (e) {
            alert('Error searching users');
        }
        setLoading(false);
    };

    const viewReferrals = async (username: string) => {
        try {
            const res = await fetch(`/api/check-referrals/${username}`);
            const data = await res.json();
            setReferrals(data.referrals || []);
            setSelectedUser(users.find(u => u.username === username) || null);
        } catch (e) {
            alert('Error fetching referrals');
        }
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.telegram_id?.toString().includes(searchQuery)
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <Link href="/admin" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4">
                    <ArrowLeft size={20} />
                    Back to Admin
                </Link>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <UsersIcon size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">All Users</h1>
                            <p className="text-sm text-slate-400">Main database users with referrals</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchAllUsers}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Load All Users'}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-slate-500" size={20} />
                        <input
                            className="w-full bg-slate-900 text-white pl-10 p-3 rounded-xl border border-slate-800 focus:border-blue-500 outline-none"
                            placeholder="Search by username, name, or Telegram ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                        />
                    </div>
                    <button
                        onClick={searchUsers}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-6 rounded-xl font-bold transition"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="p-4">Username</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Telegram ID</th>
                                    <th className="p-4">Red Balance</th>
                                    <th className="p-4">Green (Legacy)</th>
                                    <th className="p-4">Green (New)</th>
                                    <th className="p-4">Referrals</th>
                                    <th className="p-4">Referred By</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredUsers.map(user => (
                                    <tr key={user._id} className="hover:bg-slate-800/50 transition">
                                        <td className="p-4 font-bold text-white">{user.username}</td>
                                        <td className="p-4 text-slate-400">{user.first_name || '-'}</td>
                                        <td className="p-4 font-mono text-sm text-slate-400">{user.telegram_id || '-'}</td>
                                        <td className="p-4 text-red-400 font-bold">${user.balanceRed}</td>
                                        <td className="p-4 text-green-400 font-bold">${user.referralBalance}</td>
                                        <td className="p-4 text-emerald-400 font-bold">${user.greenBalance || 0}</td>
                                        <td className="p-4">
                                            <span className="bg-blue-900/30 text-blue-400 px-2 py-1 rounded-lg text-sm font-bold">
                                                {user.referralsCount}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 text-sm">{user.referredBy || '-'}</td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => viewReferrals(user.username)}
                                                className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg transition border border-slate-700"
                                            >
                                                View Refs
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-slate-500">
                                            {loading ? 'Loading...' : 'No users found. Click "Load All Users" to fetch.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Stats */}
                {users.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-4">
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Users</div>
                            <div className="text-2xl font-bold text-white">{users.length}</div>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Referrals</div>
                            <div className="text-2xl font-bold text-blue-400">
                                {users.reduce((sum, u) => sum + (u.referralsCount || 0), 0)}
                            </div>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Red Balance</div>
                            <div className="text-2xl font-bold text-red-400">
                                ${users.reduce((sum, u) => sum + (u.balanceRed || 0), 0)}
                            </div>
                        </div>
                        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                            <div className="text-slate-400 text-xs uppercase font-bold">Total Green (Legacy)</div>
                            <div className="text-2xl font-bold text-green-400">
                                ${users.reduce((sum, u) => sum + (u.referralBalance || 0), 0)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Referrals Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-2xl border border-slate-800 shadow-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">Referrals for {selectedUser.username}</h2>
                                <p className="text-sm text-slate-400">Total: {referrals.length}</p>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2">
                            {referrals.map((ref, index) => (
                                <div key={index} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-white">{ref.username}</div>
                                            <div className="text-sm text-slate-400">{ref.firstName || 'No name'}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500">Telegram ID</div>
                                            <div className="font-mono text-sm text-slate-300">{ref.telegramId}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        Joined: {new Date(ref.joinedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {referrals.length === 0 && (
                                <div className="text-center text-slate-500 py-8">No referrals found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
