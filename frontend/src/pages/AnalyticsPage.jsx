/**
 * FocusFlow - Analytics Page
 * Phase 5: Deep Data Analytics with correlations, heatmaps, and export
 */

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, Brain, Calendar, Download, TrendingUp, TrendingDown,
    Minus, AlertTriangle, Sparkles, Clock, Activity, Award, Flame,
    Trophy, Sun, Moon, Sunrise
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getFullAnalytics, exportDataCSV } from '../api';
import WorkModesChart from '../components/WorkModesChart';

// Day names for heatmap
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Format hour to 12-hour format with AM/PM
const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
};

// Color scale for heatmap - single color gradient (indigo)
const getHeatmapColor = (intensity) => {
    if (intensity === undefined || intensity === null) return 'bg-zinc-800/50';

    // Single color gradient from dark to bright indigo/purple
    if (intensity < 0.15) return 'bg-zinc-800/60';
    if (intensity < 0.30) return 'bg-indigo-950/70';
    if (intensity < 0.45) return 'bg-indigo-900/80';
    if (intensity < 0.60) return 'bg-indigo-700/85';
    if (intensity < 0.75) return 'bg-indigo-600/90';
    if (intensity < 0.90) return 'bg-indigo-500';
    return 'bg-indigo-400';
};

/**
 * Data Confidence Banner
 */
function ConfidenceBanner({ confidence }) {
    if (!confidence || !confidence.show_warning) return null;

    return (
        <div className={`rounded-xl p-4 mb-6 flex items-start gap-3
                        ${confidence.level === 'low'
                ? 'bg-amber-500/10 border border-amber-500/30'
                : 'bg-blue-500/10 border border-blue-500/30'}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5
                                     ${confidence.level === 'low' ? 'text-amber-400' : 'text-blue-400'}`} />
            <div>
                <p className={`text-sm font-medium ${confidence.level === 'low' ? 'text-amber-400' : 'text-blue-400'}`}>
                    {confidence.level === 'low' ? 'Building Your Profile' : 'Early Insights'}
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                    {confidence.message}
                </p>
                {confidence.needed > 0 && (
                    <div className="mt-2">
                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden w-48">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                                style={{ width: `${(confidence.activity_count / 10) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            {confidence.activity_count}/10 activities for basic insights
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Insight Card - replaces correlation cards with actionable insights
 */
function InsightCard({ insight }) {
    // Map icon names to components
    const iconMap = {
        Calendar: Calendar,
        Sunrise: Sunrise,
        Sun: Sun,
        Moon: Moon,
        Trophy: Trophy,
        Award: Award,
        Flame: Flame
    };

    const Icon = iconMap[insight.icon] || Sparkles;

    // Color mapping for different insight types
    const colorMap = {
        indigo: 'from-indigo-500/20 to-purple-500/20 text-indigo-400',
        amber: 'from-amber-500/20 to-orange-500/20 text-amber-400',
        orange: 'from-orange-500/20 to-red-500/20 text-orange-400',
        violet: 'from-violet-500/20 to-purple-500/20 text-violet-400',
        emerald: 'from-emerald-500/20 to-teal-500/20 text-emerald-400',
        pink: 'from-pink-500/20 to-rose-500/20 text-pink-400',
        red: 'from-red-500/20 to-orange-500/20 text-red-400'
    };

    const colors = colorMap[insight.color] || colorMap.indigo;
    const [gradientColors, textColor] = colors.split(' text-');

    return (
        <div className="glass-card p-4 hover-lift">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientColors}`}>
                    <Icon className={`w-5 h-5 text-${textColor}`} />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-zinc-100">
                        {insight.title}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        {insight.subtitle}
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Productivity Heatmap Grid
 */
function ProductivityHeatmap({ data, peakTime }) {
    // Create a 7x24 grid
    const grid = useMemo(() => {
        const g = Array(7).fill(null).map(() => Array(24).fill({ intensity: 0, count: 0 }));

        if (data && data.length > 0) {
            data.forEach(cell => {
                if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
                    g[cell.day][cell.hour] = {
                        intensity: cell.intensity || 0,
                        count: cell.activity_count || 0,
                        avgImpact: cell.avg_impact || 0
                    };
                }
            });
        }

        return g;
    }, [data]);

    // Show ALL 24 hours to avoid misplaced activities
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
                        <Calendar className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-zinc-200">Productivity Heatmap</h3>
                        <p className="text-xs text-zinc-500">When are you most productive?</p>
                    </div>
                </div>
                {peakTime && (
                    <div className="text-right">
                        <p className="text-xs text-zinc-500">Peak Time</p>
                        <p className="text-sm font-medium text-indigo-400">
                            {peakTime.day} {formatHour(peakTime.hour)}
                        </p>
                    </div>
                )}
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    {/* Hour labels - 12-hour format */}
                    <div className="flex mb-2 pl-10">
                        {hours.filter((_, i) => i % 3 === 0).map(hour => (
                            <div key={hour} className="flex-1 text-center text-xs text-zinc-400 font-medium">
                                {formatHour(hour)}
                            </div>
                        ))}
                    </div>

                    {/* Grid rows */}
                    {DAY_NAMES.map((day, dayIndex) => (
                        <div key={day} className="flex items-center gap-1 mb-1">
                            <div className="w-8 text-xs text-zinc-500 text-right pr-2">{day}</div>
                            <div className="flex-1 flex gap-0.5">
                                {hours.map(hour => {
                                    const cell = grid[dayIndex]?.[hour] || { intensity: 0 };
                                    return (
                                        <div
                                            key={hour}
                                            className={`flex-1 h-7 rounded transition-all cursor-pointer
                                                      hover:ring-2 hover:ring-indigo-400/50 hover:scale-105 ${getHeatmapColor(cell.intensity)}`}
                                            title={`${day} ${formatHour(hour)} - ${cell.count || 0} activities`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-zinc-800">
                        <span className="text-xs text-zinc-500">Less Active</span>
                        <div className="flex gap-1">
                            {[0, 0.3, 0.5, 0.7, 0.9].map((intensity, i) => (
                                <div key={i} className={`w-5 h-5 rounded ${getHeatmapColor(intensity)}`} />
                            ))}
                        </div>
                        <span className="text-xs text-zinc-500">More Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Trend Chart
 */
function TrendChart({ data, trend, trendPercent }) {
    const chartData = useMemo(() => {
        if (!data?.daily_scores) return [];
        return data.daily_scores.map(d => ({
            date: d.date.split('-').slice(1).join('/'), // MM/DD format
            score: Math.round(d.score),
            activities: d.activity_count
        }));
    }, [data]);

    const getTrendIcon = () => {
        if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
        if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />;
        return <Minus className="w-4 h-4 text-zinc-400" />;
    };

    const getTrendColor = () => {
        if (trend === 'improving') return 'text-emerald-400';
        if (trend === 'declining') return 'text-red-400';
        return 'text-zinc-400';
    };

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                        <Activity className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-zinc-200">30-Day Trend</h3>
                        <p className="text-xs text-zinc-500">Your productivity over time</p>
                    </div>
                </div>
                {trend && trend !== 'insufficient_data' && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800/50`}>
                        {getTrendIcon()}
                        <span className={`text-sm font-medium ${getTrendColor()}`}>
                            {trend === 'stable' ? 'Stable' : `${trendPercent > 0 ? '+' : ''}${trendPercent}%`}
                        </span>
                    </div>
                )}
            </div>

            {chartData.length > 0 ? (
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <XAxis
                                dataKey="date"
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#71717a"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#27272a',
                                    border: '1px solid #3f3f46',
                                    borderRadius: '8px'
                                }}
                                labelStyle={{ color: '#a1a1aa' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: '#6366f1' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-48 flex items-center justify-center">
                    <p className="text-sm text-zinc-500">Need more data for trend analysis</p>
                </div>
            )}
        </div>
    );
}

