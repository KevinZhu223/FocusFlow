/**
 * FocusFlow - Icon Map Utility
 * Maps backend icon names to Lucide React components
 */

import {
    FileCode, Coffee, Bug, Terminal, GitCommit, Keyboard, Binary, Cable,
    MemoryStick, HardDrive, Database, Wifi, Shield, CircuitBoard,
    Cpu, Cloud, Boxes, Bot, Atom, Sparkles, Lock, Package
} from 'lucide-react';

// Map backend icon_name strings to Lucide React components
export const ICON_MAP = {
    // Common tier
    "FileCode": FileCode,
    "Coffee": Coffee,
    "Bug": Bug,
    "Terminal": Terminal,
    "GitCommit": GitCommit,
    "Keyboard": Keyboard,
    "Binary": Binary,
    "Cable": Cable,

    // Rare tier
    "MemoryStick": MemoryStick,
    "HardDrive": HardDrive,
    "Database": Database,
    "Wifi": Wifi,
    "Shield": Shield,
    "CircuitBoard": CircuitBoard,

    // Legendary tier
    "Cpu": Cpu,
    "Cloud": Cloud,
    "Boxes": Boxes,
    "Bot": Bot,

    // Mythic tier
    "Atom": Atom,
    "Sparkles": Sparkles,
};

// Fallback icon for unknown icon names
export const FALLBACK_ICON = Package;

// Get icon component by name with fallback
export function getIcon(iconName) {
    return ICON_MAP[iconName] || FALLBACK_ICON;
}

// Rarity styling configurations
export const RARITY_STYLES = {
    Common: {
        border: 'border-zinc-600',
        icon: 'text-zinc-400',
        bg: 'bg-zinc-900/80',
        glow: '',
        animation: '',
    },
    Rare: {
        border: 'border-blue-500/60',
        icon: 'text-blue-400',
        bg: 'bg-blue-950/30',
        glow: 'shadow-lg shadow-blue-500/20',
        animation: '',
    },
    Legendary: {
        border: 'border-yellow-500/60',
        icon: 'text-yellow-400',
        bg: 'bg-yellow-950/20',
        glow: 'shadow-lg shadow-yellow-500/30',
        animation: 'animate-pulse',
    },
    Mythic: {
        border: 'border-purple-400/60',
        icon: 'text-purple-400',
        bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
        glow: 'shadow-xl shadow-purple-500/40',
        animation: '',
    },
};

// Get rarity style with fallback
export function getRarityStyle(rarity) {
    return RARITY_STYLES[rarity] || RARITY_STYLES.Common;
}
