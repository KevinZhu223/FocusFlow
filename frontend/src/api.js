/**
 * FocusFlow - API Service
 * Handles all communication with the Flask backend
 * Phase 2: Added auth and insights endpoints
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
 */
export async function logActivity(text) {
    const response = await fetch(`${API_BASE}/log_activity`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ text }),
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
// Utility API
// ============================================

/**
 * Health check for the API
 */
export async function checkHealth() {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
}
