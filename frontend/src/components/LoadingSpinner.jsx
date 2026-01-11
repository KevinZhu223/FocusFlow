/**
 * FocusFlow - Loading Spinner Component
 * Phase 5: Used as Suspense fallback for lazy-loaded pages
 */

import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...' }) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />

                {/* Spinner */}
                <div className="relative p-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
            </div>

            <p className="mt-4 text-sm text-zinc-500 animate-pulse">
                {message}
            </p>
        </div>
    );
}

/**
 * Full page loading state
 */
export function PageLoadingSpinner() {
    return (
        <div className="min-h-[400px] flex items-center justify-center">
            <LoadingSpinner message="Loading page..." />
        </div>
    );
}
