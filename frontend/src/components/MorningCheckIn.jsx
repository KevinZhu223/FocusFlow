/**
 * FocusFlow - Morning Check-In Component
 * Shows yesterday's summary when user logs in for the first time each day
 * Designed to build reflection and accountability habits
 */

import { useState, useEffect } from 'react';
import { X, Sun, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Target } from 'lucide-react';
import { getMorningCheckin } from '../api';

const STORAGE_KEY = 'focusflow_last_checkin';

export default function MorningCheckIn() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        checkAndFetch();
    }, []);

    const checkAndFetch = async () => {
        // Check if already shown today
        const today = new Date().toISOString().split('T')[0];
        const lastCheckin = localStorage.getItem(STORAGE_KEY);

        if (lastCheckin === today) {
            setLoading(false);
            return;
        }

        try {
            const result = await getMorningCheckin();
            setData(result);

            // Only show if there's yesterday data
            if (result.has_data) {
                setVisible(true);
            }
        } catch (err) {
            console.error('Failed to fetch morning check-in:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        // Mark as shown for today
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(STORAGE_KEY, today);
        setDismissed(true);
        setTimeout(() => setVisible(false), 300);
    };

    if (loading || !visible || !data) {
        return null;
    }

    const getMoodColor = () => {
        switch (data.mood) {
            case 'positive': return 'from-emerald-500/20 to-green-900/20';
            case 'warning': return 'from-red-500/20 to-red-900/20';
            case 'cautious': return 'from-amber-500/20 to-orange-900/20';
            default: return 'from-indigo-500/20 to-purple-900/20';
        }
    };

    const getMoodIcon = () => {
        switch (data.mood) {
            case 'positive': return TrendingUp;
            case 'warning': return AlertTriangle;
            case 'cautious': return Target;
            default: return Sun;
        }
    };

    const MoodIcon = getMoodIcon();

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 
                        bg-black/80 backdrop-blur-md transition-opacity duration-300
                        ${dismissed ? 'opacity-0' : 'opacity-100'}`}>
            <div className={`w-full max-w-md bg-gradient-to-br ${getMoodColor()} 
                           border border-zinc-700/50 rounded-2xl backdrop-blur-xl shadow-2xl
                           transform transition-all duration-300
                           ${dismissed ? 'scale-95' : 'scale-100'}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/20">
                            <Sun className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-100">Good Morning!</h2>
                            <p className="text-xs text-zinc-500">Here's how yesterday went</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="glass-card p-3 text-center">
                            <div className="text-2xl font-bold text-zinc-100">{data.activity_count}</div>
                            <div className="text-xs text-zinc-500">Activities</div>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <div className="text-2xl font-bold text-zinc-100">{data.total_hours}h</div>
                            <div className="text-xs text-zinc-500">Tracked</div>
                        </div>
                        <div className="glass-card p-3 text-center">
                            <div className={`text-2xl font-bold ${data.total_score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {data.total_score > 0 ? '+' : ''}{data.total_score}
                            </div>
                            <div className="text-xs text-zinc-500">Score</div>
                        </div>
                    </div>

                    {/* Insight */}
                    <div className="glass-card p-4">
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${data.mood === 'positive' ? 'bg-emerald-500/20' :
                                    data.mood === 'warning' ? 'bg-red-500/20' :
                                        'bg-amber-500/20'
                                }`}>
                                <MoodIcon className={`w-4 h-4 ${data.mood === 'positive' ? 'text-emerald-400' :
                                        data.mood === 'warning' ? 'text-red-400' :
                                            'text-amber-400'
                                    }`} />
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{data.insight}</p>
                        </div>
                    </div>

                    {/* Suggestion */}
                    {data.suggestion && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-indigo-300 font-medium mb-1">Today's Focus</p>
                                <p className="text-sm text-zinc-300">{data.suggestion}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 pt-0">
                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600
                                 text-white font-medium hover:from-indigo-600 hover:to-purple-700
                                 transition-all"
                    >
                        Let's Make Today Count
                    </button>
                </div>
            </div>
        </div>
    );
}
