/**
 * FocusFlow - Work Modes Chart
 * Phase 9: Flow State Fingerprinting Visualization
 * 
 * Displays K-Means clustering results as a scatter plot with insights panel
 */

import { useState, useEffect } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
    ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Brain, Zap, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import { getWorkModes } from '../api';

// Icon mapping for different work modes
const MODE_ICONS = {
    deep_focus: Brain,
    quick_wins: Zap,
    burnout_zone: AlertTriangle,
    distracted: Target
};

/**
 * Custom tooltip for scatter plot
 */
function CustomTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 shadow-xl">
                <p className="text-sm font-medium text-zinc-100 mb-1">
                    {data.activity}
                </p>
                <div className="space-y-1 text-xs">
                    <p className="text-zinc-400">
                        Duration: <span className="text-zinc-200">{data.duration} min</span>
                    </p>
                    <p className="text-zinc-400">
                        Impact: <span className="text-zinc-200">{data.score}/10</span>
                    </p>
                    <p className="text-zinc-400">
                        Category: <span className="text-zinc-200">{data.category}</span>
                    </p>
                    <p
                        className="font-medium mt-1"
                        style={{ color: data.cluster_color }}
                    >
                        {data.cluster_name}
                    </p>
                </div>
            </div>
        );
    }
    return null;
}

/**
 * Insight Panel Component
 */
function InsightPanel({ insight, clusters }) {
    if (!insight) return null;

    const Icon = MODE_ICONS[insight.dominant_key] || Brain;

    // Dynamic colors based on mode type
    const modeColors = {
        deep_focus: { bg: 'from-purple-500/20 to-indigo-500/20', icon: 'text-purple-400' },
        quick_wins: { bg: 'from-green-500/20 to-emerald-500/20', icon: 'text-green-400' },
        burnout_zone: { bg: 'from-orange-500/20 to-amber-500/20', icon: 'text-orange-400' },
        distracted: { bg: 'from-zinc-500/20 to-slate-500/20', icon: 'text-zinc-400' }
    };

    const colors = modeColors[insight.dominant_key] || modeColors.deep_focus;

    // Handle action button click
    const handleActionClick = () => {
        // Show a helpful tip based on the dominant mode
        const tips = {
            deep_focus: "Keep doing what you're doing! Consider blocking your peak hours on your calendar.",
            quick_wins: "Great for momentum! Try batching similar quick tasks together.",
            burnout_zone: "Try the Pomodoro Technique: 25 min work + 5 min break. It helps break up long, draining sessions.",
            distracted: "Consider using website blockers or putting your phone in another room during focus time."
        };
        alert(`💡 Tip: ${tips[insight.dominant_key] || insight.action}`);
    };

    return (
        <div className="space-y-4">
            {/* Primary Pattern */}
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colors.bg}`}>
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide">Your Primary Pattern</p>
                    <p className="text-lg font-bold text-zinc-100">{insight.dominant_mode}</p>
                </div>
            </div>

            {/* Insight Message */}
            <p className="text-sm text-zinc-300 leading-relaxed">
                {insight.message}
            </p>

            {/* Action Button */}
            <button
                onClick={handleActionClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                         bg-gradient-to-r from-indigo-600 to-purple-600 
                         hover:from-indigo-500 hover:to-purple-500
                         rounded-xl text-sm font-medium text-white
                         transition-all shadow-lg shadow-indigo-500/20 cursor-pointer">
                <TrendingUp className="w-4 h-4" />
                Get Improvement Tips
            </button>

            {/* Cluster Breakdown */}
            <div className="pt-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-2">Mode Distribution</p>
                <div className="space-y-2">
                    {clusters?.map((cluster, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: cluster.color }}
                                />
                                <span className="text-xs text-zinc-400">{cluster.name}</span>
                            </div>
                            <span className="text-xs text-zinc-300 font-medium">
                                {cluster.percentage}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/**
 * Main Work Modes Chart Component
 */
export default function WorkModesChart() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const result = await getWorkModes();
                setData(result);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-zinc-800 rounded w-48 mb-4" />
                <div className="h-64 bg-zinc-800 rounded" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card p-6 text-center">
                <p className="text-red-400">Failed to load Work Modes: {error}</p>
            </div>
        );
    }

    if (!data?.has_data) {
        return (
            <div className="glass-card p-6 text-center">
                <div className="inline-flex p-4 rounded-full bg-indigo-500/10 mb-4">
                    <Brain className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium text-zinc-200 mb-2">
                    Work Mode Analysis
                </h3>
                <p className="text-zinc-500 max-w-md mx-auto">
                    {data?.message || 'Log more activities with duration to unlock Flow State Fingerprinting.'}
                </p>
            </div>
        );
    }

    return (
        <div className="glass-card p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-sm font-medium text-zinc-200">
                        Work Session Analysis
                    </h3>
                    <p className="text-xs text-zinc-500">
                        {data.total_activities} productive activities • Longer duration + Higher score = Better
                    </p>
                </div>
            </div>

            {/* Main Content - Chart + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scatter Chart */}
                <div className="lg:col-span-2 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                            <XAxis
                                type="number"
                                dataKey="duration"
                                name="Duration"
                                unit=" min"
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                type="number"
                                dataKey="score"
                                name="Impact"
                                domain={[0, 10]}
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <ZAxis range={[60, 200]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Scatter
                                data={data.chart_data}
                                shape="circle"
                            >
                                {data.chart_data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.cluster_color}
                                        fillOpacity={0.7}
                                        stroke={entry.cluster_color}
                                        strokeWidth={1}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>

                    {/* Axis Labels */}
                    <div className="flex justify-between px-10 -mt-2">
                        <span className="text-xs text-zinc-500">Time Spent →</span>
                        <span className="text-xs text-zinc-500 -rotate-90 origin-center absolute left-4 top-1/2">
                            Impact ↑
                        </span>
                    </div>
                </div>

                {/* Insights Panel */}
                <div className="lg:col-span-1">
                    <InsightPanel
                        insight={data.insight}
                        clusters={data.clusters}
                    />
                </div>
            </div>
        </div>
    );
}
