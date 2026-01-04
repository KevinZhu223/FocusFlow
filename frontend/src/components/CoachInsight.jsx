/**
 * FocusFlow - Coach Insight
 * AI-generated daily coaching insights
 */

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { getDailyInsights } from '../api';

export default function CoachInsight() {
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activityCount, setActivityCount] = useState(0);

    const fetchInsight = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getDailyInsights();
            setInsight(response.insight || '');
            setActivityCount(response.activity_count || 0);
        } catch (err) {
            console.error('Failed to fetch insights:', err);
            setError('Unable to generate insights');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInsight();
    }, []);

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 
                    rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-medium text-zinc-300">Coach's Insight</h3>
                </div>
                <div className="space-y-2">
                    <div className="h-4 bg-zinc-800/50 rounded animate-pulse" />
                    <div className="h-4 bg-zinc-800/50 rounded animate-pulse w-4/5" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <h3 className="text-sm font-medium text-zinc-300">Coach's Insight</h3>
                    </div>
                    <button
                        onClick={fetchInsight}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 
                     hover:bg-zinc-800 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
                <p className="text-sm text-zinc-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 
                  rounded-xl p-4 relative overflow-hidden">
            {/* Decorative gradient orb */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />

            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-500/20">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="text-sm font-medium text-zinc-300">Coach's Insight</h3>
                    </div>
                    <button
                        onClick={fetchInsight}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 
                     hover:bg-zinc-800/50 transition-colors"
                        title="Refresh insight"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">
                    {insight}
                </p>

                {activityCount > 0 && (
                    <p className="text-xs text-zinc-500 mt-3">
                        Based on {activityCount} activities today
                    </p>
                )}
            </div>
        </div>
    );
}
