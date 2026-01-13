/**
 * FocusFlow - Challenges Page
 * Sprint 3: Friend Challenges feature
 * Display and manage challenges with friends
 */

import { useState, useEffect } from 'react';
import {
    Swords, Trophy, Clock, Check, X, Plus,
    UserPlus, Target, Loader2, AlertCircle, Crown
} from 'lucide-react';
import {
    getChallenges, createChallenge, acceptChallenge,
    declineChallenge, getActiveChallenges, getFriends, getCurrentUserId
} from '../api';

/**
 * Challenge Card Component
 */
function ChallengeCard({ challenge, currentUserId, onAccept, onDecline, onRefresh }) {
    const isCreator = challenge.creator_id === currentUserId;
    const isPending = challenge.status === 'pending';
    const isActive = challenge.status === 'active';
    const isCompleted = challenge.status === 'completed';
    const isWinner = challenge.winner_id === currentUserId;

    const opponent = isCreator ? challenge.opponent : challenge.creator;
    // Use pre-calculated scores from backend (handles user context correctly)
    const myScore = challenge.my_score ?? (isCreator ? challenge.creator_score : challenge.opponent_score);
    const theirScore = challenge.their_score ?? (isCreator ? challenge.opponent_score : challenge.creator_score);

    const getStatusColor = () => {
        if (isCompleted && isWinner) return 'border-emerald-500/50 bg-emerald-500/10';
        if (isCompleted && !isWinner && challenge.winner_id) return 'border-red-500/50 bg-red-500/10';
        if (isActive) return 'border-amber-500/50 bg-amber-500/10';
        if (isPending) return 'border-indigo-500/50 bg-indigo-500/10';
        return 'border-zinc-700/50';
    };

    const formatTimeRemaining = (seconds) => {
        if (!seconds) return '';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        if (days > 0) return `${days}d ${hours}h left`;
        if (hours > 0) return `${hours}h left`;
        return 'Ending soon';
    };

    return (
        <div className={`glass-card p-5 border-2 transition-all ${getStatusColor()}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-semibold text-zinc-100 text-lg">{challenge.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500">
                        {challenge.category && (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs">
                                {challenge.category}
                            </span>
                        )}
                        <span>{challenge.timeframe}</span>
                    </div>
                </div>
                {isCompleted && challenge.winner_id && (
                    <div className={`p-2 rounded-lg ${isWinner ? 'bg-emerald-500/20' : 'bg-zinc-800/50'}`}>
                        <Crown className={`w-5 h-5 ${isWinner ? 'text-emerald-400' : 'text-zinc-600'}`} />
                    </div>
                )}
            </div>

            {/* Opponent Info */}
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-zinc-800/50">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: opponent?.avatar_color || '#6366f1' }}
                >
                    {opponent?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                    <p className="text-sm text-zinc-400">vs</p>
                    <p className="font-medium text-zinc-100">{opponent?.name || 'Unknown'}</p>
                </div>
            </div>

            {/* Score Display (for active/completed) */}
            {(isActive || isCompleted) && (
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-lg bg-zinc-900/50">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-400">+{myScore?.toFixed(0) || 0}</p>
                        <p className="text-xs text-zinc-500">Your Score</p>
                    </div>
                    <div className="flex items-center justify-center">
                        <Swords className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-orange-400">+{theirScore?.toFixed(0) || 0}</p>
                        <p className="text-xs text-zinc-500">Their Score</p>
                    </div>
                </div>
            )}

            {/* Time Remaining */}
            {isActive && challenge.time_remaining && (
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
                    <Clock className="w-4 h-4" />
                    {formatTimeRemaining(challenge.time_remaining)}
                </div>
            )}

            {/* Actions for Pending (opponent only) */}
            {isPending && !isCreator && (
                <div className="flex gap-2">
                    <button
                        onClick={() => onAccept(challenge.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                                 bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
                    >
                        <Check className="w-4 h-4" />
                        Accept
                    </button>
                    <button
                        onClick={() => onDecline(challenge.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                                 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Decline
                    </button>
                </div>
            )}

            {/* Status for Creator on Pending */}
            {isPending && isCreator && (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                    <Clock className="w-4 h-4" />
                    Waiting for {opponent?.name} to accept...
                </div>
            )}

            {/* Result */}
            {isCompleted && (
                <div className={`text-center p-2 rounded-lg ${isWinner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    {isWinner ? '🎉 You won!' : challenge.winner_id ? 'Challenge lost' : 'It\'s a tie!'}
                </div>
            )}
        </div>
    );
}

/**
 * Create Challenge Modal
 */
