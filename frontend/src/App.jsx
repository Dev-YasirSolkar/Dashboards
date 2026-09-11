import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import PendingApproval from './pages/PendingApproval';
import ErrorBoundary from './components/ErrorBoundary';

function MainApp() {
  const { currentUser, userStatus, loading, logout } = useAuth();

  if (loading || (currentUser && userStatus === 'LOADING')) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400">Loading System...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (userStatus === 'PENDING' || userStatus === 'REJECTED') {
    return <PendingApproval />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
            ⚡
          </div>
          <h1 className="text-base font-black text-white">Single-Sheet Workspace</h1>
        </div>

        <button
          onClick={logout}
          className="text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30 transition-all"
        >
          Sign Out
        </button>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
            ✨
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            100% Clean Canvas Ready
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            All previous old code, forms, tabs and page logic have been cleared. Tell us your new logic & workflow, and we will build it fresh!
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        <p>VE INVENTORY • Clean Slate Workspace</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
