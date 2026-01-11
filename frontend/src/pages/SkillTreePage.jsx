/**
 * FocusFlow - Skill Trees Page
 * Phase 4: RPG-style category progression with unlockable perks
 */

import { useState, useEffect } from 'react';
import {
    Code, Heart, Users, Palette, Shield,
    Lock, Check, Star, Loader2, ChevronRight,
    Sparkles, Award
} from 'lucide-react';
import { getSkillTrees } from '../api';

// Map icon names to components
const ICONS = {
    Code,
    Heart,
    Users,
    Palette,
    Shield
};

/**
 * Single Tier Node
 */
function TierNode({ tier, isUnlocked, isCurrent, color }) {
    return (
        <div className="flex items-center gap-4">
            {/* Node Circle */}
            <div
                className={`relative w-14 h-14 rounded-full flex items-center justify-center
                          border-2 transition-all
                          ${isUnlocked
                        ? 'border-opacity-100 shadow-lg'
                        : 'border-zinc-700 bg-zinc-900/50'}`}
                style={{
                    borderColor: isUnlocked ? color : undefined,
                    backgroundColor: isUnlocked ? `${color}20` : undefined,
                    boxShadow: isCurrent ? `0 0 20px ${color}50` : undefined
                }}
            >
                {isUnlocked ? (
                    <Check className="w-6 h-6" style={{ color }} />
                ) : (
                    <Lock className="w-5 h-5 text-zinc-600" />
                )}

                {/* Level Badge */}
                <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs 
                               flex items-center justify-center font-bold
                               ${isUnlocked ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-500'}`}>
                    {tier.level}
                </span>
            </div>

            {/* Tier Info */}
            <div className="flex-1">
                <h4 className={`font-medium ${isUnlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                    {tier.name}
                </h4>
                <p className="text-xs text-zinc-500">{tier.xp_required.toLocaleString()} XP</p>

                {/* Perk */}
                <div className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
                              ${isUnlocked
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-zinc-800/50 text-zinc-600'}`}>
                    {isUnlocked ? <Sparkles className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span className="font-medium">{tier.perk}</span>
                </div>
                {isUnlocked && (
                    <p className="text-xs text-zinc-500 mt-1 ml-1">{tier.perk_description}</p>
                )}
            </div>
        </div>
    );
}

/**
 * Skill Tree Card
 */
function SkillTreeCard({ tree }) {
    const [expanded, setExpanded] = useState(false);
    const Icon = ICONS[tree.icon] || Code;

    return (
        <div
            className="glass-card p-5 transition-all hover:border-zinc-700/80"
            style={{ borderColor: expanded ? `${tree.color}30` : undefined }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Icon */}
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${tree.color}20` }}
                >
                    <Icon className="w-7 h-7" style={{ color: tree.color }} />
                </div>

                {/* Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-100">{tree.name}</h3>
                        {tree.max_tier && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
                                MAXED
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-zinc-500">{tree.description}</p>

                    {/* Current Tier */}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-zinc-400">
                            Tier {tree.current_tier.level}: {tree.current_tier.name}
                        </span>
                    </div>
                </div>

                {/* Progress */}
                <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: tree.color }}>
                        {tree.total_xp.toLocaleString()}
                    </div>
                    <div className="text-xs text-zinc-500">XP</div>
                </div>

                <ChevronRight
                    className={`w-5 h-5 text-zinc-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
            </div>

            {/* Progress Bar */}
            {!tree.max_tier && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Progress to Tier {tree.current_tier.level + 1}</span>
                        <span>{tree.progress_percent}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${tree.progress_percent}%`,
                                backgroundColor: tree.color
                            }}
                        />
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                        {tree.xp_to_next.toLocaleString()} XP to next tier
                    </p>
                </div>
            )}

            {/* Expanded: All Tiers */}
            {expanded && (
                <div className="mt-6 space-y-4 pl-2 border-l-2" style={{ borderColor: `${tree.color}30` }}>
                    {tree.tiers.map((tier, index) => (
                        <TierNode
                            key={tier.level}
                            tier={tier}
                            isUnlocked={tier.level <= tree.current_tier.level}
                            isCurrent={tier.level === tree.current_tier.level}
                            color={tree.color}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Main Skill Trees Page
 */
export default function SkillTreePage() {
    const [skillTrees, setSkillTrees] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSkillTrees();
    }, []);

    const fetchSkillTrees = async () => {
        try {
            setLoading(true);
            const data = await getSkillTrees();
            setSkillTrees(data.skill_trees || {});
        } catch (err) {
            console.error('Failed to fetch skill trees:', err);
            setError('Failed to load skill trees');
        } finally {
            setLoading(false);
        }
    };

    // Calculate total unlocked perks
    const totalPerks = Object.values(skillTrees).reduce((sum, tree) => {
        return sum + (tree.current_tier?.level || 0);
    }, 0);

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20">
                        <Award className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">Skill Trees</h1>
                        <p className="text-sm text-zinc-500">Level up categories to unlock perks</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xl font-bold text-amber-400">{totalPerks}</div>
                        <div className="text-xs text-zinc-500">Perks Unlocked</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
            ) : error ? (
                <div className="text-center py-20 text-red-400">{error}</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.values(skillTrees).map(tree => (
                        <SkillTreeCard key={tree.tree_id} tree={tree} />
                    ))}
                </div>
            )}
        </div>
    );
}
