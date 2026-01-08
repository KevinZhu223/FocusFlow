/**
 * FocusFlow - Loot Chest Button with Tech Relic Spinner
 * Revamped with Lucide icons and dramatic reveal animation
 * Uses DOM refs for pixel-perfect spinner alignment
 */

import { useState, useEffect, useRef, useMemo, forwardRef } from 'react';
import { Gift, Sparkles, X, Loader2, Key, Package } from 'lucide-react';
import { openChest } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { getIcon, getRarityStyle, RARITY_STYLES } from '../utils/iconMap';

// All items for spinner display (tech relic icons)
const SPINNER_ITEMS = [
    { icon_name: 'FileCode', rarity: 'Common' },
    { icon_name: 'Coffee', rarity: 'Common' },
    { icon_name: 'Bug', rarity: 'Common' },
    { icon_name: 'Terminal', rarity: 'Common' },
    { icon_name: 'GitCommit', rarity: 'Common' },
    { icon_name: 'Keyboard', rarity: 'Common' },
    { icon_name: 'Binary', rarity: 'Common' },
    { icon_name: 'Cable', rarity: 'Common' },
    { icon_name: 'MemoryStick', rarity: 'Rare' },
    { icon_name: 'HardDrive', rarity: 'Rare' },
    { icon_name: 'Database', rarity: 'Rare' },
    { icon_name: 'Wifi', rarity: 'Rare' },
    { icon_name: 'Shield', rarity: 'Rare' },
    { icon_name: 'CircuitBoard', rarity: 'Rare' },
    { icon_name: 'Cpu', rarity: 'Legendary' },
    { icon_name: 'Cloud', rarity: 'Legendary' },
    { icon_name: 'Boxes', rarity: 'Legendary' },
    { icon_name: 'Bot', rarity: 'Legendary' },
    { icon_name: 'Atom', rarity: 'Mythic' },
    { icon_name: 'Sparkles', rarity: 'Mythic' }
];

// Spinner Item Component - wrapped in forwardRef for DOM position reading
const SpinnerItem = forwardRef(({ item, isWinner, isRevealed }, ref) => {
    const IconComponent = getIcon(item.icon_name);
    const style = getRarityStyle(item.rarity);
    const isMythic = item.rarity === 'Mythic';

    return (
        <div
            ref={ref}
            className={`flex-shrink-0 w-24 h-24 m-1 rounded-xl border-2 
                        flex items-center justify-center
                        backdrop-blur-sm transition-all duration-300
                        ${style.bg} ${style.border}
                        ${isWinner && isRevealed ? `${style.glow} scale-110` : ''}
                        ${isWinner && isRevealed && isMythic ? 'animate-pulse' : ''}`}>
            <IconComponent
                className={`w-10 h-10 ${isMythic ? 'text-purple-400' : style.icon}`}
                strokeWidth={1.5}
            />
        </div>
    );
});

