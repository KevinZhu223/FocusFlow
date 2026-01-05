/**
 * FocusFlow - Intervention Alert Component
 * Phase 4: Polls intervention status and shows warnings/critical alerts
 */

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Volume2, VolumeX, X } from 'lucide-react';
import { getInterventionStatus } from '../api';

export default function InterventionAlert() {
    const [status, setStatus] = useState(null);
    const [showAlert, setShowAlert] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const audioRef = useRef(null);
    const intervalRef = useRef(null);

    // Initialize audio
    useEffect(() => {
        // Create oscillator-based alarm (no external file needed)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioRef.current = audioContext;

        return () => {
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
        };
    }, []);

    // Poll intervention status every 60 seconds
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const result = await getInterventionStatus();
                setStatus(result);

                // Show alert for WARNING or CRITICAL
                if (result.status === 'WARNING' || result.status === 'CRITICAL') {
                    setShowAlert(true);

                    // Start flashing and alarm for CRITICAL
                    if (result.status === 'CRITICAL') {
                        setIsFlashing(true);
                        if (!isMuted) {
                            playAlarm();
                        }
                    } else {
                        setIsFlashing(false);
                    }
                } else {
                    setShowAlert(false);
                    setIsFlashing(false);
                }
            } catch (err) {
                // Silent fail - no intervention data
            }
        };

        checkStatus();
        intervalRef.current = setInterval(checkStatus, 60000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isMuted]);

    // Flash effect
    useEffect(() => {
        if (!isFlashing) return;

        const flash = setInterval(() => {
            document.body.classList.toggle('intervention-flash');
        }, 500);

        return () => {
            clearInterval(flash);
            document.body.classList.remove('intervention-flash');
        };
    }, [isFlashing]);

    const playAlarm = () => {
        if (!audioRef.current || audioRef.current.state === 'closed') return;

        try {
            const ctx = audioRef.current;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'square';
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.3;

            oscillator.start();

            // Stop after 2 seconds
            setTimeout(() => {
                oscillator.stop();
            }, 2000);
        } catch (e) {
            console.warn('Audio not supported');
        }
    };

    const dismissAlert = () => {
        setShowAlert(false);
        setIsFlashing(false);
        document.body.classList.remove('intervention-flash');
    };

    if (!showAlert || !status) return null;

    const isCritical = status.status === 'CRITICAL';
    const isWarning = status.status === 'WARNING';

    return (
        <>
            {/* Flash overlay for critical */}
            {isCritical && (
                <div className="fixed inset-0 bg-red-500/20 pointer-events-none z-40 animate-pulse" />
            )}

            {/* Alert Banner */}
            <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 
                           max-w-md w-full mx-4 rounded-2xl shadow-2xl overflow-hidden
                           ${isCritical ? 'bg-red-900 border-2 border-red-500' :
                    'bg-amber-900 border-2 border-amber-500'}`}>
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}>
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-white">
                                {isCritical ? '⛔ TIME LIMIT EXCEEDED!' : '⚠️ Gaming Time Warning'}
                            </h3>
                            <p className="text-sm text-white/80 mt-1">
                                {isCritical
                                    ? `You've used all ${status.allowance} minutes of gaming time today!`
                                    : `Only ${status.remaining} minutes of gaming time remaining!`}
                            </p>
                            <div className="mt-3 flex items-center gap-3 text-sm text-white/60">
                                <span>Used: {status.gaming_minutes}/{status.allowance} min</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={dismissAlert}
                                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-black/20">
                    <div
                        className={`h-full transition-all ${isCritical ? 'bg-red-400' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, (status.gaming_minutes / status.allowance) * 100)}%` }}
                    />
                </div>
            </div>

            {/* Global flash CSS */}
            <style>{`
                .intervention-flash {
                    animation: flash 0.5s ease-in-out;
                }
                @keyframes flash {
                    0%, 100% { background-color: transparent; }
                    50% { background-color: rgba(239, 68, 68, 0.2); }
                }
            `}</style>
        </>
    );
}
