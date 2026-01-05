/**
 * FocusFlow - Auth Context
 * Manages authentication state across the application
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, register as apiRegister, setToken, getToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check for existing token on mount
    useEffect(() => {
        const initAuth = async () => {
            const token = getToken();
            if (token) {
                try {
                    const response = await getMe();
                    setUser(response.user);
                } catch (err) {
                    console.error('Token validation failed:', err);
                    setToken(null);
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiLogin(email, password);
            // Save token to localStorage FIRST before React state
            if (response.token) {
                localStorage.setItem('focusflow_token', response.token);
            }
            setToken(response.token);
            setUser(response.user);
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(async (email, name, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiRegister(email, name, password);
            // Save token to localStorage FIRST before React state
            if (response.token) {
                localStorage.setItem('focusflow_token', response.token);
            }
            setToken(response.token);
            setUser(response.user);
            return response;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
