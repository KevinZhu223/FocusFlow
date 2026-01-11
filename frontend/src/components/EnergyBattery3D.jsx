/**
 * FocusFlow - Enhanced Energy Battery
 * Phase 4 Fix: CSS-based animated liquid battery with proper fill and colors
 */

import { useMemo } from 'react';
import { Battery, BatteryFull, BatteryLow, BatteryMedium, Zap } from 'lucide-react';

export default function EnergyBattery3D({ energyPercent = 50, label = "Energy Level" }) {
    // Clamp between 0-100
    const percent = Math.max(0, Math.min(100, energyPercent));

    // Color based on fill level
    const { color, bgColor, textColor, label: statusLabel } = useMemo(() => {
        if (percent > 70) return {
            color: '#10b981',
            bgColor: 'rgba(16, 185, 129, 0.2)',
            textColor: 'text-emerald-400',
            label: 'Fully charged!'
        };
        if (percent > 40) return {
            color: '#f59e0b',
            bgColor: 'rgba(245, 158, 11, 0.2)',
            textColor: 'text-amber-400',
            label: 'Good energy'
        };
        return {
            color: '#ef4444',
            bgColor: 'rgba(239, 68, 68, 0.2)',
            textColor: 'text-red-400',
            label: 'Need a break?'
        };
    }, [percent]);

    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-4">
                {/* Battery Visual */}
                <div className="relative w-16 h-24 flex items-end justify-center">
                    {/* Battery Body */}
                    <div
                        className="relative w-14 h-20 rounded-lg border-2 overflow-hidden"
                        style={{
                            borderColor: color,
                            backgroundColor: 'rgba(24, 24, 27, 0.8)'
                        }}
                    >
                        {/* Liquid Fill */}
                        <div
                            className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
                            style={{
                                height: `${percent}%`,
                                background: `linear-gradient(to top, ${color}, ${color}80)`,
                                boxShadow: `0 0 20px ${color}40`
                            }}
                        >
                            {/* Bubble effect */}
                            <div className="absolute inset-0 overflow-hidden">
                                <div
                                    className="absolute w-2 h-2 rounded-full opacity-50 animate-pulse"
                                    style={{
                                        backgroundColor: 'white',
                                        bottom: '20%',
                                        left: '30%'
                                    }}
                                />
                                <div
                                    className="absolute w-1.5 h-1.5 rounded-full opacity-40 animate-pulse"
                                    style={{
                                        backgroundColor: 'white',
                                        bottom: '45%',
                                        right: '25%',
                                        animationDelay: '0.5s'
                                    }}
                                />
                                <div
                                    className="absolute w-1 h-1 rounded-full opacity-30 animate-pulse"
                                    style={{
                                        backgroundColor: 'white',
                                        bottom: '70%',
                                        left: '50%',
                                        animationDelay: '1s'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Shine effect */}
                        <div
                            className="absolute inset-y-0 left-1 w-1 rounded-full opacity-20"
                            style={{ backgroundColor: 'white' }}
                        />
                    </div>

                    {/* Battery Cap */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-2 rounded-t-sm"
                        style={{ backgroundColor: color }}
                    />

                    {/* Glow effect when high */}
                    {percent > 70 && (
                        <div
                            className="absolute inset-0 rounded-lg animate-pulse"
                            style={{
                                boxShadow: `0 0 30px ${color}30`,
                                pointerEvents: 'none'
                            }}
                        />
                    )}
                </div>

                {/* Text Info */}
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-zinc-400 mb-1">{label}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold ${textColor}`}>
                            {Math.round(percent)}%
                        </span>
                        <Zap className={`w-4 h-4 ${textColor} ${percent > 70 ? 'animate-pulse' : ''}`} />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">{statusLabel}</p>

                    {/* Progress bar for extra clarity */}
                    <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${percent}%`,
                                backgroundColor: color
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
