/**
 * FocusFlow - Correlation Card
 * Phase 6: Data Science insight card showing mock correlation analysis
 */

import { Brain, TrendingUp } from 'lucide-react';

// Mock correlation insights
const MOCK_INSIGHTS = [
    {
        primary: "Health",
        secondary: "Career",
        correlation: "+15%",
        message: "Health activities correlate with 15% higher Career productivity."
    },
    {
        primary: "Morning sessions",
        secondary: "productivity",
        correlation: "+22%",
        message: "Your productivity is 22% higher on days with morning activities."
    },
    {
        primary: "Consistency",
        secondary: "streaks",
        correlation: "+40%",
        message: "Logging 3+ consecutive days improves goal completion by 40%."
    }
];

export default function CorrelationCard() {
    // Pick a random insight (in production, this would be calculated from real data)
    const insight = MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)];

    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shrink-0">
                    <Brain className="w-4 h-4 text-cyan-400" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300">
                        {insight.message}
                    </p>
                </div>

                {/* Correlation badge */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">{insight.correlation}</span>
                </div>
            </div>
        </div>
    );
}
