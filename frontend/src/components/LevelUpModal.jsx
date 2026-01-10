import { useState, useEffect } from 'react';
import { Sparkles, Star, Trophy, X, ChevronUp } from 'lucide-react';

/**
 * LevelUpModal Component
 * Celebratory modal that appears when a user levels up
 * Features confetti animation and level display
 */
export default function LevelUpModal({ isOpen, onClose, levelData }) {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            // Auto-dismiss confetti after animation
            const timer = setTimeout(() => setShowConfetti(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen || !levelData) return null;

    const { oldLevel, newLevel } = levelData;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Confetti Animation */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                            }}
                        >
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: ['#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6', '#ec4899'][Math.floor(Math.random() * 5)],
                                    transform: `rotate(${Math.random() * 360}deg)`,
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Content */}
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 
                          border border-amber-500/30 rounded-3xl p-8 max-w-md w-full
                          shadow-2xl shadow-amber-500/20 animate-level-up">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg text-zinc-500 
                             hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header with sparkles */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full 
                                  bg-amber-500/20 border border-amber-500/30 text-amber-400 
                                  text-sm font-medium mb-4">
                        <Sparkles className="w-4 h-4" />
                        LEVEL UP!
                        <Sparkles className="w-4 h-4" />
                    </div>
                </div>

                {/* Level Display */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {/* Old Level */}
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700
                                      flex items-center justify-center text-2xl font-bold text-zinc-500">
                            {oldLevel}
                        </div>
                        <span className="text-xs text-zinc-600 mt-2 block">Previous</span>
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center">
                        <ChevronUp className="w-8 h-8 text-amber-400 animate-bounce" />
                    </div>

                    {/* New Level */}
                    <div className="text-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600
                                      flex items-center justify-center text-3xl font-bold text-white
                                      shadow-lg shadow-amber-500/40 ring-4 ring-amber-500/20">
                            {newLevel}
                        </div>
                        <span className="text-xs text-amber-400 mt-2 block font-medium">NEW!</span>
                    </div>
                </div>

                {/* Congratulations Text */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                        Congratulations! 🎉
                    </h2>
                    <p className="text-zinc-400">
                        You've reached <span className="text-amber-400 font-semibold">Level {newLevel}</span>!
                        <br />
                        Keep up the great work!
                    </p>
                </div>

                {/* Rewards Section */}
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 mb-6">
                    <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>Rewards Unlocked</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 
                                      border border-emerald-500/20 text-emerald-400 text-sm">
                            <Star className="w-4 h-4" />
                            +1 Chest Key
                        </div>
                    </div>
                </div>

                {/* Continue Button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                             text-white font-semibold shadow-lg shadow-amber-500/25
                             hover:shadow-amber-500/40 transition-all hover:scale-[1.02]"
                >
                    Continue
                </button>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                
                @keyframes level-up-entrance {
                    0% {
                        opacity: 0;
                        transform: scale(0.8) translateY(20px);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                .animate-confetti {
                    animation: confetti-fall linear forwards;
                }
                
                .animate-level-up {
                    animation: level-up-entrance 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
