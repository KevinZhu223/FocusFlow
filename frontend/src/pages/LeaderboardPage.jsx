/**
 * FocusFlow - Leaderboard Page
 * Weekly productivity rankings with Global/Friends/Seasons tabs
 * Phase 4: Added Seasons tab for global competitive seasons
 */

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Globe, Users, EyeOff, TrendingUp, Loader2, Flame, Calendar, Clock } from 'lucide-react';
import { getLeaderboard, getProfile, getFriends, getCurrentSeason, getSeasonLeaderboard } from '../api';
import { Link as RouterLink } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';

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

function LeaderboardRow({ entry, isCurrentUser, rank, scoreLabel = 'pts', onClick }) {
    const rankStyle = RANK_STYLES[rank];
    const RankIcon = rankStyle?.icon || null;
    const score = entry.weekly_score ?? entry.score ?? 0;

    return (
        <div
            onClick={() => !isCurrentUser && onClick?.(entry.user_id)}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all group
                        ${isCurrentUser
                    ? 'bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/20'
                    : 'bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer'}
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

            {/* Score */}
            <div className="text-right shrink-0">
                <div className={`text-xl font-bold ${rank <= 3 ? 'gradient-text' : 'text-zinc-100'}`}>
                    {score.toFixed(1)}
                </div>
                <div className="text-xs text-zinc-500">{scoreLabel}</div>
            </div>
        </div>
    );
}

function SeasonBanner({ season, daysRemaining }) {
    if (!season) return null;

    return (
        <div className="glass-card p-5 border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-500/20">
                        <Calendar className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-100">{season.name}</h3>
                        <p className="text-sm text-zinc-400">{season.description || 'Compete globally for exclusive rewards!'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 text-amber-400">
                        <Clock className="w-4 h-4" />
                        <span className="font-bold text-lg">{daysRemaining}</span>
                        <span className="text-sm text-zinc-500">days left</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [seasonLeaderboard, setSeasonLeaderboard] = useState([]);
    const [friendsList, setFriendsList] = useState([]);
    const [viewMode, setViewMode] = useState('global'); // global, friends, season
    const [isPublic, setIsPublic] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [weekStart, setWeekStart] = useState('');
    const [currentSeason, setCurrentSeason] = useState(null);
    const [daysRemaining, setDaysRemaining] = useState(0);
    const [userSeasonRank, setUserSeasonRank] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [leaderboardRes, profileRes, friendsRes, seasonRes] = await Promise.all([
                getLeaderboard(),
                getProfile(),
                getFriends(),
                getCurrentSeason().catch(() => ({ season: null }))
            ]);

            setLeaderboard(leaderboardRes.leaderboard || []);
            setWeekStart(leaderboardRes.week_start);
            setIsPublic(profileRes.user?.is_public || false);
            setCurrentUserId(profileRes.user?.id);

            const friends = friendsRes.friends || [];
            const friendIds = friends.map(f => f.user?.id).filter(Boolean);
            setFriendsList(friendIds);

            // Season data
            if (seasonRes.season) {
                setCurrentSeason(seasonRes.season);
                setDaysRemaining(seasonRes.days_remaining || 0);

                // Fetch season leaderboard
                try {
                    const seasonLbRes = await getSeasonLeaderboard();
                    setSeasonLeaderboard(seasonLbRes.leaderboard || []);
                    setUserSeasonRank(seasonLbRes.user_rank);
                } catch (e) {
                    console.error('Failed to fetch season leaderboard:', e);
                }
            }
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
        : viewMode === 'season'
            ? seasonLeaderboard
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

            {/* Season Banner */}
            {viewMode === 'season' && currentSeason && (
                <SeasonBanner season={currentSeason} daysRemaining={daysRemaining} />
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
                            {viewMode === 'season' && currentSeason
                                ? currentSeason.name
                                : `Week of ${weekStart ? new Date(weekStart).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric'
                                }) : '...'}`}
                        </p>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
                    <button
                        onClick={() => setViewMode('global')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                  ${viewMode === 'global'
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                                : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                        <Globe className="w-4 h-4" />
                        Weekly
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
                    {currentSeason && (
                        <button
                            onClick={() => setViewMode('season')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                      ${viewMode === 'season'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                                    : 'text-zinc-400 hover:text-zinc-200'}`}
                        >
                            <Calendar className="w-4 h-4" />
                            Season
                        </button>
                    )}
                </div>
            </div>

            {/* Your Rank Summary */}
            {currentUserId && (() => {
                const lb = viewMode === 'season' ? seasonLeaderboard : leaderboard;
                const userRank = viewMode === 'season'
                    ? userSeasonRank
                    : lb.findIndex(e => e.user_id === currentUserId) + 1;
                const userEntry = lb.find(e => e.user_id === currentUserId);

                if (userEntry && userRank > 0) {
                    const score = userEntry.weekly_score ?? userEntry.score ?? 0;
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
                                    <span className="text-sm text-zinc-400">
                                        {viewMode === 'season' ? 'Season Score' : 'This Week'}
                                    </span>
                                    <div className="text-xl font-bold text-zinc-100">
                                        {score.toFixed(1)} <span className="text-sm text-zinc-500 font-normal">pts</span>
                                    </div>
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
                            rank={entry.rank || index + 1}
                            isCurrentUser={entry.user_id === currentUserId || entry.is_you}
                            scoreLabel={viewMode === 'season' ? 'season pts' : 'pts'}
                            onClick={(userId) => setSelectedUserId(userId)}
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
                    ) : viewMode === 'season' ? (
                        <>
                            <p className="text-lg font-medium text-zinc-300">No active season</p>
                            <p className="text-sm text-zinc-500 mt-1">Check back soon for the next season!</p>
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-medium text-zinc-300">No rankings yet</p>
                            <p className="text-sm text-zinc-500 mt-1">Be the first to enable public ranking!</p>
                        </>
                    )}
                </div>
            )}

            {/* Profile Modal */}
            <UserProfileModal
                userId={selectedUserId}
                isOpen={!!selectedUserId}
                onClose={() => setSelectedUserId(null)}
            />
        </div>
    );
}
