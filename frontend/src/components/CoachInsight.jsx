/**
 * FocusFlow - Coach Insight
 * AI-generated daily coaching insights
 */

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getDailyInsights } from '../api';

export default function CoachInsight() {
    const [insight, setInsight] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activityCount, setActivityCount] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false);

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

    // Truncate insight to ~100 chars if not expanded
    const displayInsight = !isExpanded && insight.length > 120
        ? insight.substring(0, 120).trim() + '...'
        : insight;
    const canExpand = insight.length > 120;

    if (isLoading) {
        return (
            <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span className="text-sm font-medium text-zinc-400">Generating insight...</span>
                </div>
                <div className="space-y-2">
                    <div className="h-3 bg-zinc-800/50 rounded animate-pulse" />
                    <div className="h-3 bg-zinc-800/50 rounded animate-pulse w-4/5" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm text-zinc-500">{error}</span>
                    </div>
                    <button
                        onClick={fetchInsight}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 
                                 hover:bg-zinc-800 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-4 relative overflow-hidden group">
            {/* Subtle gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-indigo-500/50" />

            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shrink-0">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                        {displayInsight}
                    </p>

                    {/* Expand/collapse and meta */}
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-zinc-500">
                            {activityCount > 0 ? `${activityCount} activities today` : 'No activities yet'}
                        </span>

                        <div className="flex items-center gap-1">
                            {canExpand && (
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    {isExpanded ? (
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            )}
                            <button
                                onClick={fetchInsight}
                                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
