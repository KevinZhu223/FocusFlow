import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, AlertCircle, Dumbbell, BookOpen, Code, Brain, Gamepad2, Coffee, Plus, X } from 'lucide-react';
import FocusTimer from './FocusTimer';

// Default activity templates
const DEFAULT_TEMPLATES = [
    { id: 1, emoji: '🏋️', label: 'Gym', text: 'Went to the gym for 1 hour', icon: Dumbbell, color: 'emerald' },
    { id: 2, emoji: '📚', label: 'Study', text: 'Studied for 2 hours', icon: BookOpen, color: 'blue' },
    { id: 3, emoji: '💻', label: 'Coding', text: 'Coding session for 2 hours', icon: Code, color: 'indigo' },
    { id: 4, emoji: '🧘', label: 'Meditate', text: 'Meditation for 15 minutes', icon: Brain, color: 'violet' },
    { id: 5, emoji: '🎮', label: 'Gaming', text: 'Played video games for 1 hour', icon: Gamepad2, color: 'rose' },
    { id: 6, emoji: '☕', label: 'Break', text: 'Coffee break for 15 minutes', icon: Coffee, color: 'amber' },
];

const COLOR_CLASSES = {
    emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30',
    blue: 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30',
    indigo: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30',
    violet: 'bg-violet-500/20 border-violet-500/40 text-violet-400 hover:bg-violet-500/30',
    rose: 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30',
    amber: 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30',
};

/**
 * ActivityInput Component
 * A prominent text input for logging activities using natural language
 * Now includes integrated Focus Timer and Quick Action Templates
 */
