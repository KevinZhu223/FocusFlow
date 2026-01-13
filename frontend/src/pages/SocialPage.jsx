/**
 * FocusFlow - Social/Friends Page
 * Phase 5: Friend list, add friends, and pending requests
 */

import { useState, useEffect } from 'react';
import {
    Users, UserPlus, Mail, Check, X, Loader2,
    Clock, UserCheck, Search, Sparkles, Trophy
} from 'lucide-react';
import { getFriends, sendFriendRequest, acceptFriendRequest, removeFriend } from '../api';
import UserProfileModal from '../components/UserProfileModal';

export default function SocialPage() {
    const [friendData, setFriendData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        try {
            const data = await getFriends();
            setFriendData(data);
        } catch (err) {
            console.error('Failed to fetch friends:', err);
            setError('Failed to load friends');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsSending(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await sendFriendRequest(email.trim());
            setSuccessMessage(result.message || 'Friend request sent!');
            setEmail('');
            await fetchFriends();
        } catch (err) {
            setError(err.message || 'Failed to send request');
        } finally {
            setIsSending(false);
        }
    };

    const handleAccept = async (friendshipId) => {
        try {
            await acceptFriendRequest(friendshipId);
            await fetchFriends();
        } catch (err) {
            setError(err.message || 'Failed to accept request');
        }
    };

    const handleDecline = async (friendshipId) => {
        try {
            await removeFriend(friendshipId);
            await fetchFriends();
        } catch (err) {
            setError(err.message || 'Failed to decline request');
        }
    };

    const handleRemoveFriend = async (friendshipId) => {
        if (!confirm('Remove this friend?')) return;
        try {
            await removeFriend(friendshipId);
            await fetchFriends();
        } catch (err) {
            setError(err.message || 'Failed to remove friend');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const friends = friendData?.friends || [];
    const pendingReceived = friendData?.pending_received || [];
    const pendingSent = friendData?.pending_sent || [];

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                              flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Friends</h1>
                    <p className="text-sm text-zinc-500">
                        Connect with other productivity enthusiasts
                    </p>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    {successMessage}
                </div>
            )}

            {/* Add Friend Form */}
            <div className="glass-card p-5">
                <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email or username..."
                        className="flex-1 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                                 text-zinc-100 placeholder:text-zinc-500
                                 focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={isSending || !email.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl
                                 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all
                                 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <UserPlus className="w-5 h-5" />
                        )}
                        Add Friend
                    </button>
                </form>
            </div>

            {/* Pending Requests Received */}
            {pendingReceived.length > 0 && (
                <div className="glass-card p-5 border-amber-500/30">
                    <h2 className="text-base font-medium text-amber-400 mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Friend Requests ({pendingReceived.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingReceived.map(request => (
                            <div
                                key={request.id}
                                className="flex items-center justify-between bg-zinc-800/50 rounded-xl p-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: request.requester?.avatar_color || '#6366f1' }}
                                    >
                                        {request.requester?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-zinc-100">{request.requester?.name}</div>
                                        <div className="text-xs text-zinc-500">Level {request.requester?.level}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleAccept(request.id)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30
                                                 text-sm font-medium flex items-center gap-1.5 transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleDecline(request.id)}
                                        className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List Section */}
            <div>
                <h2 className="text-base font-medium text-zinc-300 mb-4 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Your Friends
                    {friends.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                            {friends.length}
                        </span>
                    )}
                </h2>

                {friends.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friends.map(friend => (
                            <div
                                key={friend.friendship_id}
                                className="glass-card p-4 group hover:border-zinc-600/50 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg
                                                 shadow-lg cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
                                        style={{ backgroundColor: friend.user?.avatar_color || '#6366f1' }}
                                        onClick={() => setSelectedUserId(friend.user?.id)}
                                        title="View profile"
                                    >
                                        {friend.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-zinc-100 truncate">{friend.user?.name}</div>
                                        <div className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Trophy className="w-3 h-3 text-amber-400" />
                                            Level {friend.user?.level}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveFriend(friend.friendship_id)}
                                        className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10
                                                 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remove friend"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="glass-card p-8 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20
                                      flex items-center justify-center">
                            <Users className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-200 mb-1">No friends yet</h3>
                        <p className="text-sm text-zinc-500 mb-6">
                            Connect with friends to compare progress and stay motivated!
                        </p>

                        {/* Benefits */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                            <div className="p-4 bg-zinc-800/30 rounded-xl">
                                <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                                <p className="text-xs text-zinc-400">Compete on leaderboards</p>
                            </div>
                            <div className="p-4 bg-zinc-800/30 rounded-xl">
                                <Sparkles className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                                <p className="text-xs text-zinc-400">Compare productivity scores</p>
                            </div>
                            <div className="p-4 bg-zinc-800/30 rounded-xl">
                                <UserCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                <p className="text-xs text-zinc-400">Stay accountable together</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pending Sent */}
            {pendingSent.length > 0 && (
                <div className="glass-card p-4">
                    <h2 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Pending Requests Sent ({pendingSent.length})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {pendingSent.map(request => (
                            <div
                                key={request.id}
                                className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg text-sm group"
                            >
                                <span className="text-zinc-300">{request.receiver?.name}</span>
                                <button
                                    onClick={() => handleDecline(request.id)}
                                    className="text-zinc-600 hover:text-red-400 transition-colors"
                                    title="Cancel request"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
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

