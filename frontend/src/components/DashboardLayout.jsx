/**
 * FocusFlow - Draggable Dashboard Layout
 * Phase 4: Customizable widget grid using react-grid-layout
 */

import { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import { GripVertical, RotateCcw, Eye, EyeOff } from 'lucide-react';
import 'react-grid-layout/css/styles.css';

const STORAGE_KEY = 'focusflow_dashboard_layout';

// Default layout configuration
const DEFAULT_LAYOUT = [
    { i: 'oracle', x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2 },
    { i: 'coach', x: 0, y: 3, w: 12, h: 2, minW: 6, minH: 2 },
    { i: 'projection', x: 0, y: 5, w: 12, h: 3, minW: 6, minH: 2 },
    { i: 'energy', x: 0, y: 8, w: 12, h: 2, minW: 6, minH: 2 },
    { i: 'streak', x: 0, y: 10, w: 12, h: 2, minW: 6, minH: 2 },
    { i: 'scores', x: 0, y: 12, w: 12, h: 3, minW: 6, minH: 2 },
    { i: 'radar', x: 0, y: 15, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'pie', x: 0, y: 19, w: 12, h: 4, minW: 6, minH: 3 },
];

// Widget visibility defaults
const DEFAULT_VISIBILITY = {
    oracle: true,
    coach: true,
    projection: true,
    energy: true,
    streak: true,
    scores: true,
    radar: true,
    pie: true,
};

/**
 * Draggable Widget Wrapper
 */
function DraggableWidget({ id, title, children, isEditing }) {
    return (
        <div className={`h-full w-full ${isEditing ? 'cursor-move' : ''}`}>
            {isEditing && (
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 
                              rounded bg-zinc-800/90 text-xs text-zinc-400 border border-zinc-700">
                    <GripVertical className="w-3 h-3" />
                    {title}
                </div>
            )}
            <div className={`h-full overflow-hidden ${isEditing ? 'ring-2 ring-indigo-500/30 ring-dashed rounded-xl' : ''}`}>
                {children}
            </div>
        </div>
    );
}

/**
 * Dashboard Layout Controller
 */
export default function DashboardLayout({ children, widgetMap }) {
    const [layout, setLayout] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved).layout : DEFAULT_LAYOUT;
    });

    const [visibility, setVisibility] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved).visibility : DEFAULT_VISIBILITY;
    });

    const [isEditing, setIsEditing] = useState(false);
    const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

    // Save layout on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, visibility }));
    }, [layout, visibility]);

    const handleLayoutChange = (newLayout) => {
        setLayout(newLayout);
    };

    const handleReset = () => {
        setLayout(DEFAULT_LAYOUT);
        setVisibility(DEFAULT_VISIBILITY);
    };

    const toggleVisibility = (widgetId) => {
        setVisibility(prev => ({
            ...prev,
            [widgetId]: !prev[widgetId]
        }));
    };

    const widgetNames = {
        oracle: 'The Oracle',
        coach: 'Coach Insight',
        projection: 'Time Projection',
        energy: 'Energy Battery',
        streak: 'Streak',
        scores: 'Score Cards',
        radar: 'Productivity Radar',
        pie: 'Category Breakdown',
    };

    // Filter layout to only visible widgets
    const visibleLayout = layout.filter(item => visibility[item.i]);

    return (
        <div className="relative">
            {/* Edit Controls */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <button
                    onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                              border transition-colors
                              ${showVisibilityMenu
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
                >
                    <Eye className="w-4 h-4" />
                    Widgets
                </button>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                              border transition-colors
                              ${isEditing
                            ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400'
                            : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
                >
                    <GripVertical className="w-4 h-4" />
                    {isEditing ? 'Done' : 'Edit Layout'}
                </button>
                {isEditing && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                                 bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-zinc-200"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                )}
            </div>

            {/* Visibility Menu */}
            {showVisibilityMenu && (
                <div className="absolute right-0 top-12 z-50 w-56 p-3 rounded-xl 
                              bg-zinc-800 border border-zinc-700 shadow-xl">
                    <p className="text-xs text-zinc-500 mb-2">Toggle Widgets</p>
                    <div className="space-y-1">
                        {Object.entries(widgetNames).map(([id, name]) => (
                            <button
                                key={id}
                                onClick={() => toggleVisibility(id)}
                                className="flex items-center justify-between w-full px-3 py-2 
                                         rounded-lg hover:bg-zinc-700/50 transition-colors"
                            >
                                <span className={visibility[id] ? 'text-zinc-200' : 'text-zinc-500'}>
                                    {name}
                                </span>
                                {visibility[id] ? (
                                    <Eye className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <EyeOff className="w-4 h-4 text-zinc-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Grid Layout */}
            <GridLayout
                className="layout"
                layout={visibleLayout}
                cols={12}
                rowHeight={40}
                width={400}
                onLayoutChange={handleLayoutChange}
                isDraggable={isEditing}
                isResizable={isEditing}
                draggableHandle=".drag-handle"
                compactType="vertical"
                preventCollision={false}
            >
                {visibleLayout.map(item => (
                    <div key={item.i} className={isEditing ? 'drag-handle' : ''}>
                        <DraggableWidget
                            id={item.i}
                            title={widgetNames[item.i]}
                            isEditing={isEditing}
                        >
                            {widgetMap[item.i]}
                        </DraggableWidget>
                    </div>
                ))}
            </GridLayout>
        </div>
    );
}
