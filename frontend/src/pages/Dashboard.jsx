import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  PlusCircle, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowRight,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Zap,
  Fuel,
  Wrench,
  ChevronRight,
  Activity,
  Plus,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ReconciliationModal from '../components/ReconciliationModal';
import JobCardModal from '../components/JobCardModal';
import FullStockListModal from '../components/FullStockListModal';

export default function Dashboard({ setActiveTab, onDataRefresh }) {
  const { isAdmin } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDispatchForRecon, setSelectedDispatchForRecon] = useState(null);
  const [selectedDispatchForCard, setSelectedDispatchForCard] = useState(null);
  const [showFullStockModal, setShowFullStockModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [pendingUserCount, setPendingUserCount] = useState(0);

  const fetchPendingCount = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.getAllUsers();
      if (res.success && res.stats) {
        setPendingUserCount(res.stats.pendingCount || 0);
      }
    } catch (e) {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard();
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (isAdmin) {
      fetchPendingCount();
    }
  }, [isAdmin]);

  const handleReconcileSuccess = (msg) => {
    setSelectedDispatchForRecon(null);
    setToastMessage(msg);
    loadData();
    if (onDataRefresh) onDataRefresh();
    setTimeout(() => setToastMessage(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Loading System...</p>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {};
  const activeDispatches = dashboardData?.activeDispatches || [];
  const lowStockAlerts = dashboardData?.lowStockAlerts || [];
  const topUsedParts = dashboardData?.topUsedParts || [];
  const recentTransactions = dashboardData?.recentTransactions || [];

  return (
    <div className="space-y-5 pb-20">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-xs sm:text-sm">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white text-xs font-bold">
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* 1. Primary Action: Send Parts To Site (1-Tap Dispatch) */}
      <div>
        <button
          onClick={() => setActiveTab('new-dispatch')}
          className="w-full p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 text-left shadow-xl shadow-amber-500/25 hover:brightness-105 active:scale-[0.99] transition-all group flex items-center justify-between"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-950/15 flex items-center justify-center font-black shadow-inner">
              <Plus className="w-7 h-7 stroke-[3] text-slate-950" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950/15 tracking-wider">
                ⚡ 1-Tap Outward Gate Pass
              </span>
              <strong className="text-base sm:text-xl font-black block leading-tight mt-0.5">
                Send Parts & Dispatches To Site
              </strong>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-1 font-black text-xs uppercase tracking-wider bg-slate-950 text-amber-400 px-4 py-2.5 rounded-2xl shadow-md">
            <span>New Dispatch</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* 2. Four Core Management Cards Grid (Active Trips, Warehouse Stock, Techs, and User Approvals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        
        {/* Card 1: Active Trips */}
        <button
          onClick={() => setActiveTab('active')}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-left hover:border-blue-500/40 active:scale-95 transition-all flex flex-col justify-between h-32 relative overflow-hidden group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
              {metrics.activeSiteVisits || 0} Active
            </span>
          </div>
          <div>
            <strong className="text-white text-xs sm:text-sm font-black block whitespace-nowrap">Active Trips</strong>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">Reconcile & Return ➜</span>
          </div>
        </button>

        {/* Card 2: Warehouse Stock */}
        <button
          onClick={() => setShowFullStockModal(true)}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-left hover:border-emerald-500/40 active:scale-95 transition-all flex flex-col justify-between h-32 group shadow-lg"
          title="Open Full Stock List Catalog"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {metrics.totalInventoryItems || 0} Parts
            </span>
          </div>
          <div>
            <strong className="text-white text-xs sm:text-sm font-black block">Warehouse Stock</strong>
            <span className="text-[10px] text-amber-400 font-bold">📋 View All Stock ➜</span>
          </div>
        </button>

        {/* Card 3: Staff & Technicians */}
        <button
          onClick={() => setActiveTab('staff')}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-left hover:border-purple-500/40 active:scale-95 transition-all flex flex-col justify-between h-32 group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
              Directory
            </span>
          </div>
          <div>
            <strong className="text-white text-xs sm:text-sm font-black block">Technicians & Sites</strong>
            <span className="text-[10px] text-slate-400">Manage Team ➜</span>
          </div>
        </button>

        {/* Card 4: USER ACCESS & APPROVALS (For Admin) / SERVICE HISTORY (For Staff) */}
        {isAdmin ? (
          <button
            onClick={() => setActiveTab('approvals')}
            className={`p-4 rounded-3xl border text-left active:scale-95 transition-all flex flex-col justify-between h-32 group shadow-lg ${
              pendingUserCount > 0
                ? 'bg-rose-950/30 border-rose-500/50 hover:border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-slate-900 border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                pendingUserCount > 0
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                <UserCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              {pendingUserCount > 0 ? (
                <span className="text-xs font-mono font-black text-white bg-rose-500 px-2 py-0.5 rounded-full shadow-md animate-pulse">
                  {pendingUserCount} Pending
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  All Active
                </span>
              )}
            </div>
            <div>
              <strong className="text-white text-xs sm:text-sm font-black block truncate">User Approvals</strong>
              <span className={`text-[10px] font-bold ${pendingUserCount > 0 ? 'text-rose-300' : 'text-amber-400'}`}>
                {pendingUserCount > 0 ? 'Review Requests ➜' : 'Manage Access ➜'}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('history')}
            className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-left hover:border-amber-500/40 active:scale-95 transition-all flex flex-col justify-between h-32 group shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                Reports
              </span>
            </div>
            <div>
              <strong className="text-white text-xs sm:text-sm font-black block">Service History</strong>
              <span className="text-[10px] text-slate-400">Audit Logs ➜</span>
            </div>
          </button>
        )}

      </div>

      {/* Live Operational Metrics (Interactive App Badges) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        
        {/* 1. On-Site Trips -> Navigates to Active Visits */}
        <button
          onClick={() => setActiveTab('active')}
          className="bg-slate-900/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-800 hover:border-amber-500/50 flex items-center space-x-3 text-left transition-all active:scale-95 group shadow-md"
          title="View Active On-Site Trips"
        >
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block group-hover:text-amber-400/80 transition-colors">On-Site Trips</span>
            <strong className="text-base sm:text-lg font-black text-white group-hover:text-amber-400 transition-colors">{metrics.activeSiteVisits || 0}</strong>
          </div>
        </button>

        {/* 2. Completed Jobs -> Navigates to History & Reports */}
        <button
          onClick={() => setActiveTab('history')}
          className="bg-slate-900/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 flex items-center space-x-3 text-left transition-all active:scale-95 group shadow-md"
          title="View Service History & Completed Jobs"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block group-hover:text-emerald-400/80 transition-colors">Completed Jobs</span>
            <strong className="text-base sm:text-lg font-black text-emerald-400">{metrics.completedJobs || 0}</strong>
          </div>
        </button>

        {/* 3. Unique Parts -> Opens Full Stock Catalog */}
        <button
          onClick={() => setShowFullStockModal(true)}
          className="bg-slate-900/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-800 hover:border-blue-500/50 flex items-center space-x-3 text-left transition-all active:scale-95 group shadow-md"
          title="Open Complete Warehouse Stock Catalog"
        >
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block group-hover:text-blue-400/80 transition-colors">Unique Parts</span>
            <strong className="text-base sm:text-lg font-black text-blue-400">{metrics.totalInventoryItems || 0}</strong>
          </div>
        </button>

        {/* 4. Low Stock Alerts -> Opens Stock Catalog Filtered */}
        <button
          onClick={() => setShowFullStockModal(true)}
          className="bg-slate-900/90 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-800 hover:border-rose-500/50 flex items-center space-x-3 text-left transition-all active:scale-95 group shadow-md"
          title="View Low Stock Alerts List"
        >
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block group-hover:text-rose-400/80 transition-colors">Low Stock Alerts</span>
            <strong className="text-base sm:text-lg font-black text-rose-400">{metrics.lowStockCount || 0}</strong>
          </div>
        </button>

      </div>

      {/* Main Split: Active Site Visits & Quick Action Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Cols: Active Site Visits Cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Live On-Site Visits ({activeDispatches.length})
              </h2>
            </div>
            {activeDispatches.length > 0 && (
              <button
                onClick={() => setActiveTab('active')}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                View All ➜
              </button>
            )}
          </div>

          {activeDispatches.length === 0 ? (
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-dashed border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <strong className="text-white text-sm block">Abhi Koi Site Trip Active Nahi Hai</strong>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Jab technician samman leke site par jayenge, to yaha unka live card dikhega.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new-dispatch')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow transition-all active:scale-95"
              >
                + Create First Dispatch
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeDispatches.map((disp) => {
                const totalParts = disp.itemsIssued ? disp.itemsIssued.reduce((s, i) => s + (i.qtyIssued || 0), 0) : 0;
                return (
                  <div
                    key={disp.id}
                    className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-sm">
                          {disp.clientName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <strong className="text-white text-sm block">{disp.clientName}</strong>
                            <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                              {disp.dispatchCode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{disp.siteAddress}</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>ON SITE</span>
                      </span>
                    </div>

                    {/* Machine & Technician Info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Forklift Unit</span>
                        <strong className="text-amber-300 text-xs truncate block">{disp.forkliftModel}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Technician Team</span>
                        <strong className="text-white text-xs truncate block">{disp.leadTechnician}</strong>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Parts Carried</span>
                        <strong className="text-blue-400 text-xs">{disp.itemsIssued?.length || 0} Parts ({totalParts} Qty)</strong>
                      </div>
                    </div>

                    {/* Work Clauses */}
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">Kaam Kya Hai:</span>
                      <p className="text-xs text-slate-300 font-medium line-clamp-1">{disp.issueDescription}</p>
                    </div>

                    {/* 1-Tap Action Buttons */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDispatchForCard(disp)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                      >
                        📄 Job Card
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedDispatchForRecon(disp)}
                        className="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center space-x-1.5 whitespace-nowrap shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="hidden sm:inline">✅ Kaam Ho Gaya (Return Entry)</span>
                        <span className="sm:hidden">✅ Kaam Ho Gaya</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Low Stock Alerts & Quick Stats */}
        <div className="space-y-4">
          
          {/* Low Stock Warning Card */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Low Stock Alerts</span>
              </div>
              <button
                onClick={() => setShowFullStockModal(true)}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                📋 View All Stock ➜
              </button>
            </div>

            {lowStockAlerts.length === 0 ? (
              <div className="p-4 bg-slate-950/60 rounded-2xl text-center text-xs text-slate-500">
                ✅ All parts have healthy stock.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockAlerts.slice(0, 4).map((part) => (
                  <div 
                    key={part.id}
                    className="p-2.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between text-xs"
                  >
                    <div className="overflow-hidden mr-2">
                      <strong className="text-white text-xs block truncate">{part.name}</strong>
                      <span className="text-[10px] font-mono text-slate-400">{part.partNumber}</span>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                      {part.stockQuantity} {part.unit} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Helper Guide Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-xl space-y-2.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>How It Works</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="font-bold text-amber-400">1.</span>
                <span>Dispatch banate hi saman godown se reserve hota hai aur cloud database update hota hai.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-emerald-400">2.</span>
                <span>Technician return par "All Used" ya "Returned" select karta hai.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-blue-400">3.</span>
                <span>Unused parts automatically warehouse me restock ho jate hain!</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

      {/* Modals */}
      {selectedDispatchForRecon && (
        <ReconciliationModal
          dispatch={selectedDispatchForRecon}
          onClose={() => setSelectedDispatchForRecon(null)}
          onSuccess={handleReconcileSuccess}
        />
      )}

      {selectedDispatchForCard && (
        <JobCardModal
          dispatch={selectedDispatchForCard}
          onClose={() => setSelectedDispatchForCard(null)}
        />
      )}

      {showFullStockModal && (
        <FullStockListModal
          onClose={() => setShowFullStockModal(false)}
        />
      )}

    </div>
  );
}
