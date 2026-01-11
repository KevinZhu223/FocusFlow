/**
 * FocusFlow - Enhanced Dashboard
 * Phase 2: Includes Radar Chart, Energy Battery, Coach Insight, and Category Breakdown
 * Phase 6: Compact loot button, CorrelationCard, refined layout
 * Phase 8: Oracle insight navigation
 */

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, Zap, Target, Gift, Key, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductivityRadar from './ProductivityRadar';
import EnergyBattery from './EnergyBattery';
import CoachInsight from './CoachInsight';
import LootButton from './LootButton';
import CorrelationCard from './CorrelationCard';
import ProjectionCard from './ProjectionCard';
import OracleCard from './OracleCard';
import { useAuth } from '../contexts/AuthContext';
import { getAllOracleInsights } from '../api';

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
 * Streak Widget - Shows current activity streak with flame animation
 */
function StreakWidget({ streak }) {
    const currentStreak = streak?.current_streak || 0;
    const longestStreak = streak?.longest_streak || 0;
    const streakActive = streak?.streak_active || false;

    return (
        <div className={`glass-card p-4 transition-all ${streakActive ? 'border-orange-500/30' : ''}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                  ${currentStreak > 0
                            ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20'
                            : 'bg-zinc-800/50'}`}>
                        <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-orange-400' : 'text-zinc-600'}
                                        ${streakActive ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-bold ${currentStreak > 0 ? 'text-orange-400' : 'text-zinc-500'}`}>
                                {currentStreak}
                            </span>
                            <span className="text-sm text-zinc-500">day streak</span>
                        </div>
                        {longestStreak > currentStreak && (
                            <p className="text-xs text-zinc-600 mt-0.5">
                                Best: {longestStreak} days
                            </p>
                        )}
                    </div>
                </div>
                {currentStreak >= 7 && (
                    <span className="text-2xl">🔥</span>
                )}
                {currentStreak >= 30 && (
                    <span className="text-2xl">⭐</span>
                )}
            </div>
            {!streakActive && currentStreak === 0 && (
                <p className="text-xs text-zinc-600 mt-2">
                    Log an activity to start your streak!
                </p>
            )}
        </div>
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
    // Oracle insight state with navigation
    const [oracleInsights, setOracleInsights] = useState([]);
    const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
    const [oracleLoading, setOracleLoading] = useState(true);

    // Fetch all oracle insights on mount and when activities change
    useEffect(() => {
        const fetchOracle = async () => {
            try {
                setOracleLoading(true);
                const data = await getAllOracleInsights();
                const insights = data.insights || [];
                setOracleInsights(insights);
                setCurrentInsightIndex(0);
            } catch (err) {
                console.error('Failed to fetch oracle insights:', err);
            } finally {
                setOracleLoading(false);
            }
        };
        fetchOracle();
    }, [dashboardData?.activity_count]); // Refresh when activity count changes

    // Navigation handlers for Oracle
    const nextInsight = () => {
        setCurrentInsightIndex((prev) =>
            prev < oracleInsights.length - 1 ? prev + 1 : 0
        );
    };

    const prevInsight = () => {
        setCurrentInsightIndex((prev) =>
            prev > 0 ? prev - 1 : oracleInsights.length - 1
        );
    };

    // Current insight with navigation info
    const currentInsight = oracleInsights.length > 0
        ? {
            ...oracleInsights[currentInsightIndex],
            insight_index: currentInsightIndex + 1,
            total_insights: oracleInsights.length
        }
        : null;

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

            {/* The Oracle - AI Analytics with Navigation */}
            <div className="relative">
                <OracleCard insight={currentInsight} isLoading={oracleLoading} />

                {/* Navigation Arrows - show when multiple insights */}
                {oracleInsights.length > 1 && !oracleLoading && (
                    <>
                        <button
                            onClick={prevInsight}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                                     bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200
                                     transition-all shadow-lg backdrop-blur-sm z-10"
                            title="Previous insight"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={nextInsight}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                                     bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200
                                     transition-all shadow-lg backdrop-blur-sm z-10"
                            title="Next insight"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Coach's Insight */}
            <CoachInsight />

            {/* Time Projection - Shock Analytics (key forces refresh on activity change) */}
            <ProjectionCard key={dashboardData?.activity_count || 0} />

            {/* Energy Battery */}
            <EnergyBattery dashboardData={dashboardData} />

            {/* Streak Widget */}
            <StreakWidget streak={dashboardData?.streak} />

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
