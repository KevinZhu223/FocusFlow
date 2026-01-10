import { useState } from 'react';
import { Clock, Trash2, TrendingUp, TrendingDown, Minus, Pencil, Check, X } from 'lucide-react';

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

const CATEGORIES = ['Career', 'Health', 'Leisure', 'Chores', 'Social'];

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
 * Now supports inline editing
 */
export default function ActivityCard({ activity, onDelete, onEdit }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(activity.activity_name);
    const [editDuration, setEditDuration] = useState(activity.duration_minutes || 30);
    const [editCategory, setEditCategory] = useState(activity.category);
    const [isSaving, setIsSaving] = useState(false);

    const colors = CATEGORY_COLORS[isEditing ? editCategory : activity.category] || CATEGORY_COLORS.Career;
    const scoreIndicator = getScoreIndicator(activity.productivity_score);
    const ScoreIcon = scoreIndicator.Icon;

    const handleStartEdit = () => {
        setEditName(activity.activity_name);
        setEditDuration(activity.duration_minutes || 30);
        setEditCategory(activity.category);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditName(activity.activity_name);
        setEditDuration(activity.duration_minutes || 30);
        setEditCategory(activity.category);
    };

    const handleSaveEdit = async () => {
        if (!editName.trim() || isSaving) return;

        setIsSaving(true);
        try {
            await onEdit(activity.id, {
                activity_name: editName.trim(),
                duration_minutes: parseInt(editDuration) || 30,
                category: editCategory
            });
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update activity:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

    // Edit mode UI
    if (isEditing) {
        return (
            <div
                className={`group relative rounded-lg border-l-4 ${colors.border} 
                    bg-zinc-900/80 border border-indigo-500/50 ring-2 ring-indigo-500/20
                    transition-all duration-200`}
            >
                <div className="p-4 space-y-3">
                    {/* Activity Name Input */}
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg
                                 text-zinc-100 placeholder-zinc-500 focus:outline-none 
                                 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                        placeholder="Activity name"
                        autoFocus
                    />

                    {/* Duration and Category Row */}
                    <div className="flex items-center gap-3">
                        {/* Duration */}
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-zinc-500" />
                            <input
                                type="number"
                                value={editDuration}
                                onChange={(e) => setEditDuration(e.target.value)}
                                onKeyDown={handleKeyDown}
                                min="1"
                                max="1440"
                                className="w-20 px-2 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg
                                         text-zinc-100 text-sm focus:outline-none 
                                         focus:border-indigo-500/50 text-center"
                            />
                            <span className="text-sm text-zinc-500">min</span>
                        </div>

                        {/* Category Dropdown */}
                        <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg
                                     text-zinc-100 text-sm focus:outline-none focus:border-indigo-500/50
                                     cursor-pointer"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 ml-auto">
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSaving || !editName.trim()}
                                className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-400 
                                         hover:bg-emerald-500/30 disabled:opacity-50 
                                         disabled:cursor-not-allowed transition-colors"
                                aria-label="Save changes"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 
                                         hover:bg-red-500/10 transition-colors"
                                aria-label="Cancel edit"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Normal display mode
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

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Edit Button */}
                        {onEdit && (
                            <button
                                onClick={handleStartEdit}
                                className="p-1.5 rounded-md text-zinc-500 hover:text-indigo-400 
                                         hover:bg-indigo-500/10 transition-all duration-200"
                                aria-label="Edit activity"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}

                        {/* Delete Button */}
                        <button
                            onClick={() => onDelete(activity.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 
                                     hover:bg-red-500/10 transition-all duration-200"
                            aria-label="Delete activity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
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
