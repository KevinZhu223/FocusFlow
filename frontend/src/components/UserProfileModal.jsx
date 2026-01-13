/**
 * FocusFlow - User Profile Modal
 * Modal for viewing public profiles of other users
 */

import { useState, useEffect } from 'react';
import {
    X, User, Trophy, Activity, Calendar, Award, Shield, Loader2,
    UserPlus, UserCheck
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getUserProfile, sendFriendRequest } from '../api';

function getBadgeIcon(iconName) {
    const Icon = LucideIcons[iconName];
    return Icon || LucideIcons.Award;
}

export default function UserProfileModal({ userId, isOpen, onClose }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sendingRequest, setSendingRequest] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchProfile();
        }
    }, [isOpen, userId]);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getUserProfile(userId);
            setProfile(res);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSendFriendRequest = async () => {
        setSendingRequest(true);
        try {
            await sendFriendRequest({ user_id: userId });
            // Refresh profile to update friend status
            await fetchProfile();
        } catch (err) {
            console.error('Failed to send friend request:', err);
        } finally {
            setSendingRequest(false);
        }
    };

    if (!isOpen) return null;

    const user = profile?.user;
    const stats = profile?.stats;
    const badges = profile?.badges || [];
    const levelProgress = profile?.level_progress;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-400 text-lg font-medium mb-2">
                            {error === 'This profile is private' ? 'Private Profile' : 'Error'}
                        </p>
                        <p className="text-zinc-500 text-sm">
                            {error === 'This profile is private'
                                ? 'This user has set their profile to private.'
                                : error}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg"
                                style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
                            >
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold text-zinc-100">{user?.name}</h2>
                                    {profile?.is_friend && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                            <UserCheck className="w-3 h-3" />
                                            Friend
                                        </span>
                                    )}
                                </div>
                                {user?.bio && (
                                    <p className="text-sm text-zinc-400">{user.bio}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 text-sm">
                                    <span className="flex items-center gap-1 text-amber-400">
                                        <Trophy className="w-4 h-4" />
                                        Level {levelProgress?.level || 1}
                                    </span>
                                    <span className="text-zinc-500">•</span>
                                    <span className="text-zinc-400">
                                        {user?.xp?.toLocaleString() || 0} XP
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Add Friend Button */}
                        {!profile?.is_friend && !profile?.is_own_profile && (
                            <button
                                onClick={handleSendFriendRequest}
                                disabled={sendingRequest}
                                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-medium
                                         hover:bg-indigo-700 disabled:opacity-50 transition-colors
                                         flex items-center justify-center gap-2"
                            >
                                {sendingRequest ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <UserPlus className="w-4 h-4" />
                                )}
                                Add Friend
                            </button>
                        )}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                <Activity className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                                <div className="text-lg font-bold text-zinc-100">
                                    {stats?.total_activities || 0}
                                </div>
                                <div className="text-xs text-zinc-500">Activities</div>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                <Trophy className="w-5 h-5 mx-auto mb-2 text-amber-400" />
                                <div className="text-lg font-bold text-zinc-100">
                                    {stats?.total_score?.toFixed(0) || 0}
                                </div>
                                <div className="text-xs text-zinc-500">Total Score</div>
                            </div>
                            <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
                                <Award className="w-5 h-5 mx-auto mb-2 text-purple-400" />
                                <div className="text-lg font-bold text-zinc-100">
                                    {badges.length}
                                </div>
                                <div className="text-xs text-zinc-500">Badges</div>
                            </div>
                        </div>

                        {/* Level Progress */}
                        {levelProgress && (
                            <div className="bg-zinc-800/50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-zinc-400">Level Progress</span>
                                    <span className="text-sm font-medium text-indigo-400">
                                        {levelProgress.progress_percent}%
                                    </span>
                                </div>
                                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                        style={{ width: `${levelProgress.progress_percent}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Badges */}
                        {badges.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-zinc-400 mb-3">
                                    Earned Badges
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {badges.slice(0, 6).map((ub) => {
                                        const BadgeIcon = getBadgeIcon(ub.badge?.icon_name || 'Award');
                                        return (
                                            <div
                                                key={ub.id}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50
                                                         border border-amber-500/20"
                                                title={ub.badge?.description}
                                            >
                                                <BadgeIcon className="w-4 h-4 text-amber-400" />
                                                <span className="text-sm text-zinc-200">
                                                    {ub.badge?.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {badges.length > 6 && (
                                        <div className="flex items-center px-3 py-2 rounded-lg bg-zinc-800/50 text-zinc-500 text-sm">
                                            +{badges.length - 6} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Member Since */}
                        {stats?.member_since && (
                            <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Calendar className="w-4 h-4" />
                                Member since {new Date(stats.member_since).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
