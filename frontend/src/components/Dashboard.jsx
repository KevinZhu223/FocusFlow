/**
 * FocusFlow - Enhanced Dashboard
 * Phase 2: Includes Radar Chart, Energy Battery, Coach Insight, and Category Breakdown
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, Zap, Target } from 'lucide-react';
import ProductivityRadar from './ProductivityRadar';
import EnergyBattery from './EnergyBattery';
import CoachInsight from './CoachInsight';
import ActivityHeatmap from './ActivityHeatmap';

/**
 * Category colors for the pie chart
 */
const CATEGORY_COLORS = {
    Career: '#6366f1',  // Indigo
    Health: '#10b981',  // Emerald
    Leisure: '#8b5cf6', // Violet
    Chores: '#64748b',  // Slate
    Social: '#f59e0b'   // Amber
};

/**
 * Custom tooltip for the pie chart
 */
function CustomTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
                <p className="text-zinc-100 font-medium">{data.name}</p>
                <p className="text-zinc-400 text-sm">
                    {data.minutes} minutes ({data.count} {data.count === 1 ? 'activity' : 'activities'})
                </p>
            </div>
        );
    }
    return null;
}

/**
 * Custom legend for the pie chart
 */
function CustomLegend({ payload }) {
    return (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-sm">
                    <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-zinc-400">{entry.value}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * Score Display Component
 */
function ScoreDisplay({ score, label, Icon }) {
    const isPositive = score > 0;
    const isNegative = score < 0;

    const getScoreColor = () => {
        if (isPositive) return 'text-emerald-400';
        if (isNegative) return 'text-red-400';
        return 'text-zinc-400';
    };

    const getIconColor = () => {
        if (isPositive) return 'text-emerald-500';
        if (isNegative) return 'text-red-500';
        return 'text-zinc-500';
    };

    const ScoreIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

    // Format score to 1 decimal for weighted scores
    const displayScore = typeof score === 'number' ?
        (Number.isInteger(score) ? score : score.toFixed(1)) : score;

    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${getIconColor()}`} />
                <span className="text-sm text-zinc-400">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={`text-3xl font-bold ${getScoreColor()}`}>
                    {score > 0 ? '+' : ''}{displayScore}
                </span>
                <ScoreIcon className={`w-5 h-5 ${getScoreColor()}`} />
            </div>
        </div>
    );
}

/**
 * Stat Card Component
 */
function StatCard({ value, label, Icon, color = 'indigo' }) {
    const colorClasses = {
        indigo: 'text-indigo-500',
        emerald: 'text-emerald-500',
        amber: 'text-amber-500'
    };

    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${colorClasses[color]}`} />
                <span className="text-sm text-zinc-400">{label}</span>
            </div>
            <span className="text-2xl font-bold text-zinc-100">
                {value}
            </span>
        </div>
    );
}

/**
 * Dashboard Component
 * Displays productivity score, visualizations, and category breakdown
 */
export default function Dashboard({ dashboardData, isLoading }) {
    // Prepare pie chart data
    const pieData = dashboardData?.category_breakdown
        ? Object.entries(dashboardData.category_breakdown).map(([category, data]) => ({
            name: category,
            value: data.minutes,
            minutes: data.minutes,
            count: data.count
        }))
        : [];

    const hasData = pieData.length > 0;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-medium text-zinc-200">
                    Dashboard
                </h2>
            </div>

            {/* Coach's Insight - Top priority */}
            <CoachInsight />

            {/* Energy Battery */}
            <EnergyBattery dashboardData={dashboardData} />

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-3">
                <ScoreDisplay
                    score={dashboardData?.daily_score || 0}
                    label="Daily Score"
                    Icon={Zap}
                />
                <StatCard
                    value={dashboardData?.activity_count || 0}
                    label="Activities"
                    Icon={Activity}
                    color="indigo"
                />
            </div>

            {/* Productivity Radar */}
            <ProductivityRadar dashboardData={dashboardData} />

            {/* Activity Heatmap */}
            <ActivityHeatmap />

            {/* Pie Chart - Category Breakdown */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-4">
                    Time by Category
                </h3>

                {hasData ? (
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={CATEGORY_COLORS[entry.name] || '#71717a'}
                                            stroke="transparent"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend content={<CustomLegend />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-32 flex items-center justify-center">
                        <p className="text-sm text-zinc-500 text-center">
                            No category data yet.<br />
                            Log some activities to see your breakdown.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
