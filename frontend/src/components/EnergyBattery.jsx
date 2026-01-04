/**
 * FocusFlow - Energy Battery
 * Visual battery showing daily energy level
 */

import { Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryWarning, Zap } from 'lucide-react';

export default function EnergyBattery({ dashboardData }) {
    // Calculate energy from productivity balance
    // Positive score = more energy, negative = drained
    const dailyScore = dashboardData?.daily_score || 0;
    const activityCount = dashboardData?.activity_count || 0;

    // Normalize score to 0-100%
    // Assuming max positive daily score around 80 for full battery
    let energyLevel = 50; // Start at 50%

    if (activityCount > 0) {
        // Add score impact (capped at ±50)
        const scoreImpact = Math.min(Math.max(dailyScore * 1.5, -50), 50);
        energyLevel = Math.round(50 + scoreImpact);
        energyLevel = Math.min(Math.max(energyLevel, 0), 100);
    }

    // Determine color and icon based on energy level
    let colorClass, bgClass, Icon;
    if (energyLevel >= 80) {
        colorClass = 'text-emerald-400';
        bgClass = 'bg-emerald-500';
        Icon = BatteryFull;
    } else if (energyLevel >= 50) {
        colorClass = 'text-lime-400';
        bgClass = 'bg-lime-500';
        Icon = BatteryMedium;
    } else if (energyLevel >= 25) {
        colorClass = 'text-amber-400';
        bgClass = 'bg-amber-500';
        Icon = BatteryLow;
    } else {
        colorClass = 'text-red-400';
        bgClass = 'bg-red-500';
        Icon = BatteryWarning;
    }

    // Status text
    let statusText;
    if (energyLevel >= 80) {
        statusText = "Fully charged! You're crushing it.";
    } else if (energyLevel >= 50) {
        statusText = "Good energy levels. Keep going!";
    } else if (energyLevel >= 25) {
        statusText = "Running low. Take a break?";
    } else {
        statusText = "Energy depleted. Time to recharge!";
    }

    return (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-300">Daily Energy</h3>
                <div className={`flex items-center gap-1 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{energyLevel}%</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden mb-2">
                {/* Battery segments for visual effect */}
                <div className="absolute inset-0 flex gap-1 p-0.5">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 rounded-sm bg-zinc-700/50"
                        />
                    ))}
                </div>

                {/* Fill */}
                <div
                    className={`absolute inset-y-0 left-0 ${bgClass} transition-all duration-500 rounded-full`}
                    style={{ width: `${energyLevel}%` }}
                >
                    {/* Animated shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                        animate-pulse" />
                </div>

                {/* Lightning bolt for charging */}
                {dailyScore > 0 && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                    </div>
                )}
            </div>

            {/* Status text */}
            <p className="text-xs text-zinc-500">{statusText}</p>
        </div>
    );
}
