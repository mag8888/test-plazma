import { useState } from 'react';
import { getBackendUrl } from '../../lib/config';
import { X, Upload, Users, DollarSign, Award, Filter, RefreshCw, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface BroadcastModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FilterState {
    minRating?: number;
    maxRating?: number;
    hasAvatar: boolean;
    minBalance?: number;
    maxBalance?: number;
    minInvited?: number;
}

type Step = 'input' | 'filters' | 'preview' | 'sending' | 'result';

export default function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
    const [step, setStep] = useState<Step>('input');
    const [text, setText] = useState('');
    const [filters, setFilters] = useState<FilterState>({ hasAvatar: false });
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [previewSample, setPreviewSample] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ sent: number, errors: number, total: number } | null>(null);

    const handleClose = () => {
        setStep('input');
        setText('');
        setFilters({ hasAvatar: false });
        setPreviewCount(null);
        setResult(null);
        onClose();
    };

    const fetchPreview = async () => {
        setSending(true);
        try {
            const backendUrl = getBackendUrl();
            // Using Partnership Backend URL logic if AdminController is usually there. 
            // In super-admin/page.tsx, fetchWithAuth uses ADMIN_PARTNERSHIP_URL by default if not specified.
            // But getBackendUrl() returns GAME backend.
            // We need the Partnership Admin URL. 
            // Assuming the proxy or consistent naming. 
            // Better to match what page.tsx does effectively:
            const token = localStorage.getItem('admin_secret') || '';
            const baseUrl = process.env.NEXT_PUBLIC_ADMIN_PARTNERSHIP_URL || 'https://partnership-backend-production-d50d.up.railway.app/api/admin';

            const res = await fetch(`${baseUrl}/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': token
                },
                body: JSON.stringify({
                    message: text,
                    filters: filters,
                    dryRun: true
                })
            });
            const data = await res.json();
            if (data.success) {
                setPreviewCount(data.count);
                setPreviewSample(data.sample || []);
                setStep('preview');
            } else {
                alert('Preview Failed: ' + data.error);
            }
        } catch (e: any) {
            alert('Network Error: ' + e.message);
        } finally {
            setSending(false);
        }
    };

    const handleSend = async () => {
        if (!confirm('Are you sure you want to send this broadcast?')) return;
        setSending(true);
        setStep('sending');
        try {
            const token = localStorage.getItem('admin_secret') || '';
            const baseUrl = process.env.NEXT_PUBLIC_ADMIN_PARTNERSHIP_URL || 'https://partnership-backend-production-d50d.up.railway.app/api/admin';

            const res = await fetch(`${baseUrl}/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-secret': token
                },
                body: JSON.stringify({
                    message: text,
                    filters: filters,
                    dryRun: false
                })
            });
            const data = await res.json();
            if (data.success) {
                setResult({ sent: data.sent, errors: data.errors, total: data.total });
                setStep('result');
            } else {
                alert('Send Failed: ' + data.error);
                setStep('preview'); // Go back
            }
        } catch (e: any) {
            alert('Network Error: ' + e.message);
            setStep('preview');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4 font-sans">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Send size={20} className="text-purple-400" /> Broadcast System
                    </h2>
                    <button onClick={handleClose} className="text-slate-500 hover:text-white transition"><X size={24} /></button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* STEP 1: MESSAGE INPUT */}
                    {step === 'input' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-slate-400 text-sm font-bold uppercase mb-2">Message</label>
                                <textarea
                                    className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:border-purple-500 outline-none resize-none transition"
                                    placeholder="Enter your broadcast message here..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                                <div className="text-right text-xs text-slate-500 mt-1">{text.length} chars</div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    disabled={!text.trim()}
                                    onClick={() => setStep('filters')}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-bold transition flex items-center gap-2"
                                >
                                    Next: Filters <Filter size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: FILTERS */}
                    {step === 'filters' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Filter size={18} className="text-blue-400" /> Audience Filters</h3>

                                <div className="space-y-4">
                                    {/* Avatar Filter */}
                                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-600 transition">
                                        <input
                                            type="checkbox"
                                            checked={filters.hasAvatar}
                                            onChange={e => setFilters({ ...filters, hasAvatar: e.target.checked })}
                                            className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                                        />
                                        <div>
                                            <div className="text-white font-bold">Has Avatar</div>
                                            <div className="text-xs text-slate-500">Only users who own an active avatar</div>
                                        </div>
                                        <Award size={20} className={`ml-auto ${filters.hasAvatar ? 'text-purple-400' : 'text-slate-600'}`} />
                                    </label>

                                    {/* Rating Filter */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase font-bold">Min Rating</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={filters.minRating || ''}
                                                onChange={e => setFilters({ ...filters, minRating: e.target.value ? Number(e.target.value) : undefined })}
                                                className="w-full bg-slate-950 text-white p-2 rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase font-bold">Max Rating</label>
                                            <input
                                                type="number"
                                                placeholder="Any"
                                                value={filters.maxRating || ''}
                                                onChange={e => setFilters({ ...filters, maxRating: e.target.value ? Number(e.target.value) : undefined })}
                                                className="w-full bg-slate-950 text-white p-2 rounded-lg border border-slate-700 focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Balance Filter */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase font-bold">Min Green Balance</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={filters.minBalance || ''}
                                                onChange={e => setFilters({ ...filters, minBalance: e.target.value ? Number(e.target.value) : undefined })}
                                                className="w-full bg-slate-950 text-white p-2 rounded-lg border border-slate-700 focus:border-green-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 uppercase font-bold">Min Invited Users</label>
                                            <input
                                                type="number"
                                                placeholder="0"
                                                value={filters.minInvited || ''}
                                                onChange={e => setFilters({ ...filters, minInvited: e.target.value ? Number(e.target.value) : undefined })}
                                                className="w-full bg-slate-950 text-white p-2 rounded-lg border border-slate-700 focus:border-green-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button onClick={() => setStep('input')} className="text-slate-400 hover:text-white px-4">Back</button>
                                <button
                                    onClick={fetchPreview}
                                    disabled={sending}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-xl font-bold transition flex items-center gap-2"
                                >
                                    {sending ? <RefreshCw className="animate-spin" /> : <Users size={16} />}
                                    Preview Recipients
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 'preview' && previewCount !== null && (
                        <div className="space-y-6 text-center">
                            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
                                <div className="text-4xl font-bold text-white mb-2">{previewCount}</div>
                                <div className="text-slate-400 uppercase text-sm font-bold tracking-wider">Recipients Matched</div>

                                {previewSample.length > 0 && (
                                    <div className="mt-4 p-3 bg-slate-900 rounded-lg text-xs text-slate-500 border border-slate-800">
                                        Sample: {previewSample.join(', ')}...
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between">
                                <button onClick={() => setStep('filters')} className="text-slate-400 hover:text-white px-4">Back to Filters</button>
                                <button
                                    onClick={handleSend}
                                    disabled={sending || previewCount === 0}
                                    className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto"
                                >
                                    <Send size={18} /> {sending ? 'Sending...' : 'CONFIRM & SEND'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SENDING / SPINNER */}
                    {step === 'sending' && (
                        <div className="flex flex-col items-center justify-center h-full py-12">
                            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-bold text-white">Broadcasting...</h3>
                            <p className="text-slate-400">Please do not close this window.</p>
                        </div>
                    )}

                    {/* STEP 5: RESULT */}
                    {step === 'result' && result && (
                        <div className="text-center py-8 space-y-6">
                            <div className="flex justify-center mb-4">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border-2 border-green-500/50">
                                    <CheckCircle size={40} className="text-green-500" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-white">Broadcast Complete!</h2>
                            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <div className="text-2xl font-bold text-white">{result.sent}</div>
                                    <div className="text-xs text-slate-500 uppercase">Sent</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <div className="text-2xl font-bold text-red-400">{result.errors}</div>
                                    <div className="text-xs text-slate-500 uppercase">Errors</div>
                                </div>
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <div className="text-2xl font-bold text-slate-400">{result.total}</div>
                                    <div className="text-xs text-slate-500 uppercase">Total</div>
                                </div>
                            </div>
                            <button onClick={handleClose} className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-bold mt-8">
                                Close
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
