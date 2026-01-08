/**
 * FocusFlow - Item Card Component
 * Displays collectible tech relics with rarity-based styling
 */

import { Lock, Wrench } from 'lucide-react';
import { getIcon, getRarityStyle } from '../utils/iconMap';

export default function ItemCard({
    item,
    owned = false,
    count = 0,
    isBroken = false,
    showName = true,
    size = 'normal', // 'small', 'normal', 'large'
    onClick = null,
    onRepair = null
}) {
    const IconComponent = getIcon(item?.icon_name);
    const rarity = item?.rarity || 'Common';
    const style = getRarityStyle(rarity);

    const sizeClasses = {
        small: 'w-16 h-20',
        normal: 'w-24 h-32',
        large: 'w-32 h-44',
    };

    const iconSizes = {
        small: 'w-6 h-6',
        normal: 'w-10 h-10',
        large: 'w-12 h-12',
    };

    const isClickable = onClick && owned && !isBroken;

    return (
        <div
            className={`relative flex flex-col items-center justify-center gap-2 p-3
                       rounded-xl border backdrop-blur-sm transition-all duration-300
                       ${sizeClasses[size]}
                       ${owned ? style.bg : 'bg-zinc-900/50'}
                       ${owned ? style.border : 'border-zinc-800/50'}
                       ${owned && !isBroken ? style.glow : ''}
                       ${owned && !isBroken ? style.animation : ''}
                       ${!owned ? 'opacity-40' : ''}
                       ${isBroken ? 'grayscale opacity-60' : ''}
                       ${isClickable ? 'cursor-pointer hover:scale-105 hover:brightness-110' : ''}
                       group`}
            onClick={isClickable ? onClick : undefined}
        >
            {/* Rarity glow effect for higher tiers */}
            {owned && !isBroken && (rarity === 'Legendary' || rarity === 'Mythic') && (
                <div className={`absolute inset-0 rounded-xl blur-md opacity-30
                               ${rarity === 'Mythic'
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                        : 'bg-yellow-500/50'}`}
                />
            )}

            {/* Icon */}
            <div className="relative z-10">
                {owned ? (
                    <IconComponent
                        className={`${iconSizes[size]} ${style.icon} transition-all
                                  ${rarity === 'Mythic' ? 'fill-current' : ''}`}
                        strokeWidth={rarity === 'Mythic' ? 1.5 : 2}
                    />
                ) : (
                    <Lock className={`${iconSizes[size]} text-zinc-600`} />
                )}
            </div>

            {/* Name */}
            {showName && size !== 'small' && (
                <div className={`text-xs text-center line-clamp-2 leading-tight z-10
                               ${owned ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {item?.name || 'Unknown'}
                </div>
            )}

            {/* Count badge */}
            {owned && count > 1 && !isBroken && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full 
                              bg-zinc-800 border border-zinc-700
                              flex items-center justify-center text-xs font-medium text-zinc-300 z-10">
                    {count}
                </div>
            )}

            {/* Broken overlay */}
            {isBroken && (
                <div className="absolute inset-0 flex flex-col items-center justify-center 
                              rounded-xl bg-red-950/50 border border-red-500/30 z-20">
                    <span className="text-xs font-bold text-red-400 tracking-wider">BROKEN</span>
                    {onRepair && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRepair(item);
                            }}
                            className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded 
                                     bg-red-500/20 hover:bg-red-500/30 transition-colors
                                     text-xs text-red-300"
                        >
                            <Wrench className="w-3 h-3" />
                            Repair
                        </button>
                    )}
                </div>
            )}

            {/* Rarity indicator dot */}
            <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full z-10
                           ${rarity === 'Common' ? 'bg-zinc-500' : ''}
                           ${rarity === 'Rare' ? 'bg-blue-400' : ''}
                           ${rarity === 'Legendary' ? 'bg-yellow-400' : ''}
                           ${rarity === 'Mythic' ? 'bg-gradient-to-r from-purple-400 to-pink-500' : ''}`}
            />
        </div>
    );
}

/**
 * Item Card for spinning animation (larger, more dramatic)
 */
export function SpinningItemCard({ item, isRevealing = false }) {
    const IconComponent = getIcon(item?.icon_name);
    const rarity = item?.rarity || 'Common';
    const style = getRarityStyle(rarity);

    return (
        <div className={`relative flex flex-col items-center justify-center p-6
                        w-40 h-52 rounded-2xl border-2 backdrop-blur-xl
                        transition-all duration-500 transform
                        ${style.bg} ${style.border}
                        ${isRevealing ? `${style.glow} scale-110` : 'scale-100'}
                        ${isRevealing && (rarity === 'Legendary' || rarity === 'Mythic')
                ? 'animate-pulse' : ''}`}>

            {/* Background glow for reveal */}
            {isRevealing && (
                <div className={`absolute inset-0 rounded-2xl blur-xl opacity-50
                               ${rarity === 'Mythic' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : ''}
                               ${rarity === 'Legendary' ? 'bg-yellow-500' : ''}
                               ${rarity === 'Rare' ? 'bg-blue-500' : ''}
                               ${rarity === 'Common' ? 'bg-zinc-500' : ''}`}
                />
            )}

            {/* Icon */}
            <IconComponent
                className={`w-16 h-16 ${style.icon} transition-all z-10
                          ${isRevealing ? 'animate-bounce' : ''}`}
            />

            {/* Name */}
            <div className="mt-4 text-sm font-medium text-zinc-200 text-center z-10">
                {item?.name}
            </div>

            {/* Rarity */}
            <div className={`mt-1 text-xs font-bold uppercase tracking-wider z-10
                           ${rarity === 'Common' ? 'text-zinc-500' : ''}
                           ${rarity === 'Rare' ? 'text-blue-400' : ''}
                           ${rarity === 'Legendary' ? 'text-yellow-400' : ''}
                           ${rarity === 'Mythic' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500' : ''}`}>
                {rarity}
            </div>
        </div>
    );
}
