/**
 * FocusFlow - History Page
 * Calendar view of past activities with day review modals
 * Phase 4
 */

import { useState, useEffect, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
    CalendarDays, X, Activity, TrendingUp, Clock,
    ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { getActivities, getDashboard } from '../api';

// Color thresholds for productivity scores
const getDateColor = (score) => {
    if (score === null || score === undefined) return 'grey';
    if (score >= 50) return 'green';  // High productivity
    if (score >= 20) return 'yellow'; // Medium
    if (score > 0) return 'orange';   // Low
    return 'red';  // Negative (unproductive)
};

// Category colors matching the app's design system
const CATEGORY_COLORS = {
    Career: { bg: '#6366f1', text: '#a5b4fc' },   // Indigo
    Health: { bg: '#10b981', text: '#6ee7b7' },   // Emerald
    Leisure: { bg: '#8b5cf6', text: '#c4b5fd' },  // Violet
    Chores: { bg: '#64748b', text: '#94a3b8' },   // Slate
    Social: { bg: '#f59e0b', text: '#fcd34d' }    // Amber
};

// Get hour range for display (e.g., "9 AM - 6 PM")
function getActiveHoursRange(activities) {
    if (!activities.length) return null;

    const hours = activities
        .filter(a => a.timestamp)
        .map(a => new Date(a.timestamp).getHours());

    if (!hours.length) return null;

    const minHour = Math.min(...hours);
    const maxHour = Math.max(...hours);

    const formatHour = (h) => {
        if (h === 0) return '12 AM';
        if (h < 12) return `${h} AM`;
        if (h === 12) return '12 PM';
        return `${h - 12} PM`;
    };

    return `${formatHour(minHour)} - ${formatHour(maxHour)}`;
}

// Build hourly breakdown for the timeline chart
function buildHourlyData(activities) {
    const hourlyData = Array(24).fill(null).map((_, hour) => ({
        hour,
        activities: [],
        totalMinutes: 0,
        categories: {}
    }));

    activities.forEach(activity => {
        if (!activity.timestamp) return;
        const hour = new Date(activity.timestamp).getHours();
        const duration = activity.duration_minutes || 30;
        const category = activity.category || 'Career';

        hourlyData[hour].activities.push(activity);
        hourlyData[hour].totalMinutes += duration;
        hourlyData[hour].categories[category] =
            (hourlyData[hour].categories[category] || 0) + duration;
    });

    return hourlyData;
}

// Build category breakdown
function buildCategoryBreakdown(activities) {
    const breakdown = {};
    let totalMinutes = 0;

    activities.forEach(activity => {
        const category = activity.category || 'Career';
        const duration = activity.duration_minutes || 30;

        if (!breakdown[category]) {
            breakdown[category] = { minutes: 0, count: 0, score: 0 };
        }
        breakdown[category].minutes += duration;
        breakdown[category].count += 1;
        breakdown[category].score += activity.productivity_score || 0;
        totalMinutes += duration;
    });

    // Calculate percentages
    Object.keys(breakdown).forEach(cat => {
        breakdown[cat].percentage = totalMinutes > 0
            ? Math.round((breakdown[cat].minutes / totalMinutes) * 100)
            : 0;
    });

    return { breakdown, totalMinutes };
}

// Activity Time Distribution Bar (simpler visualization that doesn't rely on timestamps)
function TimeDistributionBar({ activities }) {
    const { breakdown, totalMinutes } = useMemo(() =>
        buildCategoryBreakdown(activities), [activities]
    );

    const sortedCategories = Object.entries(breakdown)
        .sort((a, b) => b[1].minutes - a[1].minutes);

    if (sortedCategories.length === 0 || totalMinutes === 0) {
        return (
            <div className="h-8 bg-zinc-800/50 rounded-lg flex items-center justify-center text-xs text-zinc-500">
                No activity data
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Stacked horizontal bar */}
            <div className="h-10 bg-zinc-800 rounded-lg overflow-hidden flex">
                {sortedCategories.map(([category, data]) => (
                    <div
                        key={category}
                        className="h-full flex items-center justify-center text-xs font-medium transition-all hover:opacity-80 relative group"
                        style={{
                            width: `${data.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[category]?.bg || '#6366f1',
                            minWidth: data.percentage > 5 ? 'auto' : '8px'
                        }}
                    >
                        {data.percentage >= 15 && (
                            <span className="text-white/90 truncate px-1">
                                {category}
                            </span>
                        )}

                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2
                                      bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1
                                      opacity-0 group-hover:opacity-100 transition-opacity
                                      pointer-events-none whitespace-nowrap z-20 text-xs">
                            <div className="font-medium" style={{ color: CATEGORY_COLORS[category]?.text }}>
                                {category}
                            </div>
                            <div className="text-zinc-400">
                                {Math.floor(data.minutes / 60)}h {data.minutes % 60}m ({data.percentage}%)
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {sortedCategories.map(([category, data]) => (
                    <div key={category} className="flex items-center gap-1.5">
                        <div
                            className="w-2.5 h-2.5 rounded-sm"
                            style={{ backgroundColor: CATEGORY_COLORS[category]?.bg }}
                        />
                        <span className="text-zinc-400">{category}</span>
                        <span className="text-zinc-600">{data.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Category Breakdown Component (horizontal bars)
function CategoryBreakdown({ activities }) {
    const { breakdown, totalMinutes } = useMemo(() =>
        buildCategoryBreakdown(activities), [activities]
    );

    const sortedCategories = Object.entries(breakdown)
        .sort((a, b) => b[1].minutes - a[1].minutes);

    if (sortedCategories.length === 0) return null;

    return (
        <div className="space-y-3">
            {sortedCategories.map(([category, data]) => (
                <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: CATEGORY_COLORS[category]?.bg || '#6366f1' }}
                            />
                            <span className="text-zinc-300">{category}</span>
                        </div>
                        <div className="text-zinc-400">
                            {Math.floor(data.minutes / 60)}h {data.minutes % 60}m
                            <span className="text-zinc-600 ml-2">({data.percentage}%)</span>
                        </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${data.percentage}%`,
                                backgroundColor: CATEGORY_COLORS[category]?.bg || '#6366f1'
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Summary Statistics Grid
function SummaryStats({ activities, dailyScore }) {
    const stats = useMemo(() => {
        const totalMinutes = activities.reduce((sum, a) => sum + (a.duration_minutes || 30), 0);
        const focusSessions = activities.filter(a => a.is_focus_session).length;
        const productiveMinutes = activities
            .filter(a => a.productivity_score > 0)
            .reduce((sum, a) => sum + (a.duration_minutes || 30), 0);
        const leisureMinutes = activities
            .filter(a => a.category === 'Leisure')
            .reduce((sum, a) => sum + (a.duration_minutes || 30), 0);

        return {
            totalHours: (totalMinutes / 60).toFixed(1),
            focusSessions,
            productiveHours: (productiveMinutes / 60).toFixed(1),
            leisureHours: (leisureMinutes / 60).toFixed(1),
            activityCount: activities.length
        };
    }, [activities]);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-zinc-100">{stats.totalHours}</div>
                <div className="text-xs text-zinc-500">Hours Logged</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats.productiveHours}</div>
                <div className="text-xs text-zinc-500">Productive</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-violet-400">{stats.leisureHours}</div>
                <div className="text-xs text-zinc-500">Leisure</div>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-indigo-400">{stats.focusSessions}</div>
                <div className="text-xs text-zinc-500">Focus Sessions</div>
            </div>
        </div>
    );
}

function DayReviewModal({ date, activities, dailyScore, onClose }) {
    const [showAllActivities, setShowAllActivities] = useState(false);

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const totalHours = useMemo(() => {
        const total = activities.reduce((sum, a) => sum + (a.duration_minutes || 30), 0);
        return (total / 60).toFixed(1);
    }, [activities]);

    const activeHoursRange = useMemo(() => getActiveHoursRange(activities), [activities]);
    const displayedActivities = showAllActivities ? activities : activities.slice(0, 5);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-100">{formattedDate}</h2>
                        <p className="text-sm text-zinc-500 mt-1">
                            {activities.length} activities • {totalHours} hours
                            {activeHoursRange && ` • ${activeHoursRange}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto overflow-x-hidden max-h-[calc(90vh-100px)]">
                    {/* Daily Score Hero */}
                    <div className="p-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-800/30 to-zinc-900">
                        <div className="flex items-center gap-4">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold
                                          ${dailyScore >= 50 ? 'bg-emerald-500/20 text-emerald-400' :
                                    dailyScore >= 20 ? 'bg-yellow-500/20 text-yellow-400' :
                                        dailyScore > 0 ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-red-500/20 text-red-400'}`}>
                                {dailyScore != null && dailyScore !== 0
                                    ? (Math.abs(dailyScore) >= 10 ? dailyScore.toFixed(0) : dailyScore.toFixed(1))
                                    : '0'}
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-zinc-100">Daily Score</div>
                                <div className="text-sm text-zinc-500">
                                    {dailyScore >= 50 ? '🎉 Excellent day! You crushed it.' :
                                        dailyScore >= 20 ? '👍 Good progress today.' :
                                            dailyScore > 0 ? '📈 Room for improvement.' :
                                                '⚠️ Heavy on leisure today.'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {activities.length > 0 ? (
                        <>
                            {/* Summary Statistics */}
                            <div className="p-5 border-b border-zinc-800">
                                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Summary
                                </h3>
                                <SummaryStats activities={activities} dailyScore={dailyScore} />
                            </div>

                            {/* Time Distribution */}
                            <div className="p-5 border-b border-zinc-800">
                                <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Time Distribution
                                </h3>
                                <TimeDistributionBar activities={activities} />
                            </div>

                            {/* Activities List */}
                            <div className="p-5">
                                <h3 className="text-sm font-medium text-zinc-400 mb-3">
                                    Activities ({activities.length})
                                </h3>
                                <div className="space-y-2">
                                    {displayedActivities.map(activity => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
                                        >
                                            <div
                                                className="w-1 h-10 rounded-full"
                                                style={{ backgroundColor: CATEGORY_COLORS[activity.category]?.bg || '#6366f1' }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-zinc-200 truncate">
                                                    {activity.activity_name}
                                                </div>
                                                <div className="text-sm text-zinc-500 flex items-center gap-3 mt-0.5">
                                                    <span>{activity.category}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {activity.duration_minutes || 30}m
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`text-sm font-medium px-2 py-1 rounded-lg
                                                           ${activity.productivity_score >= 0 ?
                                                    'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-red-500/20 text-red-400'}`}>
                                                {activity.productivity_score >= 0 ? '+' : ''}{activity.productivity_score?.toFixed(1)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {activities.length > 5 && (
                                    <button
                                        onClick={() => setShowAllActivities(!showAllActivities)}
                                        className="w-full mt-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 
                                                 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
                                    >
                                        {showAllActivities
                                            ? 'Show Less'
                                            : `Show All ${activities.length} Activities`}
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-zinc-500">
                            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No activities logged this day</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function HistoryPage() {
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewDate, setViewDate] = useState(new Date());
    const [activityData, setActivityData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [modalActivities, setModalActivities] = useState([]);
    const [modalScore, setModalScore] = useState(0);

    useEffect(() => {
        fetchHeatmapData();
    }, []);

    const fetchHeatmapData = async () => {
        try {
            // Import and use the heatmap API that returns all historical data
            const { getHeatmapData } = await import('../api');
            const response = await getHeatmapData();
            const heatmapData = response.data || [];

            // Convert heatmap data to our format
            const byDate = {};
            heatmapData.forEach(day => {
                byDate[day.date] = {
                    activities: [], // Will be fetched on click
                    totalScore: day.score,
                    count: day.count
                };
            });

            setActivityData(byDate);
        } catch (err) {
            console.error('Failed to fetch heatmap data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateClick = async (date) => {
        const dateKey = date.toLocaleDateString('en-CA');
        const dayData = activityData[dateKey];

        setSelectedDate(date);
        setModalScore(dayData?.totalScore || 0);

        // Fetch activities for this specific date
        try {
            const response = await getActivities(dateKey);
            setModalActivities(response.activities || []);
        } catch (err) {
            console.error('Failed to fetch day activities:', err);
            setModalActivities([]);
        }
    };

    const getTileClassName = ({ date, view }) => {
        if (view !== 'month') return '';

        const dateKey = date.toLocaleDateString('en-CA');
        const dayData = activityData[dateKey];

        if (!dayData) return 'no-data';

        const color = getDateColor(dayData.totalScore);
        return `has-data score-${color}`;
    };

    const getTileContent = ({ date, view }) => {
        // Tile background already shows productivity color
        // No need for additional dots
        return null;
    };

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 
                              flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">History</h1>
                    <p className="text-sm text-zinc-500">Review your past activities and progress</p>
                </div>
            </div>

            {/* Legend - integrated as subtle bar */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500 px-1">
                <span className="text-zinc-400 font-medium">Productivity:</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-400/50 to-emerald-500/60" />
                    <span>High</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-yellow-400/50 to-yellow-500/60" />
                    <span>Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-orange-400/50 to-orange-500/60" />
                    <span>Low</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-gradient-to-br from-red-400/50 to-red-500/60" />
                    <span>Negative</span>
                </div>
            </div>

            {/* Calendar */}
            <div className="glass-card p-5">
                <Calendar
                    onChange={handleDateClick}
                    value={viewDate}
                    onActiveStartDateChange={({ activeStartDate }) => setViewDate(activeStartDate)}
                    tileClassName={getTileClassName}
                    tileContent={getTileContent}
                    prevLabel={<ChevronLeft className="w-5 h-5" />}
                    nextLabel={<ChevronRight className="w-5 h-5" />}
                    prev2Label={null}
                    next2Label={null}
                    className="focusflow-calendar"
                />
            </div>

            {/* Day Review Modal */}
            {selectedDate && (
                <DayReviewModal
                    date={selectedDate}
                    activities={modalActivities}
                    dailyScore={modalScore}
                    onClose={() => setSelectedDate(null)}
                />
            )}

            {/* Calendar Custom Styles */}
            <style>{`
                .focusflow-calendar {
                    width: 100%;
                    background: transparent;
                    border: none;
                    font-family: inherit;
                }
                
                .focusflow-calendar .react-calendar__navigation {
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                }
                
                .focusflow-calendar .react-calendar__navigation button {
                    color: #e4e4e7;
                    font-size: 1.1rem;
                    font-weight: 600;
                    background: transparent;
                    border-radius: 0.75rem;
                    padding: 0.5rem 1rem;
                    min-width: 44px;
                }
                
                .focusflow-calendar .react-calendar__navigation button:hover:not(:disabled) {
                    background: rgba(99, 102, 241, 0.2);
                }
                
                .focusflow-calendar .react-calendar__navigation button:disabled {
                    background: transparent;
                    color: #52525b;
                    cursor: not-allowed;
                }
                
                .focusflow-calendar .react-calendar__month-view__weekdays {
                    color: #71717a;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 0.7rem;
                    letter-spacing: 0.05em;
                    margin-bottom: 0.5rem;
                }
                
                .focusflow-calendar .react-calendar__month-view__weekdays abbr {
                    text-decoration: none;
                }
                
                .focusflow-calendar .react-calendar__month-view__days {
                    display: grid !important;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 6px;
                }
                
                .focusflow-calendar .react-calendar__tile {
                    color: #71717a;
                    background: rgba(24, 24, 27, 0.6);
                    border: 1px solid rgba(39, 39, 42, 0.5);
                    padding: 0;
                    border-radius: 0.5rem;
                    position: relative;
                    aspect-ratio: 1.2;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    max-width: none !important;
                    flex-basis: auto !important;
                    transition: all 0.15s ease;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                
                .focusflow-calendar .react-calendar__tile:hover:not(:disabled) {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(99, 102, 241, 0.4);
                    transform: translateY(-2px);
                    z-index: 5;
                }
                
                .focusflow-calendar .react-calendar__tile:disabled {
                    color: #3f3f46;
                    cursor: not-allowed;
                }
                
                /* Neighboring month days */
                .focusflow-calendar .react-calendar__month-view__days__day--neighboringMonth {
                    color: #3f3f46;
                    opacity: 0.5;
                }
                
                /* Current day */
                .focusflow-calendar .react-calendar__tile--now {
                    font-weight: 700;
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    color: #a5b4fc !important;
                }
                
                /* Productivity score colors */
                .focusflow-calendar .react-calendar__tile.score-green {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.5)) !important;
                    border-color: rgba(16, 185, 129, 0.4) !important;
                    color: #6ee7b7 !important;
                }
                
                .focusflow-calendar .react-calendar__tile.score-green:hover {
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(16, 185, 129, 0.6)) !important;
                }
                
                .focusflow-calendar .react-calendar__tile.score-yellow {
                    background: linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(234, 179, 8, 0.4)) !important;
                    border-color: rgba(234, 179, 8, 0.4) !important;
                    color: #fde047 !important;
                }
                
                .focusflow-calendar .react-calendar__tile.score-yellow:hover {
                    background: linear-gradient(135deg, rgba(234, 179, 8, 0.35), rgba(234, 179, 8, 0.5)) !important;
                }
                
                .focusflow-calendar .react-calendar__tile.score-orange {
                    background: linear-gradient(135deg, rgba(249, 115, 22, 0.25), rgba(249, 115, 22, 0.4)) !important;
                    border-color: rgba(249, 115, 22, 0.4) !important;
                    color: #fdba74 !important;
                }
                
                .focusflow-calendar .react-calendar__tile.score-orange:hover {
                    background: linear-gradient(135deg, rgba(249, 115, 22, 0.35), rgba(249, 115, 22, 0.5)) !important;
                }
                
                .focusflow-calendar .react-calendar__tile.score-red {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.4)) !important;
                    border-color: rgba(239, 68, 68, 0.4) !important;
                    color: #fca5a5 !important;
                }
                
                .focusflow-calendar .react-calendar__tile.score-red:hover {
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.35), rgba(239, 68, 68, 0.5)) !important;
                }
                
                .focusflow-calendar .react-calendar__tile.no-data {
                    color: #52525b;
                }
                
                /* Year view - month picker styling */
                .focusflow-calendar .react-calendar__year-view,
                .focusflow-calendar .react-calendar__decade-view,
                .focusflow-calendar .react-calendar__century-view {
                    padding: 1rem 0;
                }
                
                .focusflow-calendar .react-calendar__year-view__months,
                .focusflow-calendar .react-calendar__decade-view__years,
                .focusflow-calendar .react-calendar__century-view__decades {
                    display: grid !important;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                }
                
                .focusflow-calendar .react-calendar__year-view .react-calendar__tile,
                .focusflow-calendar .react-calendar__decade-view .react-calendar__tile,
                .focusflow-calendar .react-calendar__century-view .react-calendar__tile {
                    background: rgba(39, 39, 42, 0.5);
                    border: 1px solid rgba(63, 63, 70, 0.5);
                    border-radius: 0.75rem;
                    padding: 1rem;
                    color: #a1a1aa;
                    font-weight: 500;
                    aspect-ratio: auto;
                    transition: all 0.15s ease;
                }
                
                .focusflow-calendar .react-calendar__year-view .react-calendar__tile:hover:not(:disabled),
                .focusflow-calendar .react-calendar__decade-view .react-calendar__tile:hover:not(:disabled),
                .focusflow-calendar .react-calendar__century-view .react-calendar__tile:hover:not(:disabled) {
                    background: rgba(99, 102, 241, 0.2);
                    border-color: rgba(99, 102, 241, 0.4);
                    color: #e4e4e7;
                    transform: translateY(-2px);
                }
                
                .focusflow-calendar .react-calendar__year-view .react-calendar__tile--now,
                .focusflow-calendar .react-calendar__decade-view .react-calendar__tile--now,
                .focusflow-calendar .react-calendar__century-view .react-calendar__tile--now {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(99, 102, 241, 0.4);
                    color: #a5b4fc;
                    font-weight: 600;
                }
                
                /* Remove purple highlight from active tiles - let productivity colors show */
                .focusflow-calendar .react-calendar__tile--active {
                    box-shadow: none !important;
                }
                
                .focusflow-calendar .react-calendar__year-view .react-calendar__tile--active,
                .focusflow-calendar .react-calendar__decade-view .react-calendar__tile--active,
                .focusflow-calendar .react-calendar__century-view .react-calendar__tile--active {
                    background: rgba(99, 102, 241, 0.25) !important;
                    border-color: rgba(99, 102, 241, 0.5) !important;
                    color: #c7d2fe !important;
                }
            `}</style>
        </div>
    );
}
