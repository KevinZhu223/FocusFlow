/**
 * FocusFlow - Leaderboard Page
 * Weekly productivity rankings with full-width layout
 */

import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { getLeaderboard, getProfile, updateProfile } from '../api';

const RANK_STYLES = {
    1: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', icon: Crown, iconColor: 'text-amber-400' },
    2: { bg: 'bg-zinc-400/20', border: 'border-zinc-400/50', icon: Medal, iconColor: 'text-zinc-300' },
    3: { bg: 'bg-orange-600/20', border: 'border-orange-600/50', icon: Medal, iconColor: 'text-orange-400' }
};

function LeaderboardRow({ entry, isCurrentUser }) {
    const rankStyle = RANK_STYLES[entry.rank];
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
                    <span className="text-xl font-bold text-zinc-500">#{entry.rank}</span>
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
    const [isPublic, setIsPublic] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggling, setIsToggling] = useState(false);
    const [weekStart, setWeekStart] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [leaderboardRes, profileRes] = await Promise.all([
                getLeaderboard(),
                getProfile()
            ]);
            setLeaderboard(leaderboardRes.leaderboard || []);
            setWeekStart(leaderboardRes.week_start);
            setIsPublic(profileRes.user?.is_public || false);
            setCurrentUserId(profileRes.user?.id);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePublic = async () => {
        setIsToggling(true);
        try {
            await updateProfile({ is_public: !isPublic });
            setIsPublic(!isPublic);
            const res = await getLeaderboard();
            setLeaderboard(res.leaderboard || []);
        } catch (err) {
            console.error('Failed to update visibility:', err);
        } finally {
            setIsToggling(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 
                                  flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">Leaderboard</h1>
                        <p className="text-sm text-zinc-500">Week of {weekStart}</p>
                    </div>
                </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                <div>
                    <h3 className="font-medium text-zinc-100">Appear on Leaderboard</h3>
                    <p className="text-sm text-zinc-500">Make your name and score visible to others</p>
                </div>
                <button
                    onClick={handleTogglePublic}
                    disabled={isToggling}
                    className={`p-1 rounded-lg transition-colors ${isPublic ? 'text-emerald-400' : 'text-zinc-500'}`}
                >
                    {isToggling ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                    ) : isPublic ? (
                        <ToggleRight className="w-10 h-10" />
                    ) : (
                        <ToggleLeft className="w-10 h-10" />
                    )}
                </button>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 ? (
                <div className="space-y-3">
                    {leaderboard.map(entry => (
                        <LeaderboardRow
                            key={entry.user_id}
                            entry={entry}
                            isCurrentUser={entry.user_id === currentUserId}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-zinc-500">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No one on the leaderboard yet</p>
                    <p className="text-sm mt-1">Toggle on visibility above to be the first!</p>
                </div>
            )}
        </div>
    );
}
