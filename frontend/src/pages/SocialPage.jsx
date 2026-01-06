/**
 * FocusFlow - Social/Friends Page
 * Phase 5: Friend list, add friends, and pending requests
 */

import { useState, useEffect } from 'react';
import {
    Users, UserPlus, Mail, Check, X, Loader2,
    Clock, UserCheck, Search
} from 'lucide-react';
import { getFriends, sendFriendRequest, acceptFriendRequest, removeFriend } from '../api';

export default function SocialPage() {
    const [friendData, setFriendData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

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
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    {successMessage}
                </div>
            )}

            {/* Add Friend Form */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
                <h2 className="text-lg font-medium text-zinc-100 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-400" />
                    Add Friend
                </h2>
                <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter friend's email..."
                        className="flex-1 px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl
                                 text-zinc-100 placeholder:text-zinc-500
                                 focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                        type="submit"
                        disabled={isSending || !email.trim()}
                        className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl
                                 hover:bg-indigo-700 disabled:opacity-50 transition-colors
                                 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                    >
                        {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <UserPlus className="w-5 h-5" />
                        )}
                        Send Request
                    </button>
                </form>
            </div>

            {/* Pending Requests Received */}
            {pendingReceived.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                    <h2 className="text-lg font-medium text-amber-400 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Friend Requests ({pendingReceived.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingReceived.map(request => (
                            <div
                                key={request.id}
                                className="flex items-center justify-between bg-zinc-900/50 rounded-xl p-4"
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
                                        <div className="text-sm text-zinc-500">Level {request.requester?.level}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleAccept(request.id)}
                                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDecline(request.id)}
                                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Friends List */}
            <div>
                <h2 className="text-lg font-medium text-zinc-100 mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    Your Friends ({friends.length})
                </h2>

                {friends.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friends.map(friend => (
                            <div
                                key={friend.friendship_id}
                                className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4
                                         hover:border-zinc-700/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                                        style={{ backgroundColor: friend.user?.avatar_color || '#6366f1' }}
                                    >
                                        {friend.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-zinc-100 truncate">{friend.user?.name}</div>
                                        <div className="text-sm text-zinc-500">Level {friend.user?.level}</div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveFriend(friend.friendship_id)}
                                        className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                        <p className="text-lg text-zinc-400">No friends yet</p>
                        <p className="text-sm text-zinc-500 mt-1 mb-6">Connect with friends to compare progress!</p>

                        <div className="bg-zinc-800/50 rounded-xl p-4 text-left max-w-md mx-auto">
                            <p className="text-sm font-medium text-indigo-400 mb-2">💡 Why add friends?</p>
                            <ul className="text-sm text-zinc-400 space-y-2">
                                <li>• See friends on the leaderboard</li>
                                <li>• Compare weekly productivity scores</li>
                                <li>• Stay motivated with friendly competition</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Pending Sent */}
            {pendingSent.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
                    <h2 className="text-sm font-medium text-zinc-400 mb-3">
                        Pending Requests You Sent ({pendingSent.length})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {pendingSent.map(request => (
                            <div
                                key={request.id}
                                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg text-sm"
                            >
                                <span className="text-zinc-300">{request.receiver?.name}</span>
                                <button
                                    onClick={() => handleDecline(request.id)}
                                    className="text-zinc-500 hover:text-red-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
