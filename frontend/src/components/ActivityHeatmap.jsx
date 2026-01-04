/**
 * FocusFlow - Activity Heatmap
 * GitHub-style contribution heatmap for activity consistency
 */

import { useEffect, useState, useMemo } from 'react';
import { getHeatmapData } from '../api';

// Color scale based on productivity score
const COLOR_SCALE = [
    '#18181b', // 0 - Empty
    '#1e3a5f', // 1 - Low
    '#2563eb', // 2 - Medium-Low  
    '#6366f1', // 3 - Medium
    '#818cf8', // 4 - High
];

export default function ActivityHeatmap() {
    const [heatmapData, setHeatmapData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hoveredDay, setHoveredDay] = useState(null);

    useEffect(() => {
        async function fetchHeatmap() {
            try {
                const response = await getHeatmapData();
                setHeatmapData(response.data || []);
            } catch (err) {
                console.error('Failed to fetch heatmap:', err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHeatmap();
    }, []);

    // Generate all days for the current calendar year (Jan 1 - Dec 31)
    const { days, weeks, months } = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);  // Jan 1st
        const endDate = new Date(currentYear, 11, 31);  // Dec 31st
        const days = [];
        const dataMap = new Map(heatmapData.map(d => [d.date, d]));

        // Generate all days in the year
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const data = dataMap.get(dateStr);

            days.push({
                date: dateStr,
                dayOfWeek: currentDate.getDay(),
                count: data?.count || 0,
                score: data?.score || 0,
                dateObj: new Date(currentDate),
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Group into weeks (columns)
        const weeks = [];
        let currentWeek = [];

        // Pad first week with empty days
        const firstDayOfWeek = days[0].dayOfWeek;
        for (let i = 0; i < firstDayOfWeek; i++) {
            currentWeek.push(null);
        }

        for (const day of days) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // Add remaining days
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            weeks.push(currentWeek);
        }

        // Get month labels
        const months = [];
        let lastMonth = -1;
        weeks.forEach((week, weekIndex) => {
            const validDay = week.find(d => d !== null);
            if (validDay) {
                const month = validDay.dateObj.getMonth();
                if (month !== lastMonth) {
                    months.push({
                        month: validDay.dateObj.toLocaleDateString('en-US', { month: 'short' }),
                        weekIndex
                    });
                    lastMonth = month;
                }
            }
        });

        return { days, weeks, months };
    }, [heatmapData]);

    function getColor(score) {
        if (score === 0) return COLOR_SCALE[0];
        if (score < 5) return COLOR_SCALE[1];
        if (score < 15) return COLOR_SCALE[2];
        if (score < 30) return COLOR_SCALE[3];
        return COLOR_SCALE[4];
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    if (isLoading) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
                <h3 className="text-sm font-medium text-zinc-300 mb-4">Activity Heatmap</h3>
                <div className="h-28 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">Activity Heatmap</h3>

            {/* Month Labels */}
            <div className="relative h-4 mb-1 ml-6">
                {months.map((m, i) => (
                    <span
                        key={i}
                        className="absolute text-[10px] text-zinc-500"
                        style={{ left: `${(m.weekIndex / weeks.length) * 100}%` }}
                    >
                        {m.month}
                    </span>
                ))}
            </div>

            <div className="flex gap-1">
                {/* Day Labels */}
                <div className="flex flex-col gap-[2px] text-[10px] text-zinc-500 mr-1">
                    <span className="h-[10px]"></span>
                    <span className="h-[10px]">Mon</span>
                    <span className="h-[10px]"></span>
                    <span className="h-[10px]">Wed</span>
                    <span className="h-[10px]"></span>
                    <span className="h-[10px]">Fri</span>
                    <span className="h-[10px]"></span>
                </div>

                {/* Grid */}
                <div className="flex gap-[2px] overflow-x-auto">
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-[2px]">
                            {week.map((day, dayIndex) => (
                                <div
                                    key={dayIndex}
                                    className={`w-[10px] h-[10px] rounded-sm transition-all cursor-pointer
                            ${day ? 'hover:ring-1 hover:ring-zinc-400' : ''}`}
                                    style={{ backgroundColor: day ? getColor(day.score) : 'transparent' }}
                                    onMouseEnter={() => day && setHoveredDay(day)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip */}
            {hoveredDay && (
                <div className="mt-3 text-xs text-zinc-400 flex items-center gap-2">
                    <span>{formatDate(hoveredDay.date)}</span>
                    <span className="text-zinc-600">•</span>
                    <span>{hoveredDay.count} activities</span>
                    <span className="text-zinc-600">•</span>
                    <span>Score: {hoveredDay.score.toFixed(1)}</span>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-500">
                <span>Less</span>
                {COLOR_SCALE.map((color, i) => (
                    <div
                        key={i}
                        className="w-[10px] h-[10px] rounded-sm"
                        style={{ backgroundColor: color }}
                    />
                ))}
                <span>More</span>
            </div>
        </div>
    );
}
