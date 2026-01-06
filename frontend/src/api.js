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
 * Get activities for a specific date
 */
export async function getActivities(date = null) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const response = await fetch(`${API_BASE}/activities?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get dashboard statistics
 */
export async function getDashboard(date = null) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

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

// ============================================
// Insights API
// ============================================

/**
 * Get daily AI-powered insights
 */
export async function getDailyInsights(date = null) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const response = await fetch(`${API_BASE}/insights/daily?${params}`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get heatmap data for the last 365 days
 */
export async function getHeatmapData() {
    const response = await fetch(`${API_BASE}/activities/heatmap`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

// ============================================
// Goals API
// ============================================

/**
 * Get all goals with progress
 */
export async function getGoals() {
    const response = await fetch(`${API_BASE}/goals`, {
        headers: getHeaders(),
    });
    return handleResponse(response);
}

/**
 * Create or update a goal
 */
export async function createGoal(category, targetValue, timeframe, title = null) {
    const response = await fetch(`${API_BASE}/goals`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            category,
            target_value: targetValue,
            timeframe,
            title
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
 */
export async function getLeaderboard() {
    const response = await fetch(`${API_BASE}/leaderboard`, {
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
 * Send a friend request by email
 */
export async function sendFriendRequest(email) {
    const response = await fetch(`${API_BASE}/friends/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email }),
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
