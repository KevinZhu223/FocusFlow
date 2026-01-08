/**
 * FocusFlow - Leaderboard Page
 * Weekly productivity rankings with Global/Friends toggle
 * Phase 5.5: Enhanced UI/UX
 */

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Globe, Users, EyeOff, TrendingUp, Loader2, Flame } from 'lucide-react';
import { getLeaderboard, getProfile, getFriends } from '../api';
import { Link as RouterLink } from 'react-router-dom';

const RANK_STYLES = {
    1: {
        bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
        border: 'border-amber-500/40',
        icon: Crown,
        iconColor: 'text-amber-400',
        glow: 'shadow-lg shadow-amber-500/20'
    },
    2: {
        bg: 'bg-gradient-to-r from-zinc-400/15 to-slate-400/15',
        border: 'border-zinc-400/40',
        icon: Medal,
        iconColor: 'text-zinc-300',
        glow: 'shadow-lg shadow-zinc-400/10'
    },
    3: {
        bg: 'bg-gradient-to-r from-orange-600/20 to-amber-600/20',
        border: 'border-orange-500/40',
        icon: Medal,
        iconColor: 'text-orange-400',
        glow: 'shadow-lg shadow-orange-500/10'
    }
};

function LeaderboardRow({ entry, isCurrentUser, rank }) {
    const rankStyle = RANK_STYLES[rank];
    const RankIcon = rankStyle?.icon || null;

    return (
        <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all group
                        ${isCurrentUser
                ? 'bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/20'
                : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50'}
                        ${rankStyle ? `${rankStyle.bg} ${rankStyle.border} ${rankStyle.glow}` : ''}`}>
            {/* Rank */}
            <div className="w-10 text-center shrink-0">
                {RankIcon ? (
                    <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center
                                  ${rank === 1 ? 'bg-amber-500/30' : rank === 2 ? 'bg-zinc-500/30' : 'bg-orange-500/30'}`}>
                        <RankIcon className={`w-5 h-5 ${rankStyle.iconColor}`} />
                    </div>
                ) : (
                    <span className="text-lg font-bold text-zinc-500">#{rank}</span>
                )}
            </div>

            {/* Avatar */}
            <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-lg
                         shadow-lg shrink-0"
                style={{ backgroundColor: entry.avatar_color || '#6366f1' }}
            >
                {entry.name.charAt(0).toUpperCase()}
            </div>

            {/* Name & Level */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100 truncate">{entry.name}</span>
                    {isCurrentUser && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-medium">You</span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-sm text-zinc-500">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    Level {entry.level}
                </div>
            </div>

            {/* Weekly Score */}
            <div className="text-right shrink-0">
                <div className={`text-xl font-bold ${rank <= 3 ? 'gradient-text' : 'text-zinc-100'}`}>
                    {entry.weekly_score.toFixed(1)}
                </div>
                <div className="text-xs text-zinc-500">pts</div>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [friendsList, setFriendsList] = useState([]);
    const [viewMode, setViewMode] = useState('global');
    const [isPublic, setIsPublic] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [weekStart, setWeekStart] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [leaderboardRes, profileRes, friendsRes] = await Promise.all([
                getLeaderboard(),
                getProfile(),
                getFriends()
            ]);
            setLeaderboard(leaderboardRes.leaderboard || []);
            setWeekStart(leaderboardRes.week_start);
            setIsPublic(profileRes.user?.is_public || false);
            setCurrentUserId(profileRes.user?.id);

            const friends = friendsRes.friends || [];
            const friendIds = friends.map(f => f.user?.id).filter(Boolean);
            setFriendsList(friendIds);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const displayedLeaderboard = viewMode === 'friends'
        ? leaderboard.filter(entry =>
            friendsList.includes(entry.user_id) || entry.user_id === currentUserId
        )
        : leaderboard;

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-5">
            {/* Private User Banner */}
            {!isPublic && (
                <div className="glass-card p-4 border-amber-500/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <EyeOff className="w-4 h-4 text-amber-400" />
                        </div>
                        <p className="text-amber-200 text-sm flex-1">
                            You're hidden from the leaderboard.{' '}
                            <RouterLink to="/profile" className="underline hover:text-amber-100 font-medium">
                                Enable public profile
                            </RouterLink>{' '}
                            to compete!
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 
                                  flex items-center justify-center shadow-lg shadow-amber-500/20">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">Leaderboard</h1>
                        <p className="text-sm text-zinc-500">
                            Week of {weekStart ? new Date(weekStart).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            }) : '...'}
                        </p>
                    </div>
                </div>

                {/* Global/Friends Toggle */}
                <div className="flex items-center gap-1 p-1 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
                    <button
                        onClick={() => setViewMode('global')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                  ${viewMode === 'global'
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                        <Globe className="w-4 h-4" />
                        Global
                    </button>
                    <button
                        onClick={() => setViewMode('friends')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                  ${viewMode === 'friends'
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                        <Users className="w-4 h-4" />
                        Friends
                    </button>
                </div>
            </div>

            {/* Your Rank Summary */}
            {currentUserId && (() => {
                const userRank = leaderboard.findIndex(e => e.user_id === currentUserId) + 1;
                const userEntry = leaderboard.find(e => e.user_id === currentUserId);
                if (userEntry && userRank > 0) {
                    return (
                        <div className="glass-card p-4 border-indigo-500/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/20">
                                        <Flame className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div>
                                        <span className="text-sm text-zinc-400">Your Rank</span>
                                        <div className="text-xl font-bold text-indigo-400">#{userRank}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm text-zinc-400">This Week</span>
                                    <div className="text-xl font-bold text-zinc-100">{userEntry.weekly_score.toFixed(1)} <span className="text-sm text-zinc-500 font-normal">pts</span></div>
                                </div>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Leaderboard */}
            {displayedLeaderboard.length > 0 ? (
                <div className="space-y-2">
                    {displayedLeaderboard.map((entry, index) => (
                        <LeaderboardRow
                            key={entry.user_id}
                            entry={entry}
                            rank={index + 1}
                            isCurrentUser={entry.user_id === currentUserId}
                        />
                    ))}
                </div>
            ) : (
                <div className="glass-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20
                                  flex items-center justify-center">
                        <Trophy className="w-8 h-8 text-amber-400" />
                    </div>
                    {viewMode === 'friends' ? (
                        <>
                            <p className="text-lg font-medium text-zinc-300">No friends on leaderboard</p>
                            <p className="text-sm text-zinc-500 mt-1">Add friends to compare scores!</p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-medium text-zinc-300">No rankings yet</p>
                            <p className="text-sm text-zinc-500 mt-1">Be the first to enable public ranking!</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

