import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus, Calendar, Flame, Activity, Award, ChevronRight } from 'lucide-react';

/**
 * WeeklyRecapModal Component
 * Shows on Monday mornings with a summary of last week's performance
 */
export default function WeeklyRecapModal({ isOpen, onClose, recapData }) {
    if (!isOpen || !recapData) return null;

    const {
        week_start,
        week_end,
        total_activities,
        total_score,
        total_hours,
        category_breakdown,
        trend_vs_previous,
        top_day,
        badges_earned,
        streak_max
    } = recapData;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getTrendIcon = (trend) => {
        if (trend > 0) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
        if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
        return <Minus className="w-4 h-4 text-zinc-400" />;
    };

    const getTrendColor = (trend) => {
        if (trend > 0) return 'text-emerald-400';
        if (trend < 0) return 'text-red-400';
        return 'text-zinc-400';
    };

    // Category colors for the breakdown bars
    const categoryColors = {
        Career: 'bg-indigo-500',
        Health: 'bg-emerald-500',
        Leisure: 'bg-violet-500',
        Chores: 'bg-slate-500',
        Social: 'bg-amber-500'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 
                          border border-zinc-700/50 rounded-3xl p-6 max-w-lg w-full
                          shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg text-zinc-500 
                             hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full 
                                  bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 
                                  text-sm font-medium mb-3">
                        <Calendar className="w-4 h-4" />
                        Weekly Recap
                    </div>
                    <h2 className="text-2xl font-bold text-zinc-100">
                        {formatDate(week_start)} - {formatDate(week_end)}
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">Here's how you did last week</p>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                        <Activity className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                        <div className="text-xl font-bold text-zinc-100">{total_activities || 0}</div>
                        <div className="text-xs text-zinc-500">Activities</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                        <div className="text-xl font-bold text-zinc-100">+{(total_score || 0).toFixed(0)}</div>
                        <div className="text-xs text-zinc-500">Score</div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                        <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                        <div className="text-xl font-bold text-zinc-100">{streak_max || 0}</div>
                        <div className="text-xs text-zinc-500">Day Streak</div>
                    </div>
                </div>

                {/* Trend vs Previous Week */}
                {trend_vs_previous !== undefined && (
                    <div className="bg-zinc-800/30 rounded-xl p-4 mb-6 flex items-center justify-between">
                        <span className="text-zinc-400 text-sm">Compared to last week</span>
                        <div className={`flex items-center gap-1 ${getTrendColor(trend_vs_previous)}`}>
                            {getTrendIcon(trend_vs_previous)}
                            <span className="font-medium">
                                {trend_vs_previous > 0 ? '+' : ''}{trend_vs_previous?.toFixed(0)}%
                            </span>
                        </div>
                    </div>
                )}

                {/* Category Breakdown */}
                {category_breakdown && Object.keys(category_breakdown).length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-zinc-400 mb-3">Time by Category</h3>
                        <div className="space-y-2">
                            {Object.entries(category_breakdown)
                                .sort((a, b) => b[1].minutes - a[1].minutes)
                                .map(([category, data]) => {
                                    const totalMins = Object.values(category_breakdown)
                                        .reduce((sum, c) => sum + c.minutes, 0);
                                    const percent = totalMins > 0
                                        ? (data.minutes / totalMins) * 100
                                        : 0;
                                    const hours = (data.minutes / 60).toFixed(1);

                                    return (
                                        <div key={category}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-zinc-300">{category}</span>
                                                <span className="text-zinc-500">{hours}h</span>
                                            </div>
                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${categoryColors[category] || 'bg-zinc-600'} transition-all`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* Top Day */}
                {top_day && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 
                                  border border-amber-500/20 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">🏆</div>
                            <div>
                                <div className="text-sm text-amber-400 font-medium">Best Day</div>
                                <div className="text-zinc-100">
                                    {new Date(top_day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                    <span className="text-zinc-500 ml-2">+{top_day.score?.toFixed(0)} pts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Badges Earned */}
                {badges_earned && badges_earned.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            Badges Earned
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {badges_earned.map((badge, i) => (
                                <span
                                    key={i}
                                    className="px-3 py-1 rounded-full bg-amber-500/20 
                                             border border-amber-500/30 text-amber-400 text-sm"
                                >
                                    {badge.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Continue Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600
                             text-white font-semibold shadow-lg shadow-indigo-500/25
                             hover:shadow-indigo-500/40 transition-all hover:scale-[1.02]
                             flex items-center justify-center gap-2"
                >
                    Start This Week Strong
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
