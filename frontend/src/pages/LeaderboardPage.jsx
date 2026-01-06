/**
 * FocusFlow - Leaderboard Page
 * Weekly productivity rankings with Global/Friends toggle
 * Phase 5.5: Removed duplicate visibility toggle (lives on Profile now)
 */

import { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Crown, Globe, Users, EyeOff, TrendingUp } from 'lucide-react';
import { getLeaderboard, getProfile, getFriends } from '../api';
import { Link as RouterLink } from 'react-router-dom';

const RANK_STYLES = {
    1: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: Crown, iconColor: 'text-amber-400' },
    2: { bg: 'bg-zinc-400/20', border: 'border-zinc-400/50', icon: Medal, iconColor: 'text-zinc-300' },
    3: { bg: 'bg-orange-600/20', border: 'border-orange-600/50', icon: Medal, iconColor: 'text-orange-400' }
};

function LeaderboardRow({ entry, isCurrentUser, rank }) {
    const rankStyle = RANK_STYLES[rank];
    const RankIcon = rankStyle?.icon || null;

    return (
        <div className={`flex items-center gap-4 p-5 rounded-xl border transition-colors
                        ${isCurrentUser ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-900/50 border-zinc-800/50'}
                        ${rankStyle ? rankStyle.bg + ' ' + rankStyle.border : ''}`}>
            {/* Rank */}
            <div className="w-12 text-center">
                {RankIcon ? (
                    <RankIcon className={`w-7 h-7 mx-auto ${rankStyle.iconColor}`} />
                ) : (
                    <span className="text-xl font-bold text-zinc-500">#{rank}</span>
                )}
            </div>

            {/* Avatar */}
            <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ backgroundColor: entry.avatar_color || '#6366f1' }}
            >
                {entry.name.charAt(0).toUpperCase()}
            </div>

            {/* Name & Level */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100 truncate text-lg">{entry.name}</span>
                    {isCurrentUser && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">You</span>
                    )}
                </div>
                <span className="text-sm text-zinc-500">Level {entry.level}</span>
            </div>

            {/* Weekly Score */}
            <div className="text-right">
                <div className="text-2xl font-bold text-zinc-100">{entry.weekly_score.toFixed(1)}</div>
                <div className="text-xs text-zinc-500">points this week</div>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [friendsList, setFriendsList] = useState([]);
    const [viewMode, setViewMode] = useState('global'); // 'global' or 'friends'
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

            // Extract friend user IDs
            const friends = friendsRes.friends || [];
            const friendIds = friends.map(f => f.user?.id).filter(Boolean);
            setFriendsList(friendIds);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter leaderboard based on view mode
    const displayedLeaderboard = viewMode === 'friends'
        ? leaderboard.filter(entry =>
            friendsList.includes(entry.user_id) || entry.user_id === currentUserId
        )
        : leaderboard;

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Private User Banner */}
            {!isPublic && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <EyeOff className="w-5 h-5 text-amber-400 shrink-0" />
                    <p className="text-amber-200 text-sm">
                        You are currently hidden from the leaderboard.{' '}
                        <RouterLink to="/profile" className="underline hover:text-amber-100">
                            Go to Profile
                        </RouterLink>{' '}
                        to enable public ranking.
                    </p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 
                                  flex items-center justify-center">
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
                <div className="flex items-center gap-2 p-1 bg-zinc-800 rounded-xl">
                    <button
                        onClick={() => setViewMode('global')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                                  ${viewMode === 'global'
                                ? 'bg-indigo-600 text-white'
                                : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                        <Globe className="w-4 h-4" />
                        Global
                    </button>
                    <button
                        onClick={() => setViewMode('friends')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                                  ${viewMode === 'friends'
                                ? 'bg-indigo-600 text-white'
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
                if (userEntry) {
                    return (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-indigo-400" />
                                <span className="text-zinc-300">Your Rank:</span>
                                <span className="text-xl font-bold text-indigo-400">#{userRank}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-zinc-400 text-sm">Your Score: </span>
                                <span className="text-lg font-semibold text-zinc-100">{userEntry.weekly_score.toFixed(1)}</span>
                            </div>
                        </div>
                    );
                }
                return null;
            })()}

            {/* Leaderboard */}
            {displayedLeaderboard.length > 0 ? (
                <div className="space-y-3">
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
                <div className="text-center py-16 text-zinc-500">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    {viewMode === 'friends' ? (
                        <>
                            <p className="text-lg">No friends on leaderboard</p>
                            <p className="text-sm mt-1">Add friends to compare scores!</p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg">No one on the leaderboard yet</p>
                            <p className="text-sm mt-1">Be the first to enable public ranking!</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
