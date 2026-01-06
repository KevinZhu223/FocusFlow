/**
 * FocusFlow - Correlation Card
 * Phase 6: Data Science insight card showing mock correlation analysis
 */

import { Sparkles, TrendingUp, Activity } from 'lucide-react';

// Mock correlation insights
const MOCK_INSIGHTS = [
    {
        primary: "Health",
        secondary: "Career",
        correlation: "+15%",
        message: "On days you log Health activities, your Career duration increases by ~15%."
    },
    {
        primary: "Morning sessions",
        secondary: "productivity",
        correlation: "+22%",
        message: "Your productivity score is 22% higher on days with morning activities."
    },
    {
        primary: "Consistency",
        secondary: "streaks",
        correlation: "3+ days",
        message: "Users who log 3+ consecutive days see 40% better goal completion."
    }
];

export default function CorrelationCard() {
    // Pick a random insight (in production, this would be calculated from real data)
    const insight = MOCK_INSIGHTS[Math.floor(Math.random() * MOCK_INSIGHTS.length)];

    return (
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 
                       border border-indigo-500/30 rounded-xl p-5">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                    <h3 className="font-medium text-indigo-300 flex items-center gap-2">
                        <span>Smart Insight</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                            AI Analysis
                        </span>
                    </h3>
                    <p className="text-zinc-300 mt-2 text-sm leading-relaxed">
                        {insight.message}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5" />
                            Based on your activity patterns
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400">
                            <TrendingUp className="w-3.5 h-3.5" />
                            {insight.correlation}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
