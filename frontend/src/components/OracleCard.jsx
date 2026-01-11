/**
 * FocusFlow - Oracle Card Component
 * Phase 7: AI-powered prescriptive analytics display
 * Glassmorphism design with shimmer animation
 */

import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

/**
 * Get Lucide icon component by name
 */
function getIcon(iconName) {
    const Icon = LucideIcons[iconName];
    return Icon || LucideIcons.Sparkles;
}

/**
 * Shimmer animation keyframes (inline for portability)
 */
const shimmerStyles = `
    @keyframes shimmer {
        0% {
            background-position: -200% 0;
        }
        100% {
            background-position: 200% 0;
        }
    }
    
    @keyframes pulse-glow {
        0%, 100% {
            opacity: 0.4;
        }
        50% {
            opacity: 0.7;
        }
    }
    
    .oracle-shimmer {
        background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
        );
        background-size: 200% 100%;
        animation: shimmer 3s ease-in-out infinite;
    }
    
    .oracle-glow {
        animation: pulse-glow 4s ease-in-out infinite;
    }
`;

/**
 * Type-based styling configurations
 */
const TYPE_STYLES = {
    positive: {
        gradient: 'from-emerald-900/40 via-teal-900/30 to-cyan-900/40',
        border: 'border-emerald-500/20',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        glow: 'shadow-emerald-500/10'
    },
    warning: {
        gradient: 'from-amber-900/40 via-orange-900/30 to-red-900/40',
        border: 'border-amber-500/20',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-400',
        glow: 'shadow-amber-500/10'
    },
    neutral: {
        gradient: 'from-purple-900/40 via-indigo-900/30 to-blue-900/40',
        border: 'border-purple-500/20',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-400',
        glow: 'shadow-purple-500/10'
    }
};

/**
 * OracleCard Component
 * Displays AI-generated productivity insights with stunning glassmorphism design
 */
export default function OracleCard({ insight, isLoading = false, className = '' }) {
    const [isVisible, setIsVisible] = useState(false);

    // Animate in on mount
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Get type-based styling
    const type = insight?.type || 'neutral';
    const styles = TYPE_STYLES[type] || TYPE_STYLES.neutral;

    // Get icon component
    const IconComponent = getIcon(insight?.icon || 'Sparkles');

    // Loading state
    if (isLoading) {
        return (
            <div className={`relative overflow-hidden rounded-2xl p-6
                           bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40
                           backdrop-blur-md border border-white/10
                           ${className}`}>
                <style>{shimmerStyles}</style>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 animate-pulse" />
                    <div className="flex-1 space-y-3">
                        <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                    </div>
                </div>
                <div className="absolute inset-0 oracle-shimmer pointer-events-none" />
            </div>
        );
    }

    // No insight available
    if (!insight) {
        return null;
    }

    return (
        <div
            className={`relative overflow-hidden rounded-2xl p-6
                       bg-gradient-to-r ${styles.gradient}
                       backdrop-blur-md border ${styles.border}
                       shadow-lg ${styles.glow}
                       transition-all duration-500 ease-out
                       ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                       hover:scale-[1.01] hover:shadow-xl
                       ${className}`}
        >
            {/* Inject keyframe animations */}
            <style>{shimmerStyles}</style>

            {/* Background glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} 
                            blur-3xl oracle-glow pointer-events-none`} />

            {/* Content */}
            <div className="relative z-10 flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl ${styles.iconBg}
                               flex items-center justify-center
                               shadow-lg backdrop-blur-sm`}>
                    <IconComponent className={`w-7 h-7 ${styles.iconColor}`} />
                </div>

                {/* Text content */}
                <div className="flex-1 min-w-0">
                    {/* Title with gradient text */}
                    <h3 className="text-lg font-bold text-transparent bg-clip-text 
                                  bg-gradient-to-r from-white via-zinc-200 to-zinc-400
                                  mb-1">
                        {insight.title}
                    </h3>

                    {/* Message */}
                    <p className="text-zinc-300 text-sm leading-relaxed">
                        {insight.message}
                    </p>

                    {/* Insight Counter - shows when multiple insights available */}
                    {insight.total_insights > 1 && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex gap-1">
                                {Array.from({ length: insight.total_insights }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors
                                                  ${i + 1 === insight.insight_index
                                                ? styles.iconColor.replace('text-', 'bg-')
                                                : 'bg-zinc-600'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-zinc-500">
                                {insight.insight_index} of {insight.total_insights} insights
                            </span>
                        </div>
                    )}

                    {/* Cold start progress indicator */}
                    {insight.cold_start && insight.activities_needed && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-zinc-700/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                                    style={{ width: `${Math.max(0, (5 - insight.activities_needed) / 5 * 100)}%` }}
                                />
                            </div>
                            <span className="text-xs text-zinc-500">
                                {5 - insight.activities_needed}/5 activities
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Shimmer overlay */}
            <div className="absolute inset-0 oracle-shimmer pointer-events-none" />

            {/* Decorative corner accent */}
            <div className={`absolute -top-12 -right-12 w-24 h-24 
                           bg-gradient-to-br ${styles.gradient} 
                           rounded-full blur-2xl opacity-50`} />
        </div>
    );
}

/**
 * Mini Oracle Card for compact display
 */
export function OracleCardMini({ insight, onClick }) {
    if (!insight) return null;

    const type = insight?.type || 'neutral';
    const styles = TYPE_STYLES[type] || TYPE_STYLES.neutral;
    const IconComponent = getIcon(insight?.icon || 'Sparkles');

    return (
        <button
            onClick={onClick}
            className={`w-full text-left rounded-xl p-4
                       bg-gradient-to-r ${styles.gradient}
                       backdrop-blur-md border ${styles.border}
                       hover:scale-[1.02] transition-transform
                       group`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${styles.iconBg}
                               flex items-center justify-center`}>
                    <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-200 truncate">
                        {insight.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">
                        {insight.message}
                    </p>
                </div>
                <LucideIcons.ChevronRight className="w-4 h-4 text-zinc-500 
                                                     group-hover:text-zinc-300 transition-colors" />
            </div>
        </button>
    );
}
