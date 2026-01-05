/**
 * FocusFlow - Loot Chest Button with CS:GO-style Spinner
 * Phase 4.5: Credit-based system with animated spinner reveal
 */

import { useState, useEffect, useRef } from 'react';
import { Gift, Sparkles, X, Loader2, Key } from 'lucide-react';
import { getProfile, openChest, getCollection } from '../api';

const RARITY_COLORS = {
    Common: { bg: 'bg-zinc-500', border: 'border-zinc-400', text: 'text-zinc-300', glow: '' },
    Rare: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-300', glow: 'shadow-lg shadow-blue-500/50' },
    Legendary: { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-300', glow: 'shadow-lg shadow-purple-500/50' },
    Mythic: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-300', glow: 'shadow-xl shadow-amber-500/50 animate-pulse' }
};

// All items for spinner display
const ALL_ITEMS = [
    { emoji: '💾', rarity: 'Common' }, { emoji: '☕', rarity: 'Common' }, { emoji: '🎧', rarity: 'Common' },
    { emoji: '📝', rarity: 'Common' }, { emoji: '🖊️', rarity: 'Common' }, { emoji: '🔌', rarity: 'Common' },
    { emoji: '📀', rarity: 'Common' }, { emoji: '📋', rarity: 'Common' }, { emoji: '⌨️', rarity: 'Rare' },
    { emoji: '🔇', rarity: 'Rare' }, { emoji: '🖥️', rarity: 'Rare' }, { emoji: '🏃', rarity: 'Rare' },
    { emoji: '☕', rarity: 'Rare' }, { emoji: '🎹', rarity: 'Rare' }, { emoji: '💎', rarity: 'Legendary' },
    { emoji: '⏰', rarity: 'Legendary' }, { emoji: '🛡️', rarity: 'Legendary' }, { emoji: '🪑', rarity: 'Legendary' },
    { emoji: '🏆', rarity: 'Mythic' }, { emoji: '🔋', rarity: 'Mythic' }
];

// CS:GO Style Spinner Component
function SpinnerModal({ wonItem, onComplete }) {
    const [isSpinning, setIsSpinning] = useState(true);
    const [offset, setOffset] = useState(0);
    const containerRef = useRef(null);

    // Generate spinner items (50 items, won item at position ~43)
    const spinnerItems = useRef([]);
    if (spinnerItems.current.length === 0) {
        const items = [];
        for (let i = 0; i < 50; i++) {
            if (i === 43) {
                // Place winning item at known position
                items.push({ ...wonItem, isWinner: true });
            } else {
                items.push(ALL_ITEMS[Math.floor(Math.random() * ALL_ITEMS.length)]);
            }
        }
        spinnerItems.current = items;
    }

    useEffect(() => {
        // Animate spinner
        const itemWidth = 80; // Width of each item
        const winnerPosition = 43 * itemWidth;
        // Add random offset so it's not always perfectly centered (-30 to +30 px)
        const randomOffset = Math.random() * 60 - 30;
        const finalOffset = winnerPosition - 200 + randomOffset; // Center winner in view

        // Start spinning animation
        const startTime = Date.now();
        const duration = 3000; // 3 seconds

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic for realistic deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            setOffset(eased * finalOffset);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsSpinning(false);
                // Delay to show the result
                setTimeout(onComplete, 1500);
            }
        };

        requestAnimationFrame(animate);
    }, [onComplete]);

    const rarity = RARITY_COLORS[wonItem.rarity] || RARITY_COLORS.Common;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full">
                {/* Header */}
                <div className="bg-zinc-800 p-4 text-center">
                    <h2 className="text-xl font-bold text-white">Opening Chest...</h2>
                </div>

                {/* Spinner Track */}
                <div className="relative py-8 overflow-hidden bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-800">
                    {/* Center marker */}
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-amber-500 z-10" />
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-amber-500 z-10" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-amber-500 z-10" />

                    {/* Items Row */}
                    <div
                        ref={containerRef}
                        className="flex transition-none"
                        style={{ transform: `translateX(-${offset}px)` }}
                    >
                        {spinnerItems.current.map((item, idx) => {
                            const itemRarity = RARITY_COLORS[item.rarity] || RARITY_COLORS.Common;
                            return (
                                <div
                                    key={idx}
                                    className={`flex-shrink-0 w-20 h-20 m-1 rounded-xl border-2 
                                              flex items-center justify-center text-4xl
                                              ${itemRarity.border} ${itemRarity.bg}/20
                                              ${item.isWinner && !isSpinning ? itemRarity.glow : ''}`}
                                >
                                    {item.emoji || item.image_emoji}
                                </div>
                            );
                        })}
                    </div>

                    {/* Edge gradients */}
                    <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-900 to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-900 to-transparent pointer-events-none" />
                </div>

                {/* Result (shows after spin) */}
                {!isSpinning && (
                    <div className={`p-6 text-center border-t-2 ${rarity.border} animate-fadeIn`}>
                        <div className="text-5xl mb-3">{wonItem.image_emoji}</div>
                        <div className={`text-lg font-bold ${rarity.text}`}>{wonItem.rarity}!</div>
                        <h3 className="text-xl font-bold text-white mt-1">{wonItem.name}</h3>
                        <p className="text-zinc-500 text-sm mt-2">{wonItem.description}</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.5s ease-out;
                }
            `}</style>
        </div>
    );
}

export default function LootButton() {
    const [credits, setCredits] = useState(0);
    const [isOpening, setIsOpening] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [wonItem, setWonItem] = useState(null);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        fetchCredits();
    }, []);

    const fetchCredits = async () => {
        try {
            const profile = await getProfile();
            setCredits(profile.user?.chest_credits || 0);
        } catch (err) {
            console.error('Failed to fetch credits:', err);
        }
    };

    const handleOpenChest = async () => {
        if (credits <= 0) return;

        setIsOpening(true);
        try {
            const result = await openChest();
            if (result.success && result.item) {
                setCredits(result.credits_remaining || credits - 1);
                setWonItem(result.item);
                setShowSpinner(true);
            }
        } catch (err) {
            console.error('Failed to open chest:', err);
        } finally {
            setIsOpening(false);
        }
    };

    const handleSpinComplete = () => {
        setShowSpinner(false);
        setShowResult(true);
    };

    const closeResult = () => {
        setShowResult(false);
        setWonItem(null);
    };

    const rarity = wonItem ? (RARITY_COLORS[wonItem.rarity] || RARITY_COLORS.Common) : null;

    return (
        <>
            <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 
                          border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                  ${credits > 0
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-zinc-800 text-zinc-500'}`}>
                        <Gift className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={credits > 0 ? 'font-medium text-amber-400' : 'text-zinc-400'}>
                                Loot Chests
                            </span>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-sm">
                                <Key className="w-3 h-3 text-amber-400" />
                                <span className={credits > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                                    {credits}
                                </span>
                            </div>
                        </div>
                        <div className="text-sm text-zinc-500">
                            {credits > 0
                                ? 'Click to open!'
                                : 'Log 2+ hours of productive work to earn keys'}
                        </div>
                    </div>

                    {credits > 0 && (
                        <button
                            onClick={handleOpenChest}
                            disabled={isOpening}
                            className="px-4 py-2 bg-amber-500 text-white font-medium rounded-xl
                                     hover:bg-amber-600 disabled:opacity-50 transition-colors
                                     flex items-center gap-2"
                        >
                            {isOpening ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            Open ({credits})
                        </button>
                    )}
                </div>
            </div>

            {/* CS:GO Spinner Modal */}
            {showSpinner && wonItem && (
                <SpinnerModal wonItem={wonItem} onComplete={handleSpinComplete} />
            )}

            {/* Final Result Modal */}
            {showResult && wonItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className={`bg-zinc-900 border-2 ${rarity.border} 
                                   rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl ${rarity.glow}
                                   animate-bounce-in`}>
                        <div className={`${rarity.bg} p-4 flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-white" />
                                <span className="font-bold text-white">{wonItem.rarity} Item!</span>
                            </div>
                            <button onClick={closeResult} className="text-white/70 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 text-center">
                            <div className="text-7xl mb-4">{wonItem.image_emoji}</div>
                            <h3 className={`text-2xl font-bold ${rarity.text}`}>{wonItem.name}</h3>
                            <p className="text-zinc-400 mt-2 text-sm">{wonItem.description}</p>
                        </div>

                        <div className="p-4 border-t border-zinc-800">
                            <button
                                onClick={closeResult}
                                className={`w-full py-3 rounded-xl font-medium text-white ${rarity.bg}
                                          hover:opacity-90 transition-opacity`}
                            >
                                Awesome! ({credits} keys left)
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes bounce-in {
                            0% { transform: scale(0.5); opacity: 0; }
                            50% { transform: scale(1.05); }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        .animate-bounce-in {
                            animation: bounce-in 0.4s ease-out;
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
