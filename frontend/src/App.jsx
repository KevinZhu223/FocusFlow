import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  Zap, RefreshCw, AlertCircle, Wifi, WifiOff, LogOut,
  Target, Trophy, User, Home, CalendarDays, Users, Swords, Award, BarChart3
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PageLoadingSpinner } from './components/LoadingSpinner';

// Eagerly loaded pages (login flow)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Lazy loaded pages (heavy components)
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SocialPage = lazy(() => import('./pages/SocialPage'));
const ChallengesPage = lazy(() => import('./pages/ChallengesPage'));
const SkillTreePage = lazy(() => import('./pages/SkillTreePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

// Core components (always needed)
import ActivityInput from './components/ActivityInput';
import Timeline from './components/Timeline';
import Dashboard from './components/Dashboard';
import InterventionAlert from './components/InterventionAlert';
import MorningCheckIn from './components/MorningCheckIn';
import LevelUpModal from './components/LevelUpModal';
import OracleInterventionModal from './components/OracleInterventionModal';
import { logActivity, getActivities, getDashboard, deleteActivity, updateActivity, checkHealth, getNotificationCounts } from './api';

/**
 * Protected Route Wrapper
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <MorningCheckIn />
      {children}
    </>
  );
}

/**
 * Navigation Link Component with optional notification badge
 */
function NavLink({ to, icon: Icon, label, badge = 0 }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                ${isActive
          ? 'bg-indigo-500/20 text-indigo-400'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline text-sm">{label}</span>
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center 
                        justify-center text-xs font-bold rounded-full bg-red-500 text-white shadow-lg">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

/**
 * App Shell with Navigation
 */
function AppShell({ children }) {
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState({ pending_friends: 0, pending_challenges: 0 });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await checkHealth();
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notification counts
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await getNotificationCounts();
        setNotifications(data);
      } catch (e) {
        console.error('Failed to fetch notifications:', e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                            flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-100">FocusFlow</h1>
                <p className="text-xs text-zinc-500 -mt-0.5">Smart Productivity Tracker</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              <NavLink to="/" icon={Home} label="Home" />
              <NavLink to="/goals" icon={Target} label="Goals" />
              <NavLink to="/history" icon={CalendarDays} label="History" />
              <NavLink to="/social" icon={Users} label="Friends" badge={notifications.pending_friends} />
              <NavLink to="/challenges" icon={Swords} label="Challenges" badge={notifications.pending_challenges} />
              <NavLink to="/skills" icon={Award} label="Skills" />
              <NavLink to="/analytics" icon={BarChart3} label="Analytics" />
              <NavLink to="/leaderboard" icon={Trophy} label="Leaderboard" />
              <NavLink to="/profile" icon={User} label="Profile" />
            </nav>

            {/* Status & Actions */}
            <div className="flex items-center gap-3">
              {/* User name on desktop */}
              {user && (
                <span className="text-sm text-zinc-400 hidden md:block">
                  {user.name}
                </span>
              )}

              {/* Connection Status */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                            ${isConnected
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'}`}>
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span className="hidden sm:inline">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span className="hidden sm:inline">Offline</span>
                  </>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 
                         hover:bg-red-500/10 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Intervention Alert (Phase 4) */}
      <InterventionAlert />

      {/* Main Content */}
      {children}

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-12 py-6">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <p className="text-center text-sm text-zinc-600">
            FocusFlow • Built with React, Flask & PostgreSQL
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Home Page Content (Activity Logging)
 */
function HomePage() {
  const { updateUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [levelUpData, setLevelUpData] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [activitiesRes, dashboardRes] = await Promise.all([
        getActivities(),
        getDashboard()
      ]);

      setActivities(activitiesRes.activities || []);
      setDashboardData(dashboardRes);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (text) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await logActivity(text);

      if (result.activity) {
        setActivities(prev => [result.activity, ...prev]);
      }

      // Show level up modal if leveled up
      if (result.gamification?.leveled_up) {
        setLevelUpData({
          oldLevel: result.gamification.old_level,
          newLevel: result.gamification.new_level
        });
      }

      // Instantly update user chest credits without page refresh
      if (result.credits_earned !== undefined) {
        updateUser({ chest_credits: result.total_credits });
      }

      const dashboardRes = await getDashboard();
      setDashboardData(dashboardRes);
    } catch (err) {
      console.error('Failed to log activity:', err);
      setError('Failed to log activity. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      await deleteActivity(activityId);
      setActivities(prev => prev.filter(a => a.id !== activityId));
      const dashboardRes = await getDashboard();
      setDashboardData(dashboardRes);
    } catch (err) {
      console.error('Failed to delete activity:', err);
      setError('Failed to delete activity.');
    }
  };

  const handleEditActivity = async (activityId, data) => {
    try {
      const result = await updateActivity(activityId, data);
      // Update the activity in the list
      setActivities(prev => prev.map(a =>
        a.id === activityId ? result.activity : a
      ));
      // Refresh dashboard to update scores
      const dashboardRes = await getDashboard();
      setDashboardData(dashboardRes);
    } catch (err) {
      console.error('Failed to update activity:', err);
      setError('Failed to update activity.');
      throw err; // Re-throw so ActivityCard knows it failed
    }
  };

  return (
    <>
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3">
          <div className="max-w-[1600px] mx-auto flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs hover:text-red-300 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
              <ActivityInput
                onSubmit={handleSubmit}
                isLoading={isSubmitting}
              />
            </section>

            <section className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
              <Timeline
                activities={activities}
                onDeleteActivity={handleDeleteActivity}
                onEditActivity={handleEditActivity}
                isLoading={isLoading}
              />
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1 h-fit">
            <div className="sticky top-24 space-y-4">
              <Dashboard
                dashboardData={dashboardData}
                isLoading={isLoading}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={!!levelUpData}
        onClose={() => setLevelUpData(null)}
        levelData={levelUpData}
      />

      {/* Oracle Proactive Intervention */}
      <OracleInterventionModal
        onAcceptMission={(mission) => {
          console.log('Mission accepted:', mission);
          // Could auto-log the mission activity here
        }}
      />
    </>
  );
}

/**
 * Page Wrapper for Goals, Leaderboard, Profile
 * Uses same max-width as home page for consistency
 */
function PageWrapper({ children }) {
  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 w-full">
      {children}
    </main>
  );
}

/**
 * FocusFlow - Smart Productivity Tracker
 * Main Application Component with Routing
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <HomePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/goals"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <GoalsPage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <HistoryPage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/social"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <SocialPage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/challenges"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <ChallengesPage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/skills"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <SkillTreePage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <AnalyticsPage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <LeaderboardPage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageWrapper>
                      <ProfilePage />
                    </PageWrapper>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
