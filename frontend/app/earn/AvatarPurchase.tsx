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
        withdrawalPercent: null, // No special withdrawal rate
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
        withdrawalPercent: 60,
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
        withdrawalPercent: 80,
        icon: Crown,
        color: 'from-yellow-600 to-amber-600',
        borderColor: 'border-yellow-500/30',
        bgColor: 'bg-yellow-900/20',
        limited: true
    }
];

export function AvatarPurchase({ partnershipUser, onPurchaseSuccess }: AvatarPurchaseProps) {
    // Initialize from props if available
    const [myAvatars, setMyAvatars] = useState<any[]>(partnershipUser?.avatars || []);
    const [premiumCount, setPremiumCount] = useState({ count: 0, limit: 25, available: 25 });
    const [loading, setLoading] = useState(false);
    const [showMatrix, setShowMatrix] = useState(false);
    const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
    const [selectedAvatarType, setSelectedAvatarType] = useState<string>('');

    useEffect(() => {
        if (partnershipUser?._id) {
            // Update state if props change (e.g. after purchase in parent)
            if (partnershipUser.avatars) {
                setMyAvatars(partnershipUser.avatars);
            } else {
                loadMyAvatars();
            }
            loadPremiumCount();
        }
    }, [partnershipUser]);

    const loadMyAvatars = async () => {
        try {
            const data = await partnershipApi.getMyAvatars(partnershipUser._id);
            setMyAvatars(data.avatars || []);
        } catch (err) {
            console.error('Failed to load avatars:', err);
        }
    };

    const loadPremiumCount = async () => {
        try {
            const data = await partnershipApi.getPremiumCount();
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
            // Use API wrapper
            const data = await partnershipApi.subscribe(partnershipUser._id, type);

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
                                        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors ml-2"
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
                fetcher={(url) => {
                    // Extract ID from url or just call api directly if we knew ID
                    // MatrixView passes '/api/partnership/avatars/matrix/${id}'
                    const id = url.split('/').pop() || '';
                    return partnershipApi.getAvatarMatrix(id);
                }}
            />
        </div>
    );
}
