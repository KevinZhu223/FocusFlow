/**
 * FocusFlow - Oracle Intervention Modal
 * Phase 4: Proactive burnout detection with recovery missions
 */

import { useState, useEffect } from 'react';
import {
    AlertTriangle, Moon, Sparkles, X,
    Check, Clock, Award, Heart
} from 'lucide-react';
import { getProactiveIntervention } from '../api';

const SEVERITY_STYLES = {
    warning: {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/50',
        iconColor: 'text-amber-400',
        buttonBg: 'bg-amber-500 hover:bg-amber-600'
    },
    caution: {
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/50',
        iconColor: 'text-purple-400',
        buttonBg: 'bg-purple-500 hover:bg-purple-600'
    },
    success: {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/50',
        iconColor: 'text-emerald-400',
        buttonBg: 'bg-emerald-500 hover:bg-emerald-600'
    }
};

const ICONS = {
    AlertTriangle,
    Moon,
    Sparkles,
    Heart
};

export default function OracleInterventionModal({ onAcceptMission, onDismiss }) {
    const [intervention, setIntervention] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        // Check for intervention every 15 minutes
        const checkIntervention = async () => {
            try {
                const data = await getProactiveIntervention();
                if (data.intervention && data.intervention.type !== 'positive') {
                    setIntervention(data.intervention);
                    setIsVisible(true);
                }
            } catch (err) {
                console.error('Failed to check intervention:', err);
            }
            setHasChecked(true);
        };

        // Initial check after 5 seconds
        const initialTimeout = setTimeout(checkIntervention, 5000);

        // Regular checks every 15 minutes
        const interval = setInterval(checkIntervention, 15 * 60 * 1000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, []);

    const handleAccept = () => {
        if (intervention?.mission && onAcceptMission) {
            onAcceptMission(intervention.mission);
        }
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        if (onDismiss) onDismiss();
    };

    if (!isVisible || !intervention) return null;

    const styles = SEVERITY_STYLES[intervention.severity] || SEVERITY_STYLES.warning;
    const Icon = ICONS[intervention.icon] || AlertTriangle;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleDismiss} />

            <div className={`relative w-full max-w-md p-6 rounded-2xl border-2 ${styles.bg} ${styles.border}
                           animate-in fade-in slide-in-from-bottom-4 duration-300`}>
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl ${styles.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-8 h-8 ${styles.iconColor}`} />
                </div>

                {/* Content */}
                <h2 className="text-xl font-bold text-zinc-100 mb-2">
                    {intervention.title}
                </h2>
                <p className="text-zinc-400 mb-4">
                    {intervention.message}
                </p>

                {/* Mission Card */}
                {intervention.mission && (
                    <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-medium text-amber-400">Recovery Mission</span>
                        </div>
                        <h3 className="font-semibold text-zinc-100 mb-1">
                            {intervention.mission.name}
                        </h3>
                        <p className="text-sm text-zinc-500 mb-3">
                            {intervention.mission.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {intervention.mission.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1 text-amber-400">
                                <Sparkles className="w-3 h-3" />
                                +{intervention.mission.xp_reward} XP
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {intervention.mission && (
                        <button
                            onClick={handleAccept}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                                     text-white font-semibold transition-colors ${styles.buttonBg}`}
                        >
                            <Check className="w-4 h-4" />
                            Accept Mission
                        </button>
                    )}
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 
                                 hover:bg-zinc-700 transition-colors"
                    >
                        {intervention.mission ? 'Snooze' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    );
}
