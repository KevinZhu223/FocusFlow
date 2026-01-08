/**
 * FocusFlow - Profile Page
 * User profile with bio, badges, level progress, and data export
 * Full-width layout with responsive grid
 */

import { useState, useEffect } from 'react';
import {
    User, Settings, Download, Loader2, Check, Edit2,
    Award, Calendar, Activity, TrendingUp, Package,
    ToggleLeft, ToggleRight, Globe
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getProfile, updateProfile, exportData, getCollection } from '../api';
import ItemCard from '../components/ItemCard';

// Badge icon mapping
function getBadgeIcon(iconName) {
    const Icon = LucideIcons[iconName];
    return Icon || LucideIcons.Award;
}

function LevelProgress({ levelProgress }) {
    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 
                                  flex items-center justify-center text-white font-bold text-2xl
                                  shadow-lg shadow-indigo-500/30">
                        {levelProgress.level}
                    </div>
                    <div>
                        <div className="text-lg font-semibold text-zinc-100">Level {levelProgress.level}</div>
                        <div className="text-sm text-zinc-500">{levelProgress.xp} XP total</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold gradient-text">{levelProgress.progress_percent}%</div>
                    <div className="text-sm text-zinc-500">to Level {levelProgress.next_level}</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-zinc-800/80 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500
                             shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                    style={{ width: `${levelProgress.progress_percent}%` }}
                />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>{levelProgress.xp_in_level} XP earned</span>
                <span>{levelProgress.xp_for_next_level} XP needed</span>
            </div>
        </div>
    );
}