function CreateChallengeModal({ isOpen, onClose, friends, onCreate }) {
    const [title, setTitle] = useState('');
    const [opponentId, setOpponentId] = useState('');
    const [category, setCategory] = useState('');
    const [timeframe, setTimeframe] = useState('weekly');
    const [targetHours, setTargetHours] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!opponentId) return;

        setIsSubmitting(true);
        try {
            await onCreate({
                opponent_id: parseInt(opponentId),
                title: title || 'Weekly Challenge',
                category: category || null,
                timeframe,
                target_hours: targetHours
            });
            onClose();
        } catch (err) {
            console.error('Failed to create challenge:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-300">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-semibold text-zinc-100 mb-6 flex items-center gap-2">
                    <Swords className="w-5 h-5 text-amber-400" />
                    Create Challenge
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Challenge a Friend</label>
                        <select
                            value={opponentId}
                            onChange={(e) => setOpponentId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 
                                     text-zinc-100 focus:outline-none focus:border-indigo-500"
                            required
                        >
                            <option value="">Select a friend</option>
                            {friends?.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Challenge Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Weekly Productivity Battle"
                            className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 
                                     text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">Category (Optional)</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 
                                         text-zinc-100 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">All Categories</option>
                                <option value="career">💼 Career</option>
                                <option value="health">❤️ Health</option>
                                <option value="education">📚 Education</option>
                                <option value="chores">🏠 Chores</option>
                                <option value="social">👥 Social</option>
                                <option value="leisure">🎮 Leisure (Limit Challenge)</option>
                            </select>
                            <p className="text-xs text-zinc-500 mt-1">
                                {category === 'leisure'
                                    ? '⚠️ Leisure has negative scores - lowest score wins!'
                                    : 'Highest productivity score wins'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm text-zinc-400 mb-1">Duration</label>
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 
                                         text-zinc-100 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="daily">1 Day</option>
                                <option value="weekly">1 Week</option>
                                <option value="monthly">1 Month</option>
                            </select>
                        </div>
                    </div>

                    {/* Challenge Info */}
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            <strong className="text-zinc-300">How it works:</strong> Log activities during the challenge period.
                            {category === 'leisure'
                                ? ' For Leisure challenges, the person with the LOWEST screen time/gaming wins!'
                                : ' Your productivity scores are totaled - highest score wins!'}
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !opponentId}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600
                                 text-white font-semibold hover:from-amber-600 hover:to-orange-700
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-all
                                 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Swords className="w-4 h-4" />
                        )}
                        Send Challenge
                    </button>
                </form>
            </div>
        </div>
    );
}

/**
 * Main Challenges Page
 */
export default function ChallengesPage() {
    const [challenges, setChallenges] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const currentUserId = getCurrentUserId();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [challengesRes, friendsRes] = await Promise.all([
                getChallenges(),
                getFriends()
            ]);
            setChallenges(challengesRes.challenges || []);
            // Backend already returns only accepted friends in the 'friends' array
            // Each friend object has structure: { friendship_id, user: {...} }
            const friendsList = friendsRes.friends || [];
            setFriends(friendsList.map(f => f.user).filter(Boolean));
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load challenges');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (challengeId) => {
        try {
            await acceptChallenge(challengeId);
            fetchData();
        } catch (err) {
            console.error('Failed to accept challenge:', err);
        }
    };

    const handleDecline = async (challengeId) => {
        try {
            await declineChallenge(challengeId);
            fetchData();
        } catch (err) {
            console.error('Failed to decline challenge:', err);
        }
    };

    const handleCreate = async (data) => {
        await createChallenge(data);
        fetchData();
    };

    // Separate challenges by status
    const pendingForMe = challenges.filter(c => c.status === 'pending' && c.opponent_id === currentUserId);
    const pendingFromMe = challenges.filter(c => c.status === 'pending' && c.creator_id === currentUserId);
    const activeChallenges = challenges.filter(c => c.status === 'active');
    const completedChallenges = challenges.filter(c => c.status === 'completed');

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                        <Swords className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">Challenges</h1>
                        <p className="text-sm text-zinc-500">Compete with friends to stay productive</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                             bg-gradient-to-r from-amber-500 to-orange-600
                             text-white font-medium hover:from-amber-600 hover:to-orange-700
                             transition-all"
                >
                    <Plus className="w-4 h-4" />
                    New Challenge
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                </div>
            ) : (
                <>
                    {/* Pending Challenges You Received */}
                    {pendingForMe.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-400" />
                                Challenge Invites ({pendingForMe.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pendingForMe.map(c => (
                                    <ChallengeCard
                                        key={c.id}
                                        challenge={c}
                                        currentUserId={currentUserId}
                                        onAccept={handleAccept}
                                        onDecline={handleDecline}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Active Challenges */}
                    {activeChallenges.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5 text-amber-400" />
                                Active Challenges ({activeChallenges.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeChallenges.map(c => (
                                    <ChallengeCard
                                        key={c.id}
                                        challenge={c}
                                        currentUserId={currentUserId}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Pending Challenges You Sent */}
                    {pendingFromMe.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-zinc-400" />
                                Pending Sent ({pendingFromMe.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {pendingFromMe.map(c => (
                                    <ChallengeCard
                                        key={c.id}
                                        challenge={c}
                                        currentUserId={currentUserId}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Completed Challenges */}
                    {completedChallenges.length > 0 && (
                        <section>
                            <h2 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                Completed ({completedChallenges.length})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {completedChallenges.map(c => (
                                    <ChallengeCard
                                        key={c.id}
                                        challenge={c}
                                        currentUserId={currentUserId}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Empty State */}
                    {challenges.length === 0 && (
                        <div className="text-center py-16">
                            <Swords className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-zinc-400 mb-2">No Challenges Yet</h3>
                            <p className="text-zinc-500 mb-6">Challenge a friend to see who can be more productive!</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                                         bg-gradient-to-r from-amber-500 to-orange-600
                                         text-white font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Create Your First Challenge
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Create Modal */}
            <CreateChallengeModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                friends={friends}
                onCreate={handleCreate}
            />
        </div>
    );
}