export default function ActivityInput({ onSubmit, isLoading }) {
    const [text, setText] = useState('');
    const [pendingDuration, setPendingDuration] = useState(null);
    const [isHighlighted, setIsHighlighted] = useState(false);
    const [warning, setWarning] = useState(null);
    const [showTemplates, setShowTemplates] = useState(true);
    const [customTemplates, setCustomTemplates] = useState(() => {
        const saved = localStorage.getItem('focusflow_custom_templates');
        return saved ? JSON.parse(saved) : [];
    });
    const textareaRef = useRef(null);

    // Save custom templates to localStorage
    useEffect(() => {
        localStorage.setItem('focusflow_custom_templates', JSON.stringify(customTemplates));
    }, [customTemplates]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }, [text]);

    // Clear warning when text changes
    useEffect(() => {
        if (warning && text.length > 3) {
            setWarning(null);
        }
    }, [text, warning]);

    // Validate input and return warning message if problematic
    const validateInput = (input) => {
        const trimmed = input.trim();

        // Too short (less than 3 chars)
        if (trimmed.length < 3) {
            return "Please describe your activity in more detail.";
        }

        // Only numbers
        if (/^\d+$/.test(trimmed)) {
            return "Please describe what you did, not just a number.";
        }

        // No letters (just symbols/emoji)
        if (!/[a-zA-Z]/.test(trimmed)) {
            return "Please describe your activity using words.";
        }

        // Single short word (less than 8 chars, no spaces)
        const words = trimmed.split(/\s+/).filter(w => w.length > 1);
        if (words.length === 1 && trimmed.length < 8) {
            return "Try adding more detail. Example: 'Studied math for 1 hour'";
        }

        // Very short multi-word but still too brief
        if (words.length < 2 && trimmed.length < 12) {
            return "Please be more specific about what you did.";
        }

        return null; // Valid
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        const trimmedText = text.trim();

        if (!trimmedText || isLoading) return;

        // Validate input
        const validationWarning = validateInput(trimmedText);
        if (validationWarning) {
            setWarning(validationWarning);
            textareaRef.current?.focus();
            return;
        }

        let finalText = trimmedText;

        // If there's a pending duration from the timer, append it
        if (pendingDuration) {
            // Check if user already included a duration in their text
            const hasDuration = /\d+\s*(min|hour|hr|h|m)/i.test(finalText);
            if (!hasDuration) {
                finalText += ` for ${pendingDuration} minutes`;
            }
            setPendingDuration(null);
        }

        onSubmit(finalText);
        setText('');
        setIsHighlighted(false);
        setWarning(null);
    };

    // Quick submit from template - bypasses validation since templates are pre-validated
    const handleTemplateClick = (template) => {
        if (isLoading) return;
        onSubmit(template.text);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Called when timer finishes - highlight input and store duration
    const handleTimerComplete = (minutes) => {
        setPendingDuration(minutes);
        setIsHighlighted(true);

        // Focus the input
        textareaRef.current?.focus();

        // Remove highlight after a few seconds if user doesn't type
        setTimeout(() => {
            setIsHighlighted(false);
        }, 5000);
    };

    // Add current text as a custom template
    const handleAddCustomTemplate = () => {
        const trimmed = text.trim();
        if (!trimmed || trimmed.length < 5) return;

        const newTemplate = {
            id: Date.now(),
            emoji: '⚡',
            label: trimmed.split(' ').slice(0, 2).join(' '),
            text: trimmed,
            color: 'indigo',
            isCustom: true
        };

        setCustomTemplates(prev => [...prev, newTemplate].slice(-5)); // Keep max 5 custom
        setText('');
    };

    const removeCustomTemplate = (id) => {
        setCustomTemplates(prev => prev.filter(t => t.id !== id));
    };

    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Header with Timer */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-medium text-zinc-200">
                        Log Your Activity
                    </h2>
                </div>

                {/* Focus Timer - positioned to the right */}
                <FocusTimer onTimerComplete={handleTimerComplete} />
            </div>

            {/* Quick Action Templates */}
            {showTemplates && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-500 font-medium">Quick Log</span>
                        <button
                            onClick={() => setShowTemplates(false)}
                            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                            Hide
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allTemplates.map((template) => {
                            const Icon = template.icon;
                            return (
                                <button
                                    key={template.id}
                                    onClick={() => handleTemplateClick(template)}
                                    disabled={isLoading}
                                    className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                                              text-sm font-medium transition-all duration-200
                                              disabled:opacity-50 disabled:cursor-not-allowed
                                              hover:scale-105 active:scale-95
                                              ${COLOR_CLASSES[template.color] || COLOR_CLASSES.indigo}`}
                                >
                                    {Icon ? (
                                        <Icon className="w-3.5 h-3.5" />
                                    ) : (
                                        <span>{template.emoji}</span>
                                    )}
                                    <span>{template.label}</span>

                                    {/* Remove button for custom templates */}
                                    {template.isCustom && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeCustomTemplate(template.id);
                                            }}
                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full
                                                     bg-zinc-800 border border-zinc-700 text-zinc-400
                                                     hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400
                                                     opacity-0 group-hover:opacity-100 transition-all
                                                     flex items-center justify-center"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </button>
                            );
                        })}

                        {/* Add custom template button (shows when there's text) */}
                        {text.trim().length >= 5 && (
                            <button
                                onClick={handleAddCustomTemplate}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border
                                         border-dashed border-zinc-700 text-zinc-500
                                         hover:border-indigo-500/50 hover:text-indigo-400
                                         text-sm font-medium transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Save as Quick</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Show templates toggle if hidden */}
            {!showTemplates && (
                <button
                    onClick={() => setShowTemplates(true)}
                    className="mb-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                    Show Quick Actions
                </button>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="relative">
                <div className={`relative rounded-xl bg-zinc-900/80 border 
                      transition-all duration-300 shadow-lg shadow-black/20
                      ${warning
                        ? 'border-amber-500/50 ring-2 ring-amber-500/20'
                        : isHighlighted
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30 animate-highlight'
                            : 'border-zinc-800 hover:border-zinc-700 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20'
                    }`}>

                    {/* Pending duration badge */}
                    {pendingDuration && (
                        <div className="absolute -top-3 left-4 px-2 py-0.5 rounded-full 
                                      bg-emerald-500/20 border border-emerald-500/30
                                      text-emerald-400 text-xs font-medium">
                            ⏱️ {pendingDuration} min tracked
                        </div>
                    )}

                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pendingDuration
                            ? "What were you working on? (e.g., 'Studied math' or 'Worked on project')"
                            : "What did you do today? (e.g., 'Studied for 2 hours' or 'Went to the gym')"
                        }
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

                {/* Warning message */}
                {warning && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg 
                                  bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{warning}</span>
                    </div>
                )}
            </form>

            {/* Helper Text */}
            <p className="mt-3 text-sm text-zinc-500 text-center">
                {pendingDuration ? (
                    <span className="text-emerald-400">
                        Describe what you did. Duration will be added automatically!
                    </span>
                ) : (
                    <>
                        Use quick actions above or describe your activity.
                        <span className="text-zinc-400"> Press Enter to submit.</span>
                    </>
                )}
            </p>

            {/* Highlight animation */}
            <style>{`
                @keyframes highlight-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    50% { box-shadow: 0 0 20px 4px rgba(16, 185, 129, 0.2); }
                }
                .animate-highlight {
                    animation: highlight-pulse 1.5s ease-in-out 3;
                }
            `}</style>
        </div>
    );
}
