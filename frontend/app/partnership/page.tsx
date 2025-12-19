'use client';
import React, { useEffect, useState } from 'react';
import { partnershipApi } from '../../lib/partnershipApi';
import { TreeVisualizer } from './components/TreeVisualizer';

export default function PartnershipPage() {
    const [stats, setStats] = useState<any>(null);
    const [avatars, setAvatars] = useState<any[]>([]);
    const [userId, setUserId] = useState<string>(''); // Needs to be set from auth context in real app
    const [loading, setLoading] = useState(false);

    // Mock User ID for demo/testing - replace with actual auth logic
    useEffect(() => {
        // Just for demo, try to fetch or create a user if not exists
        // In reality, we'd get this from the logged-in user session
        const storedUserId = localStorage.getItem('moneo_user_id');
        if (storedUserId) {
            setUserId(storedUserId);
        } else {
            // Ask for ID or auto-create demo user?
            // Let's create a demo user
            const demoId = 'demo_' + Math.floor(Math.random() * 10000);
            partnershipApi.subscribe(demoId, 'GUEST').then(() => { // Init generic call or create user endpoint
                setUserId(demoId);
                localStorage.setItem('moneo_user_id', demoId);
            });
        }
    }, []);

    const fetchData = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const statsData = await partnershipApi.getStats(userId);
            const treeData = await partnershipApi.getTree(userId);
            setStats(statsData);
            setAvatars(treeData);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (userId) fetchData();
    }, [userId]);

    const handleSubscribe = async (tariff: string) => {
        if (!userId) return;
        await partnershipApi.subscribe(userId, tariff); // Referrer?
        fetchData();
    };

    const handleWithdraw = async () => {
        const amount = prompt('Enter amount to withdraw:');
        if (amount && userId) {
            const res = await partnershipApi.withdraw(userId, Number(amount));
            if (res.success) {
                alert(`Payout: ${res.payout}. Commission: ${res.commission}`);
                fetchData();
            } else {
                alert(res.error);
            }
        }
    };

    return (
        <div style={{ backgroundColor: '#1a1a1a', minHeight: '100vh', padding: '20px', color: '#fff' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Trinar Partnership</h1>

            {/* Stats Panel */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
                    <h2>Green Balance</h2>
                    <p style={{ fontSize: '1.5rem', color: '#4CAF50' }}>${stats?.greenBalance || 0}</p>
                    <small>Available to withdraw</small>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
                    <h2>Yellow Bonus</h2>
                    <p style={{ fontSize: '1.5rem', color: '#FFD700' }}>${stats?.yellowBalance || 0}</p>
                    <small>Accumulates inside structure</small>
                </div>
                <div style={{ padding: '20px', backgroundColor: '#333', borderRadius: '10px' }}>
                    <h2>Active Avatars</h2>
                    <p style={{ fontSize: '1.5rem' }}>{stats?.avatarCount || 0}</p>
                </div>
            </div>

            {/* Actions */}
            <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
                <button onClick={() => handleSubscribe('PLAYER')} style={{ padding: '10px 20px', backgroundColor: '#2196F3', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}>Buy PLAYER ($20)</button>
                <button onClick={() => handleSubscribe('MASTER')} style={{ padding: '10px 20px', backgroundColor: '#9C27B0', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}>Buy MASTER ($100)</button>
                <button onClick={() => handleSubscribe('PARTNER')} style={{ padding: '10px 20px', backgroundColor: '#FF5722', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}>Buy PARTNER ($1000)</button>
                <button onClick={handleWithdraw} style={{ padding: '10px 20px', backgroundColor: '#4CAF50', border: 'none', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}>Withdraw</button>
            </div>

            {/* Tree Vis */}
            <div style={{ border: '1px solid #444', padding: '20px', borderRadius: '10px', backgroundColor: '#222' }}>
                <h2>My Structure</h2>
                {loading ? <p>Loading...</p> : <TreeVisualizer avatars={avatars} />}
            </div>
        </div>
    );
}
