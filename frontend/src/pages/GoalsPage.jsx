/**
 * FocusFlow - Goals Page
 * Set and track weekly/monthly productivity goals with custom titles
 */

import { useState, useEffect } from 'react';
import {
    Target, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle, Loader2,
    Briefcase, Dumbbell, Users, Home, Gamepad2
} from 'lucide-react';
import { getGoals, createGoal, deleteGoal } from '../api';

const TIMEFRAMES = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
];

const GOAL_TYPES = [
    { value: 'target', label: 'Target', description: 'Achieve at least' },
    { value: 'limit', label: 'Limit', description: 'Stay under' }
];

const CATEGORY_ICONS = {
    Career: Briefcase,
    Health: Dumbbell,
    Social: Users,
    Chores: Home,
    Leisure: Gamepad2
};

const STATUS_STYLES = {
    complete: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', icon: CheckCircle, label: 'Complete' },
    on_track: { bg: 'bg-lime-500/20', border: 'border-lime-500/50', text: 'text-lime-400', icon: TrendingUp, label: 'On Track' },
    slightly_behind: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', icon: AlertTriangle, label: 'Caution' },
    not_started: { bg: 'bg-zinc-500/20', border: 'border-zinc-500/50', text: 'text-zinc-400', icon: Target, label: 'Not Started' },
    at_risk: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: AlertTriangle, label: 'At Risk' },
    behind: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: AlertTriangle, label: 'Behind' },
    over_limit: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: AlertTriangle, label: 'Over Limit' }
};

