import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ActiveVisits from './pages/ActiveVisits';
import NewDispatch from './pages/NewDispatch';
import Inventory from './pages/Inventory';
import HistoryReports from './pages/HistoryReports';
import TechniciansClients from './pages/TechniciansClients';
import Login from './pages/Login';
import PendingApproval from './pages/PendingApproval';
import UserApprovalsPage from './pages/UserApprovalsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api';

const VALID_TABS = ['dashboard', 'active', 'new-dispatch', 'inventory', 'history', 'staff', 'approvals'];

function MainApp() {
  const { currentUser, userStatus, loading } = useAuth();

  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '');
    return VALID_TABS.includes(hash) ? hash : 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const [activeVisitsCount, setActiveVisitsCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const setActiveTab = useCallback((tab, pushToHistory = true) => {
    const targetTab = VALID_TABS.includes(tab) ? tab : 'dashboard';
    
    if (pushToHistory && window.location.hash.replace('#', '') !== targetTab) {
      window.history.pushState({ tab: targetTab }, '', `#${targetTab}`);
    }
    setActiveTabState(targetTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!window.location.hash || !VALID_TABS.includes(window.location.hash.replace('#', ''))) {
      window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      setActiveTabState('dashboard');
    }

    const handlePopState = (e) => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
      } else if (e.state && e.state.tab && VALID_TABS.includes(e.state.tab)) {
        setActiveTabState(e.state.tab);
      } else {
        setActiveTabState('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchSummaryBadges = async (pullSheets = false) => {
    if (!currentUser || userStatus !== 'APPROVED') return;
    try {
      if (pullSheets) setIsSyncing(true);
      const metricsRes = await api.getDashboardMetrics();
      if (metricsRes.success && metricsRes.data) {
        setActiveVisitsCount(metricsRes.data.activeVisitsCount || 0);
        setLowStockCount(metricsRes.data.lowStockCount || 0);
      }
    } catch (err) {
      console.warn('Badges poll warning:', err);
    } finally {
      if (pullSheets) setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (currentUser && userStatus === 'APPROVED') {
      fetchSummaryBadges(false);
      const interval = setInterval(() => {
        fetchSummaryBadges(false);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser, userStatus]);

  // Loading Splash
  if (loading || (currentUser && userStatus === 'LOADING')) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400">Loading VE INVENTORY...</p>
      </div>
    );
  }

  // If user is not logged in, show Login / Sign In Screen
  if (!currentUser) {
    return <Login />;
  }

  // If user is pending approval or rejected, show PendingApproval holding screen
  if (userStatus === 'PENDING' || userStatus === 'REJECTED') {
    return <PendingApproval />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      {/* Navbar with 2-way sync indicator, role badge and user logout */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeVisitsCount={activeVisitsCount}
        lowStockCount={lowStockCount}
        isSyncing={isSyncing}
        onManualSync={() => fetchSummaryBadges(true)}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        {(activeTab === 'dashboard' || !VALID_TABS.includes(activeTab)) && (
          <Dashboard 
            setActiveTab={setActiveTab} 
            onDataRefresh={() => fetchSummaryBadges(false)} 
          />
        )}

        {activeTab === 'active' && (
          <ActiveVisits 
            setActiveTab={setActiveTab} 
            onDataRefresh={() => fetchSummaryBadges(false)} 
          />
        )}

        {activeTab === 'new-dispatch' && (
          <NewDispatch 
            setActiveTab={setActiveTab} 
            onDataRefresh={() => fetchSummaryBadges(false)} 
          />
        )}

        {activeTab === 'inventory' && (
          <Inventory 
            onDataRefresh={() => fetchSummaryBadges(false)} 
          />
        )}

        {activeTab === 'history' && (
          <HistoryReports />
        )}

        {activeTab === 'staff' && (
          <TechniciansClients />
        )}

        {activeTab === 'approvals' && (
          <UserApprovalsPage 
            setActiveTab={setActiveTab} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600 no-print pb-24 md:pb-6">
        <p>VE INVENTORY • Spares & Site Service Operations System • Real-Time Cloud Sync & Security Enabled</p>
      </footer>

    </div>
  );
}

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
