/**
 * FocusFlow - Register Page
 * New user registration with name, email, and password
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register, isLoading: authLoading } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const passwordsMatch = password === confirmPassword && password.length > 0;
    const passwordValid = password.length >= 6;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (!passwordValid) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!passwordsMatch) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            await register(email, name, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isSubmitting = isLoading || authLoading;

    return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 
                                  flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-100">FocusFlow</h1>
                        <p className="text-sm text-zinc-500">Smart Productivity Tracker</p>
                    </div>
                </div>

                {/* Register Card */}
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 backdrop-blur-sm">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-6 text-center">
                        Create your account
                    </h2>

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 
                                      flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm text-zinc-400 mb-2">
                                Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none z-10" />
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 bg-zinc-800/50 border border-zinc-700/50 
                                             rounded-xl text-zinc-100 placeholder:text-zinc-600
                                             focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50
                                             disabled:opacity-50 transition-colors"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm text-zinc-400 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none z-10" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 bg-zinc-800/50 border border-zinc-700/50 
                                             rounded-xl text-zinc-100 placeholder:text-zinc-600
                                             focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50
                                             disabled:opacity-50 transition-colors"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm text-zinc-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none z-10" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 bg-zinc-800/50 border border-zinc-700/50 
                                             rounded-xl text-zinc-100 placeholder:text-zinc-600
                                             focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50
                                             disabled:opacity-50 transition-colors"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '3rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 
                                             hover:text-zinc-300 transition-colors z-10"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {password.length > 0 && (
                                <p className={`mt-1 text-xs ${passwordValid ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                    {passwordValid ? '✓ Password is long enough' : 'Must be at least 6 characters'}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm text-zinc-400 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none z-10" />
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 bg-zinc-800/50 border border-zinc-700/50 
                                             rounded-xl text-zinc-100 placeholder:text-zinc-600
                                             focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50
                                             disabled:opacity-50 transition-colors"
                                    style={{ paddingLeft: '2.5rem', paddingRight: '3rem' }}
                                />
                                {confirmPassword.length > 0 && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                                        {passwordsMatch ? (
                                            <Check className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-red-400" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 
                                     rounded-xl text-white font-medium
                                     hover:from-indigo-600 hover:to-purple-700
                                     focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create account'
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="mt-6 text-center text-sm text-zinc-500">
                        Already have an account?{' '}
                        <Link
                            to="/login"
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
