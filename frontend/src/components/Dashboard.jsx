/**
 * FocusFlow - Enhanced Dashboard
 * Phase 2: Includes Radar Chart, Energy Battery, Coach Insight, and Category Breakdown
 * Phase 6: Compact loot button, CorrelationCard, refined layout
 */

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, Zap, Target, Gift, Key } from 'lucide-react';
import ProductivityRadar from './ProductivityRadar';
import EnergyBattery from './EnergyBattery';
import CoachInsight from './CoachInsight';
import LootButton from './LootButton';
import CorrelationCard from './CorrelationCard';
import ProjectionCard from './ProjectionCard';
import { useAuth } from '../contexts/AuthContext';

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
 * Score Display Component - Hero Card with Glassmorphism
 */
function ScoreDisplay({ score, label, Icon, showLootButton = false }) {
    const { user } = useAuth();
    const [showLoot, setShowLoot] = useState(false);

    const isPositive = score > 0;
    const isNegative = score < 0;
    const credits = user?.chest_credits || 0;

    // Format score to 1 decimal for weighted scores
    const displayScore = typeof score === 'number' ?
        (Number.isInteger(score) ? score : score.toFixed(1)) : score;

    return (
        <>
            <div className="glass-card p-5 relative overflow-hidden col-span-2">
                {/* Subtle gradient background glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                                <Icon className="w-5 h-5 text-indigo-400" />
                            </div>
                            <span className="text-sm font-medium text-zinc-400 tracking-wide">{label}</span>
                        </div>

                        {/* Compact Loot Button */}
                        {showLootButton && (
                            <button
                                onClick={() => setShowLoot(true)}
                                className={`relative p-2.5 rounded-xl transition-all hover-lift
                                          ${credits > 0
                                        ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 glow-amber'
                                        : 'bg-zinc-800/50 text-zinc-500 hover:bg-zinc-700/50'}`}
                                title={credits > 0 ? `Open Chest (${credits} keys)` : 'No keys available'}
                            >
                                <Gift className="w-5 h-5" />
                                {credits > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full 
                                                   bg-gradient-to-br from-amber-400 to-orange-500
                                                   flex items-center justify-center text-xs text-black font-bold
                                                   shadow-lg">
                                        {credits}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-bold tracking-tight
                                        ${isPositive ? 'gradient-text' : isNegative ? 'text-red-400' : 'text-zinc-400'}`}>
                            {score > 0 ? '+' : ''}{displayScore}
                        </span>
                        <span className="text-lg text-zinc-500 font-medium">pts</span>
                    </div>
                </div>
            </div>

            {/* Loot Modal */}
            {showLoot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    onClick={() => setShowLoot(false)}>
                    <div onClick={e => e.stopPropagation()}>
                        <LootButton embedded onClose={() => setShowLoot(false)} />
                    </div>
                </div>
            )}
        </>
    );
}

/**
 * Stat Card Component - Glass styling
 */
function StatCard({ value, label, Icon, color = 'indigo' }) {
    const gradientClasses = {
        indigo: 'from-indigo-500/20 to-blue-500/20',
        emerald: 'from-emerald-500/20 to-teal-500/20',
        amber: 'from-amber-500/20 to-orange-500/20'
    };

    const iconClasses = {
        indigo: 'text-indigo-400',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400'
    };

    return (
        <div className="glass-card p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradientClasses[color]}`}>
                    <Icon className={`w-4 h-4 ${iconClasses[color]}`} />
                </div>
                <span className="text-sm text-zinc-400 tracking-wide">{label}</span>
            </div>
            <span className="text-2xl font-bold text-zinc-100">
                {value}
            </span>
        </div>
    );
}

/**
 * Dashboard Component - Bento Grid Layout
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
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                    <Target className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-200 tracking-tight">
                    Dashboard
                </h2>
            </div>

            {/* Coach's Insight */}
            <CoachInsight />

            {/* Time Projection - Shock Analytics (key forces refresh on activity change) */}
            <ProjectionCard key={dashboardData?.activity_count || 0} />

            {/* Energy Battery */}
            <EnergyBattery dashboardData={dashboardData} />

            {/* Score Cards - 2 column layout */}
            <div className="grid grid-cols-3 gap-3">
                <ScoreDisplay
                    score={dashboardData?.daily_score || 0}
                    label="Daily Score"
                    Icon={Zap}
                    showLootButton={true}
                />
                <StatCard
                    value={dashboardData?.activity_count || 0}
                    label="Activities"
                    Icon={Activity}
                    color="indigo"
                />
            </div>

            {/* Productivity Radar - Glass wrapped */}
            <div className="glass-card p-4">
                <ProductivityRadar dashboardData={dashboardData} />
            </div>

            {/* Pie Chart - Category Breakdown */}
            <div className="glass-card p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-4 tracking-wide">
                    Time by Category
                </h3>

                {hasData ? (
                    <div className="h-48" style={{ minHeight: '192px', minWidth: '0' }}>
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

            {/* Correlation Card - Data Science Insight */}
            <CorrelationCard />
        </div>
    );
}