/**
 * Export Button
 */
function ExportButton() {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportDataCSV();
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
                     bg-gradient-to-r from-indigo-500/20 to-purple-500/20
                     border border-indigo-500/30 text-indigo-400
                     hover:from-indigo-500/30 hover:to-purple-500/30
                     transition-all disabled:opacity-50"
        >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Download My Data'}
        </button>
    );
}

/**
 * Main Analytics Page
 */
export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const data = await getFullAnalytics();
                setAnalytics(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-zinc-800 rounded w-48" />
                <div className="h-64 bg-zinc-800 rounded-xl" />
                <div className="h-48 bg-zinc-800 rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-red-400">Failed to load analytics: {error}</p>
            </div>
        );
    }

    const { insights, heatmap, trends, confidence } = analytics || {};

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <BarChart3 className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-100">Deep Analytics</h1>
                        <p className="text-sm text-zinc-500">Discover patterns in your data</p>
                    </div>
                </div>
                <ExportButton />
            </div>

            {/* Confidence Banner */}
            <ConfidenceBanner confidence={confidence} />

            {/* Productivity Insights - replaces correlations */}
            {insights?.has_data && insights.insights.length > 0 && (
                <div>
                    <h2 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Your Productivity Insights
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {insights.insights.map((insight, i) => (
                            <InsightCard key={i} insight={insight} />
                        ))}
                    </div>
                </div>
            )}

            {/* Work Modes Clustering (Flow State Fingerprint) */}
            <WorkModesChart />

            {/* Heatmap */}
            {heatmap?.has_data && (
                <ProductivityHeatmap
                    data={heatmap.heatmap}
                    peakTime={heatmap.peak_time}
                />
            )}

            {/* Trend Chart */}
            {trends?.has_data && (
                <TrendChart
                    data={trends}
                    trend={trends.trend}
                    trendPercent={trends.trend_percent}
                />
            )}

            {/* Empty State */}
            {!insights?.has_data && !heatmap?.has_data && !trends?.has_data && (
                <div className="glass-card p-12 text-center">
                    <div className="inline-flex p-4 rounded-full bg-indigo-500/10 mb-4">
                        <BarChart3 className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-200 mb-2">
                        Your Analytics Dashboard
                    </h3>
                    <p className="text-zinc-500 max-w-md mx-auto">
                        Once you log more activities, this page will reveal patterns in your productivity—
                        like when you're most focused and which activities boost your performance.
                    </p>
                </div>
            )}
        </div>
    );
}
