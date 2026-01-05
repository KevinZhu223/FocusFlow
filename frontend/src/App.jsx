import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  Zap, RefreshCw, AlertCircle, Wifi, WifiOff, LogOut,
  Target, Trophy, User, Home
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GoalsPage from './pages/GoalsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import ActivityInput from './components/ActivityInput';
import Timeline from './components/Timeline';
import Dashboard from './components/Dashboard';
import { logActivity, getActivities, getDashboard, deleteActivity, checkHealth } from './api';

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

  return children;
}

/**
 * Navigation Link Component
 */
function NavLink({ to, icon: Icon, label }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                ${isActive
          ? 'bg-indigo-500/20 text-indigo-400'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline text-sm">{label}</span>
    </Link>
  );
}

/**
 * App Shell with Navigation
 */
function AppShell({ children }) {
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(true);

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

      {/* Main Content */}
      {children}

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 mt-12 py-6">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <p className="text-center text-sm text-zinc-600">
            FocusFlow Phase 3 • Built with React, Flask & PostgreSQL
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
  const [activities, setActivities] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

      // Show gamification result if leveled up or got badges
      if (result.gamification?.leveled_up) {
        // Could show a toast/notification here
        console.log('Level up!', result.gamification);
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
      </AuthProvider>
    </BrowserRouter>
  );
}
