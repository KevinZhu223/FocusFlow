import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

/**
 * ActivityInput Component
 * A prominent text input for logging activities using natural language
 */
export default function ActivityInput({ onSubmit, isLoading }) {
    const [text, setText] = useState('');
    const textareaRef = useRef(null);

    // Auto-focus on mount
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [text]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim() && !isLoading) {
            onSubmit(text.trim());
            setText('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-medium text-zinc-200">
                    Log Your Activity
                </h2>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative rounded-xl bg-zinc-900/80 border border-zinc-800 
                      hover:border-zinc-700 focus-within:border-indigo-500/50 
                      focus-within:ring-2 focus-within:ring-indigo-500/20
                      transition-all duration-200 shadow-lg shadow-black/20">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What did you do today? (e.g., 'Studied for 2 hours' or 'Went to the gym')"
                        disabled={isLoading}
                        rows={1}
                        className="w-full px-4 py-4 pr-14 bg-transparent text-zinc-100 
                     placeholder-zinc-500 resize-none focus:outline-none
                     disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!text.trim() || isLoading}
                        className="absolute right-2 bottom-2 p-2.5 rounded-lg
                     bg-indigo-600 hover:bg-indigo-500 
                     disabled:bg-zinc-700 disabled:cursor-not-allowed
                     transition-all duration-200 group"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 text-zinc-300 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 text-white group-disabled:text-zinc-400 
                             transition-transform group-hover:translate-x-0.5 
                             group-hover:-translate-y-0.5" />
                        )}
                    </button>
                </div>
            </form>

            {/* Helper Text */}
            <p className="mt-3 text-sm text-zinc-500 text-center">
                Describe your activity in natural language.
                <span className="text-zinc-400"> Press Enter to submit.</span>
            </p>
        </div>
    );
}
