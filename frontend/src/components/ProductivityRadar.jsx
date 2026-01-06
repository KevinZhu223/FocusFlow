/**
 * FocusFlow - Productivity Radar Chart
 * Visualizes balance across productivity categories
 */

import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

const CATEGORY_COLORS = {
    Career: '#6366f1',  // Indigo
    Health: '#10b981',  // Emerald
    Social: '#f59e0b',  // Amber
    Leisure: '#8b5cf6', // Violet
    Chores: '#64748b',  // Slate
};

export default function ProductivityRadar({ dashboardData }) {
    // Transform category breakdown into radar-compatible data
    const categoryBreakdown = dashboardData?.category_breakdown || {};

    // Calculate max minutes for normalization
    const allMinutes = Object.values(categoryBreakdown).map(c => c.minutes || 0);
    const maxMinutes = Math.max(...allMinutes, 60); // At least 60 min max

    const radarData = [
        { category: 'Career', value: normalize(categoryBreakdown.Career?.minutes, maxMinutes), fullMark: 100 },
        { category: 'Health', value: normalize(categoryBreakdown.Health?.minutes, maxMinutes), fullMark: 100 },
        { category: 'Social', value: normalize(categoryBreakdown.Social?.minutes, maxMinutes), fullMark: 100 },
        { category: 'Leisure', value: normalize(categoryBreakdown.Leisure?.minutes, maxMinutes), fullMark: 100 },
        { category: 'Chores', value: normalize(categoryBreakdown.Chores?.minutes, maxMinutes), fullMark: 100 },
    ];

    function normalize(value, max) {
        if (!value || max === 0) return 0;
        return Math.min(Math.round((value / max) * 100), 100);
    }

    // Check if there's any data
    const hasData = radarData.some(d => d.value > 0);

    if (!hasData) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Life Balance</h3>
                <div className="h-80 flex items-center justify-center text-zinc-600 text-sm">
                    No activity data yet
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Life Balance</h3>
            <div className="h-80" style={{ minHeight: '320px', minWidth: '0' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis
                            dataKey="category"
                            tick={{ fill: '#a1a1aa', fontSize: 11 }}
                            tickLine={false}
                        />
                        <Radar
                            name="Time Spent"
                            dataKey="value"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.4}
                            strokeWidth={2}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#18181b',
                                border: '1px solid #27272a',
                                borderRadius: '8px',
                                color: '#fafafa'
                            }}
                            formatter={(value) => [`${value}%`, 'Balance']}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