function BadgeGrid({ badges }) {
    if (!badges || badges.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8 text-center">
                <Award className="w-12 h-12 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-500">No badges earned yet</p>
                <p className="text-sm text-zinc-600 mt-1">Keep logging activities to earn badges!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map(userBadge => {
                const badge = userBadge.badge;
                const BadgeIcon = getBadgeIcon(badge.icon_name);

                return (
                    <div
                        key={userBadge.id}
                        className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 
                                 hover:border-amber-500/50 transition-colors"
                    >
                        <BadgeIcon className="w-10 h-10 text-amber-400 mb-3" />
                        <h4 className="font-semibold text-zinc-100">{badge.name}</h4>
                        <p className="text-sm text-zinc-500 mt-1">{badge.description}</p>
                        <p className="text-xs text-zinc-600 mt-3">
                            Earned {new Date(userBadge.earned_at).toLocaleDateString()}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function StatsGrid({ stats }) {
    const statItems = [
        { label: 'Total Activities', value: stats.total_activities, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Total Score', value: stats.total_score?.toFixed(1), icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { label: 'Member Since', value: stats.member_since ? new Date(stats.member_since).toLocaleDateString() : 'N/A', icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10' }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statItems.map(stat => (
                <div key={stat.label} className="glass-card p-5 text-center group hover:border-zinc-600/50 transition-all">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-xl ${stat.bg} flex items-center justify-center`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-zinc-100">{stat.value}</div>
                    <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
                </div>
            ))}
        </div>
    );
}

const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6'
];

const RARITY_COLORS = {
    Common: { bg: 'bg-zinc-700', border: 'border-zinc-600', text: 'text-zinc-400' },
    Rare: { bg: 'bg-blue-900/50', border: 'border-blue-500/50', text: 'text-blue-400' },
    Legendary: { bg: 'bg-purple-900/50', border: 'border-purple-500/50', text: 'text-purple-400' },
    Mythic: { bg: 'bg-amber-900/50', border: 'border-amber-500/50', text: 'text-amber-400' }
};

function VaultSection() {
    const [collection, setCollection] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        fetchCollection();
    }, []);

    const fetchCollection = async () => {
        try {
            const res = await getCollection();
            setCollection(res);
        } catch (err) {
            console.error('Failed to fetch collection:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRepair = async (item) => {
        try {
            const { repairItem } = await import('../api');
            const result = await repairItem(item.user_item_id);
            if (result.success) {
                // Refresh collection
                fetchCollection();
            }
        } catch (err) {
            console.error('Failed to repair item:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8">
                <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                </div>
            </div>
        );
    }

    const allItems = collection?.all_items || [];
    const brokenCount = collection?.broken_count || 0;
    const chestCredits = collection?.chest_credits || 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                    <Package className="w-6 h-6 text-amber-400" />
                    Tech Vault
                    <span className="text-sm font-normal text-zinc-500 ml-2">
                        {collection?.owned_count || 0} / {collection?.total_items || 0} collected
                    </span>
                </h2>
                {brokenCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                        <span>{brokenCount} broken</span>
                        <span className="text-zinc-500">• {chestCredits} credits</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {allItems.map(item => (
                    <div
                        key={item.id}
                        className="group relative"
                        onClick={() => item.owned && setSelectedItem(item)}
                    >
                        <ItemCard
                            item={item}
                            owned={item.owned}
                            count={item.count}
                            isBroken={item.is_broken}
                            size="normal"
                            onRepair={item.is_broken ? handleRepair : null}
                        />

                        {/* Hover tooltip */}
                        {item.owned && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
                                          bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 rounded-lg 
                                          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                                          whitespace-nowrap z-10 shadow-xl text-center">
                                <div className="text-sm text-zinc-100 font-medium">{item.name}</div>
                                <div className={`text-xs ${item.rarity === 'Common' ? 'text-zinc-400' :
                                    item.rarity === 'Rare' ? 'text-blue-400' :
                                        item.rarity === 'Legendary' ? 'text-yellow-400' :
                                            'text-purple-400'
                                    }`}>{item.rarity}</div>
                                <div className="text-xs text-zinc-500 mt-1 max-w-[200px] whitespace-normal">
                                    {item.description}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editColor, setEditColor] = useState('#6366f1');
    const [editBirthYear, setEditBirthYear] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await getProfile();
            setProfile(res);
            setEditName(res.user?.name || '');
            setEditBio(res.user?.bio || '');
            setEditColor(res.user?.avatar_color || '#6366f1');
            setEditBirthYear(res.user?.birth_year || '');
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                name: editName,
                bio: editBio,
                avatar_color: editColor,
                birth_year: editBirthYear ? parseInt(editBirthYear) : null
            });
            await fetchProfile();
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await exportData();
        } catch (err) {
            console.error('Failed to export data:', err);
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const user = profile?.user;

    return (
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                                  flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">Profile</h1>
                        <p className="text-sm text-zinc-500">Manage your account and view achievements</p>
                    </div>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 
                                 text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Card */}
            <div className="glass-card p-6">
                <div className="flex items-start gap-5">
                    {/* Avatar */}
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shrink-0
                                 shadow-lg"
                        style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
                    >
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>

                    {isEditing ? (
                        /* Edit Mode */
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 
                                             rounded-xl text-zinc-100 focus:outline-none focus:border-indigo-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Bio</label>
                                <textarea
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="Tell us about yourself..."
                                    className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 
                                             rounded-xl text-zinc-100 placeholder:text-zinc-600
                                             focus:outline-none focus:border-indigo-500/50 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Avatar Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVATAR_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setEditColor(color)}
                                            className={`w-9 h-9 rounded-full transition-transform
                                                      ${editColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-zinc-400 mb-1.5">Birth Year (for time projection)</label>
                                <input
                                    type="number"
                                    value={editBirthYear}
                                    onChange={(e) => setEditBirthYear(e.target.value)}
                                    placeholder="e.g., 1998"
                                    min="1920"
                                    max={new Date().getFullYear()}
                                    className="w-full px-4 py-2.5 bg-zinc-800/50 border border-zinc-700/50 
                                             rounded-xl text-zinc-100 placeholder:text-zinc-600
                                             focus:outline-none focus:border-indigo-500/50"
                                />
                                <p className="text-xs text-zinc-500 mt-1">Used to calculate life projection analytics</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 
                                             text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* View Mode */
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-zinc-100">{user?.name}</h2>
                            <p className="text-sm text-zinc-500">{user?.email}</p>
                            {user?.bio ? (
                                <p className="text-zinc-400 mt-3 leading-relaxed">{user.bio}</p>
                            ) : (
                                <p className="text-zinc-600 mt-3 italic">No bio yet. Click Edit to add one!</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Level Progress */}
            {profile?.level_progress && (
                <LevelProgress levelProgress={profile.level_progress} />
            )}

            {/* Stats */}
            {profile?.stats && (
                <StatsGrid stats={profile.stats} />
            )}

            {/* Badges */}
            <div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    <Award className="w-6 h-6 text-amber-400" />
                    Badges
                </h2>
                <BadgeGrid badges={profile?.badges} />
            </div>

            {/* The Vault - Collection */}
            <VaultSection />

            {/* Privacy Settings */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${profile?.user?.is_public ? 'bg-emerald-500/20' : 'bg-zinc-700/50'}`}>
                            <Globe className={`w-5 h-5 ${profile?.user?.is_public ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        </div>
                        <div>
                            <h3 className="text-base font-medium text-zinc-100">Public Profile</h3>
                            <p className="text-sm text-zinc-500">
                                {profile?.user?.is_public ? 'Visible on leaderboard' : 'Hidden from leaderboard'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            const newValue = !profile?.user?.is_public;
                            await updateProfile({ is_public: newValue });
                            fetchProfile();
                        }}
                        className={`p-1 rounded-lg transition-all ${profile?.user?.is_public ? 'text-emerald-400' : 'text-zinc-500'}`}
                    >
                        {profile?.user?.is_public ? (
                            <ToggleRight className="w-10 h-10" />
                        ) : (
                            <ToggleLeft className="w-10 h-10" />
                        )}
                    </button>
                </div>
            </div>

            {/* Data Export */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-zinc-700/50">
                            <Download className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-medium text-zinc-100">Export Your Data</h3>
                            <p className="text-sm text-zinc-500">Download activities as CSV</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-700/50
                                 text-zinc-200 hover:bg-zinc-600/50 disabled:opacity-50 transition-colors
                                 text-sm font-medium"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
