import React, { useState } from 'react';
import { 
  Truck, 
  Layers, 
  Send, 
  Clock, 
  FileText, 
  Users, 
  AlertCircle, 
  Menu,
  X,
  Wrench,
  Zap,
  Activity,
  Plus,
  Package,
  RefreshCw,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  activeVisitsCount = 0, 
  lowStockCount = 0,
  isSyncing = false,
  onManualSync
}) {
  const { currentUser, logout, role, isAdmin } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const desktopNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { 
      id: 'active', 
      label: 'Site Visits', 
      icon: Truck, 
      badge: activeVisitsCount > 0 ? activeVisitsCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-black animate-pulse' 
    },
    { id: 'new-dispatch', label: '+ New Dispatch', icon: Plus, highlight: true },
    { 
      id: 'inventory', 
      label: 'Warehouse Stock', 
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-rose-500 text-white font-bold'
    },
    { id: 'history', label: 'History & Logs', icon: FileText },
    { id: 'staff', label: 'Technicians & Sites', icon: Users },
  ];

  const userInitial = currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U';
  const userShortName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  return (
    <>
      {/* Top Header Bar - Ultra Clean & Minimal */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            
            {/* Brand Logo - Compact & Clean */}
            <div 
              className="flex items-center space-x-2.5 cursor-pointer select-none group"
              onClick={() => setActiveTab('dashboard')}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20 group-active:scale-95 transition-all">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 stroke-[2.5]" />
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">
                  VE <span className="text-amber-400">INVENTORY</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                if (item.highlight) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 ${
                        isActive 
                          ? 'bg-amber-400 text-slate-950 shadow-amber-400/25 ring-2 ring-amber-400/50' 
                          : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                      }`}
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>{item.label}</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all relative ${
                      isActive
                        ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-md ring-1 ring-amber-400/20'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Side: Clean Profile Avatar Trigger */}
            <div className="flex items-center space-x-2">
              {/* Profile Avatar Button */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/40 transition-all active:scale-95 group shadow-md"
                title="Account & System Profile"
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shadow-inner transition-transform group-hover:scale-105 ${
                  isAdmin 
                    ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black' 
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {userInitial}
                </div>

                <div className="text-left hidden sm:block">
                  <span className="text-xs font-bold text-white block truncate max-w-[100px] leading-tight">
                    {userShortName}
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider block ${
                    isAdmin ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {isAdmin ? '👑 Admin' : '👷 Staff'}
                  </span>
                </div>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* PROFILE & SYSTEM POPUP MODAL / DRAWER */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white text-sm">Account & Controls</h3>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Identity Card */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shrink-0 ${
                isAdmin 
                  ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-500 text-slate-950' 
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {userInitial}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex items-center space-x-1.5">
                  <strong className="text-white text-xs sm:text-sm truncate block">{userShortName}</strong>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isAdmin 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {isAdmin ? '👑 ADMIN' : '👷 STAFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentUser?.email}</p>
                <span className="text-[9px] font-mono text-slate-500 block truncate mt-0.5">
                  UID: {currentUser?.uid}
                </span>
              </div>
            </div>

            {/* Real-time Cloud Database Live Sync Action */}
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Cloud Database Live Sync</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Active
                </span>
              </div>

              <button
                onClick={() => {
                  if (onManualSync) onManualSync();
                }}
                disabled={isSyncing}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-amber-300 text-xs font-bold border border-slate-700 flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                <span>{isSyncing ? 'Syncing Cloud Database...' : '🔄 Sync & Refresh Database Now'}</span>
              </button>
            </div>

            {/* Quick Shortcuts */}
            <div className="space-y-1.5 text-xs font-semibold text-slate-300">
              <button
                onClick={() => { setActiveTab('history'); setShowProfileModal(false); }}
                className="w-full p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all"
              >
                <span className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Service History & Job Cards</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => { setActiveTab('staff'); setShowProfileModal(false); }}
                className="w-full p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all"
              >
                <span className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Technicians & Client Directory</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Logout Action */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  logout();
                }}
                className="w-full py-2.5 px-4 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out / Log Out</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5-BUTTON MOBILE BOTTOM APP BAR (2 Left, Floating Half-Raised '+' Center, 2 Right) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] px-2 py-1.5 no-print">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          
          {/* LEFT 1: Dashboard / Home */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl active:scale-95 transition-all ${
              activeTab === 'dashboard' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Home</span>
            {activeTab === 'dashboard' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* LEFT 2: Active Site Trips */}
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl active:scale-95 transition-all relative ${
              activeTab === 'active' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Truck className={`w-5 h-5 ${activeTab === 'active' ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />
              {activeVisitsCount > 0 && (
                <span className="absolute -top-1 -right-2.5 text-[9px] w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center animate-pulse">
                  {activeVisitsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">On-Site</span>
            {activeTab === 'active' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* CENTER: Floating Half-Raised '+' CTA Button */}
          <div className="relative -top-5 px-2 flex flex-col items-center">
            <button
              onClick={() => setActiveTab('new-dispatch')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/40 border-4 border-slate-950 transition-all active:scale-90 ${
                activeTab === 'new-dispatch'
                  ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/40 scale-105'
                  : 'bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-500 text-slate-950 hover:brightness-110'
              }`}
              title="Create New Site Dispatch"
            >
              <Plus className="w-8 h-8 stroke-[3.5]" />
            </button>
            <span className={`text-[10px] font-black tracking-tight mt-1 ${
              activeTab === 'new-dispatch' ? 'text-amber-400' : 'text-slate-300'
            }`}>
              Dispatch
            </span>
          </div>

          {/* RIGHT 1: Warehouse Inventory */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl active:scale-95 transition-all relative ${
              activeTab === 'inventory' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Package className={`w-5 h-5 ${activeTab === 'inventory' ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-2.5 text-[9px] w-4 h-4 rounded-full bg-rose-500 text-white font-black flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Stock</span>
            {activeTab === 'inventory' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

          {/* RIGHT 2: Staff & Sites */}
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-2xl active:scale-95 transition-all ${
              activeTab === 'staff' ? 'text-amber-400 font-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'staff' ? 'text-amber-400 stroke-[2.5]' : 'text-slate-400'}`} />
            <span className="text-[10px] font-bold tracking-tight mt-0.5">Staff</span>
            {activeTab === 'staff' && <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"></span>}
          </button>

        </div>
      </div>
    </>
  );
}