function GoalCard({ goal, onDelete }) {
    const status = STATUS_STYLES[goal.status] || STATUS_STYLES.behind;
    const StatusIcon = status.icon;
    const CategoryIcon = CATEGORY_ICONS[goal.category] || Target;

    // Use title if available, otherwise category
    const displayTitle = goal.title || goal.category;

    // Calculate expected target position for marker
    const expectedPercent = goal.expected_percent || 0;

    return (
        <div className="glass-card p-4 relative overflow-hidden group">
            {/* Status accent - left border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.bg.replace('/20', '/70')}`} />

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 rounded-lg ${status.bg} 
                                       flex items-center justify-center shrink-0`}>
                            <CategoryIcon className={`w-4 h-4 ${status.text}`} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-zinc-100 truncate">{displayTitle}</h3>
                            <p className="text-sm text-zinc-400">
                                {goal.title ? goal.category : ''} {goal.timeframe}
                                {goal.days_passed && goal.total_days && (
                                    <span className="ml-2 text-zinc-500">
                                        (Day {goal.days_passed}/{goal.total_days})
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onDelete(goal.id)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 
                                 transition-all shrink-0 ml-2 opacity-50 hover:opacity-100"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar with expected marker */}
                <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">{goal.hours_logged}h / {goal.target_value}h</span>
                        <span className={status.text}>{Math.min(100, goal.progress_percent)}%</span>
                    </div>
                    <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                        {/* Progress bar with status color */}
                        <div
                            className={`h-full transition-all duration-500 ${status.bg.replace('/20', '')}`}
                            style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
                        />

                        {/* Expected progress marker (Today's Target) */}
                        {expectedPercent > 0 && expectedPercent < 100 && (
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                                style={{ left: `${expectedPercent}%` }}
                                title={`Today's target: ${goal.expected_hours}h`}
                            />
                        )}
                    </div>

                    {/* Expected / Budget info */}
                    {goal.goal_type === 'limit' ? (
                        /* LIMIT GOAL: Show budget remaining */
                        <div className="flex justify-between text-xs mt-2 text-zinc-400">
                            <span>Budget: <strong className="text-zinc-300">{goal.target_value}h</strong> max</span>
                            {goal.budget_remaining !== undefined && goal.budget_remaining > 0 && (
                                <span className="text-zinc-400">
                                    {goal.budget_remaining}h remaining
                                </span>
                            )}
                            {goal.hours_logged > goal.target_value && (
                                <span className="text-red-400 font-medium">
                                    {(goal.hours_logged - goal.target_value).toFixed(1)}h over
                                </span>
                            )}
                        </div>
                    ) : (
                        /* TARGET GOAL: Show expected hours */
                        goal.expected_hours !== undefined && (
                            <div className="flex justify-between text-xs mt-2 text-zinc-400">
                                <span>Target: <strong className="text-zinc-300">{goal.expected_hours}h</strong> by today</span>
                                {goal.hours_logged < goal.expected_hours && (
                                    <span className="text-amber-400 font-medium">
                                        {(goal.expected_hours - goal.hours_logged).toFixed(1)}h behind
                                    </span>
                                )}
                                {goal.hours_logged >= goal.expected_hours && goal.status !== 'complete' && (
                                    <span className="text-emerald-400 font-medium">
                                        {(goal.hours_logged - goal.expected_hours).toFixed(1)}h ahead
                                    </span>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* Status indicator */}
                <div className={`flex items-center gap-1.5 text-sm ${status.text}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{status.label}</span>
                </div>
            </div>
        </div>
    );
}

function NewGoalForm({ onSubmit, isSubmitting }) {
    const [title, setTitle] = useState('');
    const [goalType, setGoalType] = useState('target');
    const [targetValue, setTargetValue] = useState(10);
    const [timeframe, setTimeframe] = useState('weekly');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Enforce minimum 1 hour
        const validatedValue = Math.max(1, Math.min(100, parseInt(targetValue) || 1));
        onSubmit(validatedValue, timeframe, title.trim() || null, goalType);
        setTitle('');
        setTargetValue(10); // Reset to default
    };

    const selectedType = GOAL_TYPES.find(t => t.value === goalType);

    return (
        <form onSubmit={handleSubmit} className="glass-card p-4">
            <div className="space-y-3">
                {/* Goal type toggle */}
                <div className="flex gap-2">
                    {GOAL_TYPES.map(type => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => setGoalType(type.value)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                                      ${goalType === type.value
                                    ? type.value === 'limit'
                                        ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
                                        : 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50'
                                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'}`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {/* Title input with context */}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={goalType === 'limit'
                        ? "What to limit? (e.g., Gaming, Social Media)"
                        : "What to achieve? (e.g., Learn Python, Exercise)"}
                    maxLength={100}
                    className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg
                             text-sm text-zinc-100 placeholder:text-zinc-600
                             focus:outline-none focus:border-indigo-500/50"
                />

                {/* Inline controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-zinc-500">{selectedType?.description}</span>

                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                            onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!val || val < 1) setTargetValue(1);
                                else if (val > 100) setTargetValue(100);
                            }}
                            className="w-16 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg
                                     text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50 text-center"
                        />
                        <span className="text-xs text-zinc-500">hrs</span>
                    </div>

                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="flex-1 min-w-[90px] px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 
                                 rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                    >
                        {TIMEFRAMES.map(tf => (
                            <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 
                                  transition-all flex items-center gap-1.5
                                  ${goalType === 'limit'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'}`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4" />
                        )}
                        <span>Create</span>
                    </button>
                </div>
            </div>
        </form>
    );
}

export default function GoalsPage() {
    const [goals, setGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchGoals();
    }, []);

    const fetchGoals = async () => {
        try {
            const response = await getGoals();
            setGoals(response.goals || []);
        } catch (err) {
            console.error('Failed to fetch goals:', err);
            setError('Failed to load goals');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGoal = async (targetValue, timeframe, title, goalType) => {
        setIsSubmitting(true);
        setError(null);
        try {
            await createGoal(targetValue, timeframe, title, goalType);
            await fetchGoals();
        } catch (err) {
            console.error('Failed to create goal:', err);
            setError('Failed to create goal');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteGoal = async (goalId) => {
        try {
            await deleteGoal(goalId);
            setGoals(prev => prev.filter(g => g.id !== goalId));
        } catch (err) {
            console.error('Failed to delete goal:', err);
            setError('Failed to delete goal');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                              flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Goals</h1>
                    <p className="text-sm text-zinc-500">Set and track your productivity targets</p>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* New Goal Form */}
            <NewGoalForm onSubmit={handleCreateGoal} isSubmitting={isSubmitting} />

            {/* Goals Grid */}
            {goals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {goals.map(goal => (
                        <GoalCard key={goal.id} goal={goal} onDelete={handleDeleteGoal} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-zinc-500">
                    <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No goals set yet</p>
                    <p className="text-sm mt-1">Create your first goal above to start tracking progress</p>
                </div>
            )}
        </div>
    );
}