// CS:GO Style Spinner Component
function SpinnerModal({ wonItem, onComplete }) {
    const [isSpinning, setIsSpinning] = useState(true);
    const [offset, setOffset] = useState(0);
    const trackRef = useRef(null);
    const winnerRef = useRef(null);  // REF FOR THE WINNER ELEMENT
    const wonStyle = getRarityStyle(wonItem.rarity);

    // Configuration
    const WINNER_INDEX = 40; // Place winner at position 40
    const TOTAL_ITEMS = 60; // Enough items so we never see the end

    // Generate NEW spinner items for EACH wonItem using useMemo
    const spinnerItems = useMemo(() => {
        const items = [];
        for (let i = 0; i < TOTAL_ITEMS; i++) {
            if (i === WINNER_INDEX) {
                // WINNER goes here - this MUST match wonItem
                items.push({
                    ...wonItem,
                    isWinner: true,
                });
            } else {
                // Random filler item
                const randomItem = SPINNER_ITEMS[Math.floor(Math.random() * SPINNER_ITEMS.length)];
                items.push({ ...randomItem, isWinner: false });
            }
        }
        return items;
    }, [wonItem.id, wonItem.name]);

    useEffect(() => {
        // DOM-BASED OFFSET CALCULATION - reads actual pixel positions
        const calculateAndAnimate = () => {
            // Wait for both refs to be available
            if (!trackRef.current || !winnerRef.current) {
                // Retry if refs not ready
                setTimeout(calculateAndAnimate, 50);
                return;
            }

            // Get actual DOM measurements - no hardcoded pixel math!
            const trackWidth = trackRef.current.offsetWidth;
            const trackCenter = trackWidth / 2;

            // Read ACTUAL position of the winner element
            const winnerEl = winnerRef.current;
            const winnerLeft = winnerEl.offsetLeft;
            const winnerWidth = winnerEl.offsetWidth;
            const winnerCenter = winnerLeft + (winnerWidth / 2);

            // Calculate exact scroll distance to center the winner
            const finalOffset = winnerCenter - trackCenter;

            console.log('Spinner DOM Debug:', {
                trackWidth,
                trackCenter,
                winnerLeft,
                winnerWidth,
                winnerCenter,
                finalOffset,
                wonItem: wonItem.name
            });

            const startTime = Date.now();
            const duration = 4000; // 4 seconds

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Smooth ease-out curve
                const eased = 1 - Math.pow(1 - progress, 4);
                setOffset(eased * finalOffset);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setIsSpinning(false);
                    setTimeout(onComplete, 2000);
                }
            };

            requestAnimationFrame(animate);
        };

        // Small delay to ensure DOM is painted
        setTimeout(calculateAndAnimate, 100);
    }, [onComplete, wonItem.name]);

    const IconComponent = getIcon(wonItem.icon_name);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-zinc-900/95 rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full border border-zinc-800">
                {/* Header */}
                <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-5 text-center border-b border-zinc-700">
                    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                        <Package className="w-6 h-6 text-amber-400" />
                        Opening Tech Chest...
                    </h2>
                </div>

                {/* Spinner Track */}
                <div ref={trackRef} className="relative py-10 overflow-hidden bg-gradient-to-b from-zinc-900 via-black to-zinc-900">
                    {/* Center marker - glowing line */}
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-amber-500/50 via-amber-400 to-amber-500/50 z-10" />
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-amber-500 z-10" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-amber-500 z-10" />

                    {/* Items Row */}
                    <div
                        className="flex transition-none"
                        style={{ transform: `translateX(-${offset}px)` }}
                    >
                        {spinnerItems.map((item, idx) => (
                            <SpinnerItem
                                key={idx}
                                ref={item.isWinner ? winnerRef : null}  // MAGIC: attach ref to winner
                                item={item}
                                isWinner={item.isWinner}
                                isRevealed={!isSpinning}
                            />
                        ))}
                    </div>

                    {/* Edge gradients */}
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none" />
                </div>

                {/* Result Card (shows after spin) */}
                {!isSpinning && (
                    <div className={`p-10 text-center border-t-2 ${wonStyle.border} animate-fadeIn`}>
                        {/* Rarity glow background */}
                        <div className={`relative inline-flex flex-col items-center p-8 rounded-2xl
                                       ${wonStyle.bg} ${wonStyle.glow}`}>
                            {/* Background effect for mythic */}
                            {wonItem.rarity === 'Mythic' && (
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-xl animate-pulse" />
                            )}

                            <IconComponent className={`w-16 h-16 ${wonStyle.icon} relative z-10`} />

                            <div className={`text-sm font-bold uppercase tracking-wider mt-3 relative z-10
                                           ${wonItem.rarity === 'Common' ? 'text-zinc-400' : ''}
                                           ${wonItem.rarity === 'Rare' ? 'text-blue-400' : ''}
                                           ${wonItem.rarity === 'Legendary' ? 'text-yellow-400' : ''}
                                           ${wonItem.rarity === 'Mythic' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500' : ''}`}>
                                {wonItem.rarity}
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mt-5">{wonItem.name}</h3>
                        <p className="text-zinc-500 text-sm mt-2 w-full text-center px-4">{wonItem.description}</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
            `}</style>
        </div>
    );
}

export default function LootButton({ embedded = false, onClose = null }) {
    const { user, updateUser } = useAuth();
    const [credits, setCredits] = useState(user?.chest_credits || 0);
    const [isOpening, setIsOpening] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [wonItem, setWonItem] = useState(null);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        setCredits(user?.chest_credits || 0);
    }, [user?.chest_credits]);

    const handleOpenChest = async () => {
        if (credits <= 0) return;

        setIsOpening(true);
        try {
            const result = await openChest();
            if (result.success && result.item) {
                const newCredits = result.credits_remaining ?? credits - 1;
                setCredits(newCredits);
                updateUser({ chest_credits: newCredits });
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
        if (onClose) onClose();
    };

    const handleSpinAgain = async () => {
        setShowResult(false);
        setWonItem(null);
        await handleOpenChest();
    };

    // Full embedded mode (for modal display)
    if (embedded) {
        const WonIcon = wonItem ? getIcon(wonItem.icon_name) : null;
        const wonStyle = wonItem ? getRarityStyle(wonItem.rarity) : null;

        return (
            <>
                <div className="bg-zinc-900/95 rounded-2xl p-6 min-w-[320px] border border-zinc-800 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-400" />
                            Tech Chest
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Chest visualization */}
                    <div className="flex items-center justify-center py-6">
                        <div className={`w-28 h-28 rounded-2xl border-2 border-amber-500/50 
                                       bg-gradient-to-br from-amber-500/20 to-orange-600/20
                                       flex items-center justify-center
                                       shadow-xl shadow-amber-500/20
                                       ${credits > 0 ? 'animate-pulse' : 'opacity-50'}`}>
                            <Package className="w-14 h-14 text-amber-400" />
                        </div>
                    </div>

                    {/* Open button */}
                    <button
                        onClick={handleOpenChest}
                        disabled={credits <= 0 || isOpening}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all
                                  flex items-center justify-center gap-2
                                  ${credits > 0
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-black hover:brightness-110'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                    >
                        {isOpening ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                {credits > 0 ? 'Open Chest' : 'No Keys Available'}
                            </>
                        )}
                    </button>

                    <p className="text-xs text-zinc-500 text-center mt-3">
                        Earn keys by logging 2+ hours of productive work
                    </p>
                </div>

                {showSpinner && (
                    <SpinnerModal wonItem={wonItem} onComplete={handleSpinComplete} />
                )}

                {showResult && wonItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                        onClick={closeResult}>
                        <div className="bg-zinc-900/95 rounded-2xl p-10 max-w-md min-w-80 border border-zinc-800 shadow-2xl text-center"
                            onClick={e => e.stopPropagation()}>
                            <div className={`inline-flex flex-col items-center p-8 rounded-2xl
                                           ${wonStyle.bg} ${wonStyle.glow}`}>
                                {wonItem.rarity === 'Mythic' && (
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-xl animate-pulse pointer-events-none z-0" />
                                )}
                                <WonIcon className={`w-16 h-16 ${wonStyle.icon} relative z-10`} />
                            </div>

                            <h3 className="text-2xl font-bold text-white mt-5">{wonItem.name}</h3>
                            <p className={`text-sm font-bold uppercase tracking-wider mt-2
                                         ${wonItem.rarity === 'Common' ? 'text-zinc-400' : ''}
                                         ${wonItem.rarity === 'Rare' ? 'text-blue-400' : ''}
                                         ${wonItem.rarity === 'Legendary' ? 'text-yellow-400' : ''}
                                         ${wonItem.rarity === 'Mythic' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500' : ''}`}>
                                {wonItem.rarity}
                            </p>
                            <p className="text-zinc-500 text-sm mt-4 text-center">{wonItem.description}</p>

                            <div className="flex gap-3 mt-6">
                                {credits > 0 && (
                                    <button
                                        onClick={handleSpinAgain}
                                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 
                                                 text-black font-medium hover:brightness-110 transition-all"
                                    >
                                        Open Another ({credits} keys)
                                    </button>
                                )}
                                <button
                                    onClick={closeResult}
                                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 
                                             hover:bg-zinc-700 transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Compact button mode
    return (
        <button
            onClick={handleOpenChest}
            disabled={credits <= 0 || isOpening}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
                      ${credits > 0
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 hover:brightness-110 border border-amber-500/30'
                    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}
        >
            <Gift className="w-5 h-5" />
            <span>Open Chest</span>
            {credits > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                    {credits}
                </span>
            )}
        </button>
    );
}
