/**
 * FocusFlow - Goals Page
 * Set and track weekly/monthly productivity goals with custom titles
 */

import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { getGoals, createGoal, deleteGoal } from '../api';

const CATEGORIES = ['Career', 'Health', 'Social', 'Chores', 'Leisure'];
const TIMEFRAMES = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
];

const STATUS_STYLES = {
    complete: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400', icon: CheckCircle },
    on_track: { bg: 'bg-lime-500/20', border: 'border-lime-500/50', text: 'text-lime-400', icon: TrendingUp },
    at_risk: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400', icon: AlertTriangle },
    behind: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', icon: AlertTriangle }
};

function GoalCard({ goal, onDelete }) {
    const status = STATUS_STYLES[goal.status] || STATUS_STYLES.behind;
    const StatusIcon = status.icon;

    // Use title if available, otherwise category
    const displayTitle = goal.title || goal.category;

    return (
        <div className={`rounded-xl border ${status.border} ${status.bg} p-5`}>
            <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-100 truncate">{displayTitle}</h3>
                    <p className="text-sm text-zinc-400">
                        {goal.title ? goal.category : ''} {goal.timeframe}
                    </p>
                </div>
                <button
                    onClick={() => onDelete(goal.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 ml-2"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-zinc-400">{goal.hours_logged}h / {goal.target_value}h</span>
                    <span className={status.text}>{goal.progress_percent}%</span>
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${status.text.replace('text-', 'bg-')} transition-all duration-500`}
                        style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
                    />
                </div>
            </div>

            {/* Status indicator */}
            <div className={`flex items-center gap-1.5 text-sm ${status.text}`}>
                <StatusIcon className="w-4 h-4" />
                <span className="capitalize">{goal.status.replace('_', ' ')}</span>
            </div>
        </div>
    );
}

function NewGoalForm({ onSubmit, isSubmitting }) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Career');
    const [targetValue, setTargetValue] = useState(10);
    const [timeframe, setTimeframe] = useState('weekly');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(category, targetValue, timeframe, title.trim() || null);
        setTitle('');  // Reset title after submission
    };

    return (
        <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
            <h3 className="text-lg font-medium text-zinc-100 mb-4">Create New Goal</h3>

            <div className="space-y-4">
                {/* Goal Name */}
                <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Goal Name (optional)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Master Python, Get Fit, Read More Books"
                        maxLength={100}
                        className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                                 text-zinc-100 placeholder:text-zinc-600
                                 focus:outline-none focus:border-indigo-500/50"
                    />
                </div>

                {/* Category, Target, Timeframe in row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                                     text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Target Hours</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={targetValue}
                            onChange={(e) => setTargetValue(parseInt(e.target.value) || 1)}
                            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                                     text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1.5">Timeframe</label>
                        <select
                            value={timeframe}
                            onChange={(e) => setTimeframe(e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                                     text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                        >
                            {TIMEFRAMES.map(tf => (
                                <option key={tf.value} value={tf.value}>{tf.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl
                             text-white font-medium hover:from-indigo-600 hover:to-purple-700
                             disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Plus className="w-5 h-5" />
                    )}
                    Create Goal
                </button>
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

    const handleCreateGoal = async (category, targetValue, timeframe, title) => {
        setIsSubmitting(true);
        setError(null);
        try {
            await createGoal(category, targetValue, timeframe, title);
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
