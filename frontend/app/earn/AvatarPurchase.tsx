'use client';

import { useState, useEffect } from 'react';
import { partnershipApi } from '../../lib/partnershipApi';
import { Shield, Crown, Star, Clock, Eye } from 'lucide-react';
import { MatrixView } from './MatrixView';

interface AvatarPurchaseProps {
    partnershipUser: any;
    onPurchaseSuccess: () => void;
}

const AVATAR_TYPES = [
    {
        type: 'BASIC',
        name: 'Базовый Аватар',
        cost: 20,
        subscription: '1 месяц',
        icon: Shield,
        color: 'from-green-600 to-emerald-600',
        borderColor: 'border-green-500/30',
        bgColor: 'bg-green-900/20'
    },
    {
        type: 'ADVANCED',
        name: 'Продвинутый Аватар',
        cost: 100,
        subscription: '1 год',
        icon: Star,
        color: 'from-blue-600 to-indigo-600',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-900/20'
    },
    {
        type: 'PREMIUM',
        name: 'Премиум Аватар',
        cost: 1000,
        subscription: 'Навсегда',
        icon: Crown,
        color: 'from-yellow-600 to-amber-600',
        borderColor: 'border-yellow-500/30',
        bgColor: 'bg-yellow-900/20',
        limited: true
    }
];

export function AvatarPurchase({ partnershipUser, onPurchaseSuccess }: AvatarPurchaseProps) {
    const [myAvatars, setMyAvatars] = useState<any[]>([]);
    const [premiumCount, setPremiumCount] = useState({ count: 0, limit: 25, available: 25 });
    const [loading, setLoading] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
    const [selectedAvatarType, setSelectedAvatarType] = useState<string>('');

    useEffect(() => {
        if (partnershipUser?._id) {
            loadMyAvatars();
            loadPremiumCount();
        }
    }, [partnershipUser]);

    const loadMyAvatars = async () => {
        try {
            const res = await fetch(`/api/partnership/avatars/my-avatars/${partnershipUser._id}`);
            const data = await res.json();
            setMyAvatars(data.avatars || []);
        } catch (err) {
            console.error('Failed to load avatars:', err);
        }
    };

    const loadPremiumCount = async () => {
        try {
            const res = await fetch('/api/partnership/avatars/premium-count');
            const data = await res.json();
            setPremiumCount(data);
        } catch (err) {
            console.error('Failed to load premium count:', err);
        }
    };

    const handlePurchase = async (type: string, cost: number) => {
        if (loading) return;

        // Check balance
        const balance = partnershipUser?.greenBalance || 0;
        if (balance < cost) {
            alert(`Недостаточно зеленого баланса! Нужно $${cost}, у вас $${balance}`);
            return;
        }

        // Check premium limit
        if (type === 'PREMIUM' && premiumCount.available <= 0) {
            alert('Превышен лимит премиум аватаров (25 max)');
            return;
        }

        if (!confirm(`Купить ${AVATAR_TYPES.find(a => a.type === type)?.name} за $${cost}?`)) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/partnership/avatars/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: partnershipUser._id, type })
            });

            const data = await res.json();

            if (data.success) {
                alert('✅ Аватар куплен!');
                await loadMyAvatars();
                await loadPremiumCount();
                onPurchaseSuccess();
            } else {
                alert(`Ошибка: ${data.error}`);
            }
        } catch (err: any) {
            console.error('Purchase error:', err);
            alert('Ошибка покупки');
        } finally {
            setLoading(false);
        }
    };

    // Count avatars by type
    const avatarCounts = {
        BASIC: myAvatars.filter(a => a.type === 'BASIC').length,
        ADVANCED: myAvatars.filter(a => a.type === 'ADVANCED').length,
        PREMIUM: myAvatars.filter(a => a.type === 'PREMIUM').length
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Аватары Матрицы</h2>
                <div className="text-sm text-slate-400">
                    {myAvatars.length} аватаров
                </div>
            </div>

            {/* Purchase Cards */}
            <div className="grid grid-cols-1 gap-4">
                {AVATAR_TYPES.map(avatar => {
                    const Icon = avatar.icon;
                    const count = avatarCounts[avatar.type as keyof typeof avatarCounts];
                    const isAvailable = avatar.type === 'PREMIUM' ? premiumCount.available > 0 : true;

                    return (
                        <div
                            key={avatar.type}
                            className={`bg-slate-800/50 border ${avatar.borderColor} rounded-xl p-4 space-y-3`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${avatar.color} flex items-center justify-center`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{avatar.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            <span>{avatar.subscription}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-white">${avatar.cost}</div>
                                    {count > 0 && (
                                        <div className="text-xs text-green-400">У вас: {count}</div>
                                    )}
                                </div>
                            </div>

                            {avatar.limited && (
                                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2 text-xs text-yellow-300">
                                    Лимит: {premiumCount.count}/{premiumCount.limit} • Доступно: {premiumCount.available}
                                </div>
                            )}

                            <div className="text-sm text-slate-300">
                                <div>• 50% зеленых → пригласителю</div>
                                <div>• 50% желтых → владельцу родительского аватара</div>
                                <div>• Подписка нужна для получения бонусов</div>
                            </div>

                            <button
                                onClick={() => handlePurchase(avatar.type, avatar.cost)}
                                disabled={loading || !isAvailable}
                                className={`w-full py-3 rounded-lg font-bold text-white transition-all ${loading || !isAvailable
                                    ? 'bg-slate-700 cursor-not-allowed opacity-50'
                                    : `bg-gradient-to-r ${avatar.color} hover:scale-[1.02] active:scale-[0.98]`
                                    }`}
                            >
                                {loading ? 'Обработка...' : isAvailable ? 'Купить' : 'Нет в наличии'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* My Avatars List */}
            {myAvatars.length > 0 && (
                <div className="mt-6 space-y-2">
                    <h3 className="text-lg font-bold text-white">Мои Аватары</h3>
                    {myAvatars.map((avatar, idx) => {
                        const avatarType = AVATAR_TYPES.find(a => a.type === avatar.type);
                        if (!avatarType) return null;

                        const Icon = avatarType.icon;
                        const expiryDate = avatar.subscriptionExpires
                            ? new Date(avatar.subscriptionExpires).toLocaleDateString('ru-RU')
                            : 'Бессрочно';

                        return (
                            <div
                                key={idx}
                                className={`${avatarType.bgColor} border ${avatarType.borderColor} rounded-lg p-3 flex items-center justify-between`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="w-5 h-5 text-white" />
                                    <div>
                                        <div className="font-bold text-white text-sm">{avatarType.name}</div>
                                        <div className="text-xs text-slate-400">
                                            Уровень {avatar.level} • {avatar.partners?.length || 0}/3 партнеров
                                            {avatar.isClosed && <span className="ml-2 text-green-400">✓ Закрыто</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <div className="text-sm text-white">{expiryDate}</div>
                                        <div className={`text-xs ${avatar.hasActiveSubscription ? 'text-green-400' : 'text-red-400'}`}>
                                            {avatar.hasActiveSubscription ? 'Активна' : 'Истекла'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedAvatarId(avatar._id);
                                            setSelectedAvatarType(avatarType.name);
                                            setShowMatrix(true);
                                        }}
                                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                                        title="Посмотреть матрицу"
                                    >
                                        <Eye className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Matrix Visualization Modal */}
            <MatrixView
                isOpen={showMatrix}
                onClose={() => setShowMatrix(false)}
                avatarId={selectedAvatarId || ''}
                avatarType={selectedAvatarType}
            />
        </div>
    );
}
