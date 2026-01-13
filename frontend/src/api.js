/**
 * FocusFlow - API Service
 * Handles all communication with the Flask backend
 * Phase 3: Added goals, leaderboard, profile, and export endpoints
 */

const API_BASE = '/api';

// Token storage key
const TOKEN_KEY = 'focusflow_token';

/**
 * Get stored auth token
 */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set auth token
 */
export function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
}

/**
 * Get current user ID from JWT token
 * Returns null if no token or invalid token
 */
export function getCurrentUserId() {
    const token = getToken();
    if (!token) return null;

    try {
        // Decode the JWT payload (second part)
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id || null;
    } catch (e) {
        console.error('Failed to decode token:', e);
        return null;
    }
}

/**
 * Get headers with auth token if available
 */
function getHeaders(includeAuth = true) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (includeAuth) {
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}

/**
 * Handle API response
 */
async function handleResponse(response) {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    return response.json();
}

// ============================================
// Auth API
// ============================================

/**
 * Register a new user
 */
export async function register(email, name, password) {
    const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ email, name, password }),
    });
    return handleResponse(response);
}

/**
 * Login with email and password
 */
export async function login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: getHeaders(false),
        body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
}

/**
 * Get current authenticated user
 */
export async function getMe() {
    const response = await fetch(`${API_BASE}/auth/me`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get notification counts for pending friend requests and challenges
 */
export async function getNotificationCounts() {
    const response = await fetch(`${API_BASE}/notifications/count`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Activity API
// ============================================

/**
 * Log a new activity from natural language input
 * Includes local_hour for timezone-aware badge checks
 */
export async function logActivity(text) {
    const response = await fetch(`${API_BASE}/log_activity`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            text,
            local_hour: new Date().getHours()  // Send user's local hour (0-23)
        }),
    });
    return handleResponse(response);
}

/**
 * Get the user's local date in YYYY-MM-DD format
 */
function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get the user's timezone offset in minutes (e.g., -300 for EST)
 */
function getTimezoneOffset() {
    return new Date().getTimezoneOffset();
}

/**
 * Get activities for a specific date
 * Defaults to user's local date if no date provided
 * Passes timezone offset so backend can calculate correct UTC range
 */
export async function getActivities(date = null) {
    const params = new URLSearchParams();
    // Default to user's local date to handle timezone correctly
    const targetDate = date || getLocalDateString();
    params.append('date', targetDate);
    params.append('tz_offset', getTimezoneOffset());

    const response = await fetch(`${API_BASE}/activities?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get dashboard statistics
 * Defaults to user's local date if no date provided
 * Passes timezone offset so backend can calculate correct UTC range
 */
export async function getDashboard(date = null) {
    const params = new URLSearchParams();
    // Default to user's local date to handle timezone correctly
    const targetDate = date || getLocalDateString();
    params.append('date', targetDate);
    params.append('tz_offset', getTimezoneOffset());

    const response = await fetch(`${API_BASE}/dashboard?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Delete an activity by ID
 */
export async function deleteActivity(activityId) {
    const response = await fetch(`${API_BASE}/activities/${activityId}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Update an activity by ID
 * Allows editing activity_name, duration_minutes, and category
 */
export async function updateActivity(activityId, data) {
    const response = await fetch(`${API_BASE}/activities/${activityId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
}

/**
 * Get weekly recap data for the modal
 */
export async function getWeeklyRecap() {
    const response = await fetch(`${API_BASE}/weekly-recap`, {
        method: 'GET',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Insights API
// ============================================

/**
 * Get daily AI-powered insights
 * Passes local date and timezone offset for correct day filtering
 */
export async function getDailyInsights(date = null) {
    const params = new URLSearchParams();
    // Default to user's local date
    const targetDate = date || getLocalDateString();
    params.append('date', targetDate);
    params.append('tz_offset', getTimezoneOffset());

    const response = await fetch(`${API_BASE}/insights/daily?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get heatmap data for the last 365 days
 * Passes timezone offset so activities are grouped by local date
 */
export async function getHeatmapData() {
    const params = new URLSearchParams();
    params.append('tz_offset', getTimezoneOffset());

    const response = await fetch(`${API_BASE}/activities/heatmap?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Oracle AI Analytics API (Phase 7)
// ============================================

/**
 * Get AI-powered Oracle insight
 * Returns the single highest-priority insight for the user
 */
export async function getOracleInsight() {
    const response = await fetch(`${API_BASE}/oracle`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get all Oracle insights
 * Returns list of all available insights sorted by priority
 */
export async function getAllOracleInsights() {
    const response = await fetch(`${API_BASE}/oracle?full=true`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Goals API
// ============================================

/**
 * Get all goals with progress
 * Passes timezone offset so daily/weekly goals use user's local date
 */
export async function getGoals() {
    const tzOffset = getTimezoneOffset();
    const response = await fetch(`${API_BASE}/goals?tz_offset=${tzOffset}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Create a new goal (category is auto-determined by LLM)
 */
export async function createGoal(targetValue, timeframe, title = null, goalType = 'target') {
    const response = await fetch(`${API_BASE}/goals`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            target_value: targetValue,
            timeframe,
            title,
            goal_type: goalType
        }),
    });
    return handleResponse(response);
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId) {
    const response = await fetch(`${API_BASE}/goals/${goalId}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Leaderboard API
// ============================================

/**
 * Get weekly leaderboard
 * Passes timezone offset so week boundaries use user's local date
 */
export async function getLeaderboard() {
    const tzOffset = getTimezoneOffset();
    const response = await fetch(`${API_BASE}/leaderboard?tz_offset=${tzOffset}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Profile API
// ============================================

/**
 * Get user profile with badges
 */
export async function getProfile() {
    const response = await fetch(`${API_BASE}/user/profile`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Update user profile
 */
export async function updateProfile(data) {
    const response = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
}

/**
 * Export user data as CSV (triggers download)
 */
export async function exportData() {
    const token = getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE}/user/export_data`, {
        headers,
    });

    if (!response.ok) {
        throw new Error('Failed to export data');
    }

    // Get the blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusflow_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();

    return { success: true };
}

// ============================================
// Intervention / Watcher API (Phase 4)
// ============================================

/**
 * Get current intervention/gaming status
 */
export async function getInterventionStatus() {
    const response = await fetch(`${API_BASE}/user/intervention_status`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Loot Box / Collection API (Phase 4)
// ============================================

/**
 * Check if user is eligible for a loot chest
 */
export async function getChestStatus() {
    const response = await fetch(`${API_BASE}/user/chest_status`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Open a loot chest
 */
export async function openChest() {
    const response = await fetch(`${API_BASE}/user/open_chest`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get user's item collection
 */
export async function getCollection() {
    const response = await fetch(`${API_BASE}/user/collection`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Repair a broken item by spending chest credits
 */
export async function repairItem(userItemId) {
    const response = await fetch(`${API_BASE}/items/repair/${userItemId}`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get time projection analytics (years wasted on leisure)
 */
export async function getProjection() {
    const response = await fetch(`${API_BASE}/projection`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get morning check-in data (yesterday's summary)
 */
export async function getMorningCheckin() {
    const response = await fetch(`${API_BASE}/morning-checkin`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}


// ============================================
// Friend System API (Phase 5)
// ============================================

/**
 * Get friends and pending requests
 */
export async function getFriends() {
    const response = await fetch(`${API_BASE}/friends`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Send a friend request by email or username
 */
export async function sendFriendRequest(identifier) {
    const response = await fetch(`${API_BASE}/friends/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ identifier }),
    });
    return handleResponse(response);
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId) {
    const response = await fetch(`${API_BASE}/friends/accept`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ friendship_id: friendshipId }),
    });
    return handleResponse(response);
}

/**
 * Remove a friend or decline a request
 */
export async function removeFriend(friendshipId) {
    const response = await fetch(`${API_BASE}/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get public profile of another user
 * @param {number} userId - The user ID to fetch
 */
export async function getUserProfile(userId) {
    const response = await fetch(`${API_BASE}/users/${userId}/profile`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Challenges API (Sprint 3)
// ============================================

/**
 * Get all challenges (created and received)
 */
export async function getChallenges() {
    const response = await fetch(`${API_BASE}/challenges`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Create a new challenge
 */
export async function createChallenge(data) {
    const response = await fetch(`${API_BASE}/challenges`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse(response);
}

/**
 * Accept a pending challenge
 */
export async function acceptChallenge(challengeId) {
    const response = await fetch(`${API_BASE}/challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Decline a pending challenge
 */
export async function declineChallenge(challengeId) {
    const response = await fetch(`${API_BASE}/challenges/${challengeId}/decline`, {
        method: 'POST',
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get active challenges with current scores
 */
export async function getActiveChallenges() {
    const response = await fetch(`${API_BASE}/challenges/active`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Skill Trees API (Phase 4)
// ============================================

/**
 * Get user's skill tree progress
 */
export async function getSkillTrees() {
    const response = await fetch(`${API_BASE}/skill-trees`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get user's unlocked perks
 */
export async function getUnlockedPerks() {
    const response = await fetch(`${API_BASE}/skill-trees/perks`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Seasons API (Phase 4)
// ============================================

/**
 * Get current active season info
 */
export async function getCurrentSeason() {
    const response = await fetch(`${API_BASE}/seasons/current`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get season leaderboard (global Top 100)
 */
export async function getSeasonLeaderboard() {
    const response = await fetch(`${API_BASE}/seasons/leaderboard`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Check for proactive Oracle intervention
 */
export async function getProactiveIntervention() {
    const params = new URLSearchParams();
    params.append('tz_offset', getTimezoneOffset());

    const response = await fetch(`${API_BASE}/oracle/proactive?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Utility API
// ============================================

/**
 * Health check for the API
 */
export async function checkHealth() {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
}

// ============================================
// Deep Data Analytics API (Phase 5)
// ============================================

/**
 * Get full analytics data for the analytics page
 * Passes timezone offset so daily scores are grouped by local date
 */
export async function getFullAnalytics() {
    const params = new URLSearchParams();
    params.append('tz_offset', getTimezoneOffset());

    const response = await fetch(`${API_BASE}/analytics/full?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get actionable productivity insights
 */
export async function getInsights() {
    const response = await fetch(`${API_BASE}/analytics/insights`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get productivity heatmap data (7 days x 24 hours)
 */
export async function getHeatmap() {
    const response = await fetch(`${API_BASE}/analytics/heatmap`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get trend analysis with rolling averages
 * @param {number} days - Number of days to analyze (default 30)
 */
export async function getTrends(days = 30) {
    const response = await fetch(`${API_BASE}/analytics/trends?days=${days}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Export user data as CSV download
 */
export async function exportDataCSV() {
    const response = await fetch(`${API_BASE}/analytics/export`, {
        headers: getHeaders(),
    });

    if (!response.ok) {
        throw new Error('Export failed');
    }

    // Trigger file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusflow_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true };
}

/**
 * Get Work Mode clustering analysis (Flow State Fingerprinting)
 */
export async function getWorkModes() {
    const response = await fetch(`${API_BASE}/analytics/work-modes`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}
