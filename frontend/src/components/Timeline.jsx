import { ListChecks, Inbox } from 'lucide-react';
import ActivityCard from './ActivityCard';

/**
 * Timeline Component
 * Displays a chronological list of today's activities
 */
export default function Timeline({ activities, onDeleteActivity, isLoading }) {
    // Show empty state if no activities
    if (!isLoading && activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-medium text-zinc-400 mb-2">
                    No activities yet
                </h3>
                <p className="text-sm text-zinc-500 max-w-xs">
                    Start logging your activities above. Type something like
                    "Studied for 2 hours" or "Went to the gym".
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-medium text-zinc-200">
                    Today's Activities
                </h2>
                <span className="ml-auto text-sm text-zinc-500">
                    {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                </span>
            </div>

            {/* Activity List */}
            <div className="space-y-3">
                {activities.map((activity, index) => (
                    <div
                        key={activity.id}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <ActivityCard
                            activity={activity}
                            onDelete={onDeleteActivity}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
