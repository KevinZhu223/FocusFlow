import { Clock, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Category color mapping
 */
const CATEGORY_COLORS = {
    Career: {
        border: 'border-l-emerald-500',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300'
    },
    Health: {
        border: 'border-l-blue-500',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-300'
    },
    Leisure: {
        border: 'border-l-orange-500',
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        badge: 'bg-orange-500/20 text-orange-300'
    },
    Chores: {
        border: 'border-l-purple-500',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        badge: 'bg-purple-500/20 text-purple-300'
    },
    Social: {
        border: 'border-l-pink-500',
        bg: 'bg-pink-500/10',
        text: 'text-pink-400',
        badge: 'bg-pink-500/20 text-pink-300'
    }
};

/**
 * Format duration in minutes to a readable string
 */
function formatDuration(minutes) {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format timestamp to a readable time (handles UTC from backend)
 */
function formatTime(timestamp) {
    // Append 'Z' to treat as UTC if not already present
    const utcTimestamp = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(utcTimestamp);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Get productivity score icon and color
 */
function getScoreIndicator(score) {
    if (score > 0) {
        return {
            Icon: TrendingUp,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10'
        };
    } else if (score < 0) {
        return {
            Icon: TrendingDown,
            color: 'text-red-400',
            bgColor: 'bg-red-500/10'
        };
    }
    return {
        Icon: Minus,
        color: 'text-zinc-400',
        bgColor: 'bg-zinc-500/10'
    };
}

/**
 * ActivityCard Component
 * Displays a single activity with category color-coding and details
 */
export default function ActivityCard({ activity, onDelete }) {
    const colors = CATEGORY_COLORS[activity.category] || CATEGORY_COLORS.Career;
    const scoreIndicator = getScoreIndicator(activity.productivity_score);
    const ScoreIcon = scoreIndicator.Icon;

    return (
        <div
            className={`group relative rounded-lg border-l-4 ${colors.border} 
                bg-zinc-900/50 hover:bg-zinc-900/80 
                border border-zinc-800/50 hover:border-zinc-700/50
                transition-all duration-200 animate-fade-in`}
        >
            <div className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Activity Name */}
                        <h3 className="text-zinc-100 font-medium truncate">
                            {activity.activity_name}
                        </h3>

                        {/* Raw input (subtle) */}
                        <p className="text-sm text-zinc-500 truncate mt-0.5">
                            "{activity.raw_input}"
                        </p>
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={() => onDelete(activity.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md
                     text-zinc-500 hover:text-red-400 hover:bg-red-500/10
                     transition-all duration-200"
                        aria-label="Delete activity"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Details Row */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {/* Category Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${colors.badge}`}>
                        {activity.category}
                    </span>

                    {/* Duration */}
                    {activity.duration_minutes && (
                        <div className="flex items-center gap-1 text-zinc-400 text-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDuration(activity.duration_minutes)}</span>
                        </div>
                    )}

                    {/* Time */}
                    <span className="text-zinc-500 text-sm">
                        {formatTime(activity.timestamp)}
                    </span>

                    {/* Score */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md 
                        ${scoreIndicator.bgColor} ml-auto`}>
                        <ScoreIcon className={`w-3.5 h-3.5 ${scoreIndicator.color}`} />
                        <span className={`text-sm font-medium ${scoreIndicator.color}`}>
                            {activity.productivity_score > 0 ? '+' : ''}{activity.productivity_score}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
