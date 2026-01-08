/**
 * FocusFlow - Time Projection Card
 * Shows users how many years of life they'll spend on leisure at current pace
 * Designed to create awareness through "shock analytics"
 */

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, TrendingDown, Skull } from 'lucide-react';
import { getProjection } from '../api';

export default function ProjectionCard() {
    const [projection, setProjection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProjection();
    }, []);

    const fetchProjection = async () => {
        try {
            setLoading(true);
            const data = await getProjection();
            setProjection(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card p-5 animate-pulse">
                <div className="h-20 bg-zinc-800/50 rounded-lg"></div>
            </div>
        );
    }

    if (error || !projection) {
        return null;
    }

    // INTERVENTION: Only show when limit is exceeded
    // This preserves the "shock value" for when it matters
    if (!projection.limit_exceeded) {
        return null;
    }

    const getWarningColor = () => {
        if (projection.warning_level === 'critical') return 'from-red-500/20 to-red-900/20';
        if (projection.warning_level === 'warning') return 'from-amber-500/20 to-orange-900/20';
        return 'from-zinc-700/20 to-zinc-800/20';
    };

    const getTextColor = () => {
        if (projection.warning_level === 'critical') return 'text-red-400';
        if (projection.warning_level === 'warning') return 'text-amber-400';
        return 'text-zinc-400';
    };

    const getIcon = () => {
        if (projection.warning_level === 'critical') return Skull;
        if (projection.warning_level === 'warning') return AlertTriangle;
        return Clock;
    };

    const Icon = getIcon();

    return (
        <div className={`relative overflow-hidden rounded-xl border border-zinc-800/50 
                        bg-gradient-to-br ${getWarningColor()} backdrop-blur-sm p-5`}>
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
                }}></div>
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${projection.warning_level === 'critical' ? 'bg-red-500/20' :
                            projection.warning_level === 'warning' ? 'bg-amber-500/20' : 'bg-zinc-700/50'
                            }`}>
                            <Icon className={`w-5 h-5 ${getTextColor()}`} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-zinc-300">Life Projection</h3>
                            <p className="text-xs text-zinc-500">Based on last 7 days</p>
                        </div>
                    </div>
                    <TrendingDown className={`w-4 h-4 ${getTextColor()}`} />
                </div>

                {/* Main Stat */}
                <div className="text-center py-4">
                    <div className={`text-4xl font-bold ${getTextColor()} mb-1`}>
                        {projection.years_on_leisure}
                    </div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">
                        Years on Leisure
                    </div>
                </div>

                {/* Warning Message */}
                <p className="text-sm text-zinc-400 text-center mb-4">
                    At your current pace of <span className={`font-medium ${getTextColor()}`}>
                        {projection.avg_daily_leisure_hours}h/day
                    </span>, you will spend{' '}
                    <span className={`font-bold ${getTextColor()}`}>
                        {projection.years_on_leisure} years
                    </span>{' '}
                    of your remaining life on leisure activities.
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-800/50">
                    <div className="text-center">
                        <div className="text-lg font-semibold text-zinc-200">
                            {projection.avg_daily_leisure_hours}h
                        </div>
                        <div className="text-xs text-zinc-500">Daily Avg</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-zinc-200">
                            {projection.hours_per_year}h
                        </div>
                        <div className="text-xs text-zinc-500">Per Year</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-zinc-200">
                            {projection.percent_of_life}%
                        </div>
                        <div className="text-xs text-zinc-500">Of Life</div>
                    </div>
                </div>

                {/* Set Age Prompt */}
                {!projection.has_birth_year && (
                    <div className="mt-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                        <p className="text-xs text-zinc-400 text-center">
                            ⚠️ Using estimated age of 25. Set your birth year in Profile for accurate projection.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
