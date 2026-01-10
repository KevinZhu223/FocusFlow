/**
 * FocusFlow - Compact Focus Timer Component
 * Phase 8 v2: Inline timer that works with ActivityInput
 * - No category selection (LLM handles that)
 * - On finish, passes duration to parent for input highlighting
 */

import { useState, useEffect, useRef } from 'react';
import { Play, StopCircle, X, Timer } from 'lucide-react';

// localStorage keys for persistence
const TIMER_START_KEY = 'focusflow_timer_start';

/**
 * Format milliseconds to HH:MM:SS or MM:SS display
 */
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function FocusTimer({ onTimerComplete }) {
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef(null);

    // Check for existing timer on mount (persistence)
    useEffect(() => {
        const savedStart = localStorage.getItem(TIMER_START_KEY);

        if (savedStart) {
            const start = parseInt(savedStart, 10);
            setStartTime(start);
            setIsRunning(true);
            setElapsed(Date.now() - start);
        }
    }, []);

    // Timer tick effect
    useEffect(() => {
        if (isRunning && startTime) {
            intervalRef.current = setInterval(() => {
                setElapsed(Date.now() - startTime);
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, startTime]);

    const handleStart = () => {
        const now = Date.now();
        setStartTime(now);
        setElapsed(0);
        setIsRunning(true);
        localStorage.setItem(TIMER_START_KEY, now.toString());
    };

    const handleFinish = () => {
        if (!startTime) return;

        // Calculate duration in minutes
        const durationMs = Date.now() - startTime;
        const minutes = Math.max(1, Math.round(durationMs / 60000)); // Minimum 1 minute

        // Clear localStorage
        localStorage.removeItem(TIMER_START_KEY);

        // Stop timer
        setIsRunning(false);
        setStartTime(null);
        setElapsed(0);

        // Notify parent with duration - parent will highlight input and append duration
        if (onTimerComplete) {
            onTimerComplete(minutes);
        }
    };

    const handleCancel = () => {
        localStorage.removeItem(TIMER_START_KEY);
        setIsRunning(false);
        setStartTime(null);
        setElapsed(0);
    };

    return (
        <div className={`flex items-center gap-2 transition-all duration-300
                        ${isRunning ? 'flex-1' : ''}`}>
            {!isRunning ? (
                /* IDLE STATE - Compact start button */
                <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium
                             bg-gradient-to-r from-indigo-500 to-purple-600
                             hover:from-indigo-600 hover:to-purple-700
                             text-white shadow-lg shadow-indigo-500/25
                             transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                    <Timer className="w-4 h-4" />
                    <span>Start Timer</span>
                </button>
            ) : (
                /* ACTIVE STATE - Timer display with controls */
                <div className="flex-1 flex items-center gap-3 px-4 py-2 rounded-xl
                              bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-violet-900/50
                              border border-indigo-500/30 animate-pulse-border">
                    {/* Timer display */}
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xl font-mono font-bold text-white tabular-nums tracking-wider">
                            {formatTime(elapsed)}
                        </span>
                    </div>

                    <div className="flex-1" />

                    {/* Cancel button - clearly labeled */}
                    <button
                        onClick={handleCancel}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                 text-zinc-400 hover:text-red-400 hover:bg-red-500/10
                                 transition-colors text-sm"
                        title="Cancel timer"
                    >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                    </button>

                    {/* Finish button */}
                    <button
                        onClick={handleFinish}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium
                                 bg-gradient-to-r from-emerald-500 to-green-600
                                 hover:from-emerald-600 hover:to-green-700
                                 text-white shadow-md shadow-emerald-500/25
                                 transition-all hover:scale-105 active:scale-95"
                    >
                        <StopCircle className="w-4 h-4" />
                        <span>Finish</span>
                    </button>
                </div>
            )}

            {/* Subtle pulsing border animation */}
            <style>{`
                @keyframes pulse-border {
                    0%, 100% { border-color: rgba(99, 102, 241, 0.3); }
                    50% { border-color: rgba(139, 92, 246, 0.5); }
                }
                .animate-pulse-border {
                    animation: pulse-border 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}
