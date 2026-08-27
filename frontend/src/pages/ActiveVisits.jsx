import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  RotateCcw, 
  Package, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  FileText, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  Trash2,
  Zap,
  Plus,
  Play,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';
import ReconciliationModal from '../components/ReconciliationModal';
import JobCardModal from '../components/JobCardModal';

export default function ActiveVisits({ setActiveTab, onDataRefresh }) {
  const [dispatches, setDispatches] = useState([]);
  const [stats, setStats] = useState({ total: 0, activeCount: 0, scheduledCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('ALL'); // 'ALL' | 'DISPATCHED' | 'SCHEDULED'
  const [selectedDispatchForRecon, setSelectedDispatchForRecon] = useState(null);
  const [selectedDispatchForCard, setSelectedDispatchForCard] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const res = await api.getDispatches();
      if (res.success) {
        const all = res.data || [];
        // Filter out completed ones, keep active and scheduled
        const uncompleted = all.filter(d => d.status === 'DISPATCHED' || d.status === 'SCHEDULED');
        setDispatches(uncompleted);
        const active = uncompleted.filter(d => d.status === 'DISPATCHED').length;
        const scheduled = uncompleted.filter(d => d.status === 'SCHEDULED').length;
        setStats({
          total: uncompleted.length,
          activeCount: active,
          scheduledCount: scheduled
        });
      }
    } catch (err) {
      console.error('Failed to load visits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleReconcileSuccess = (msg) => {
    setSelectedDispatchForRecon(null);
    setToastMessage(msg);
    fetchVisits();
    if (onDataRefresh) onDataRefresh();
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleStartTrip = async (dsp) => {
    try {
      const res = await api.startScheduledTrip(dsp.id);
      if (res.success) {
        setToastMessage(`🚀 Trip ${dsp.dispatchCode} started! Technician marked On-Site.`);
        fetchVisits();
        if (onDataRefresh) onDataRefresh();
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch (err) {
      alert(err.message || 'Failed to start trip.');
    }
  };

  const handleDeleteDispatch = async (dsp) => {
    if (window.confirm(`Are you sure you want to cancel and delete Dispatch ${dsp.dispatchCode}? All issued/reserved parts will be returned to warehouse inventory.`)) {
      try {
        const res = await api.deleteDispatch(dsp.id);
        if (res.success) {
          setToastMessage(res.message);
          fetchVisits();
          if (onDataRefresh) onDataRefresh();
          setTimeout(() => setToastMessage(null), 4000);
        }
      } catch (err) {
        alert(err.message || 'Failed to delete dispatch.');
      }
    }
  };

  const filtered = dispatches.filter(d => {
    if (statusTab !== 'ALL' && d.status !== statusTab) return false;
    const s = search.toLowerCase();
    return (
      d.dispatchCode.toLowerCase().includes(s) ||
      d.clientName.toLowerCase().includes(s) ||
      d.siteAddress.toLowerCase().includes(s) ||
      d.leadTechnician.toLowerCase().includes(s) ||
      d.forkliftModel.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      
      {/* Toast */}
      {toastMessage && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold text-xs sm:text-sm">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white text-xs font-bold whitespace-nowrap ml-2">
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* App Header (1-Line Heading) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-black text-white whitespace-nowrap">Site Dispatches</h1>
              <span className="text-xs font-mono font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap">
                {stats.activeCount} On Site
              </span>
            </div>
            <p className="text-[11px] text-slate-400 whitespace-nowrap truncate">Live active site trips & upcoming scheduled visits</p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('new-dispatch')}
          className="flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Dispatch</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto shrink-0">
          <button
            onClick={() => setStatusTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusTab === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>All Trips</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80">{stats.total}</span>
          </button>

          <button
            onClick={() => setStatusTab('DISPATCHED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusTab === 'DISPATCHED'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🟢 On-Site Active</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80">{stats.activeCount}</span>
          </button>

          <button
            onClick={() => setStatusTab('SCHEDULED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              statusTab === 'SCHEDULED'
                ? 'bg-blue-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📅 Scheduled</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800/80">{stats.scheduledCount}</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search client, technician, part..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

      </div>

      {/* Visits List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white whitespace-nowrap">Koi trip active nahi hai</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Jab bhi mechanic site par saman le jata hai ya future schedule karta hai, yahan dikhega.
          </p>
          <button
            onClick={() => setActiveTab('new-dispatch')}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center space-x-1 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Naya Dispatch Karein</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filtered.map((disp) => {
            const isScheduled = disp.status === 'SCHEDULED';
            const totalParts = (disp.itemsIssued || []).reduce((sum, i) => sum + (i.qtyIssued || 0), 0);

            // Clean date & time strings
            const cleanDateStr = String(disp.dispatchDate || '')
              .replace(/Outward:\s*/gi, '')
              .replace(/Returned:\s*/gi, '')
              .replace(/\s*\([\d:\sAPM]+\)/gi, '')
              .split('\n')[0]
              .trim() || 'Today';

            const cleanTimeStr = disp.dispatchTime 
              ? String(disp.dispatchTime).replace(/[\(\)]/g, '').trim() 
              : '10:00 AM';

            return (
              <div 
                key={disp.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xl space-y-3.5 ${
                  isScheduled
                    ? 'bg-slate-900 border-blue-500/30 hover:border-blue-500/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Top Row: Code + Status + Date/Time */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                    <span className="font-mono font-black text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 shrink-0">
                      {disp.dispatchCode}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      isScheduled 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {isScheduled ? '📅 SCHEDULED VISIT' : '🟢 ON-SITE ACTIVE'}
                    </span>
                  </div>

                  {/* Date & Time Badge */}
                  <div className="flex items-center space-x-2.5 text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/80 self-start sm:self-auto">
                    <div className="flex items-center space-x-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{cleanDateStr}</span>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center space-x-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{cleanTimeStr}</span>
                    </div>
                  </div>
                </div>

                {/* Client & Address Info */}
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                    {disp.clientName}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-start space-x-1.5 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
                    <span>{disp.siteAddress || 'Site Location'}</span>
                  </p>
                </div>

                {/* Team & Equipment Details Box */}
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Assigned Team Section */}
                  <div className="flex items-start space-x-2.5">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Team:</span>
                      <strong className="text-amber-300 block text-xs font-bold leading-tight">
                        👨‍🔧 Lead: {disp.leadTechnician}
                      </strong>
                      {disp.teamMembers && disp.teamMembers.length > 0 && (
                        <span className="text-slate-300 block text-[11px] font-medium leading-relaxed pt-0.5">
                          🤝 Helpers: <strong className="text-slate-200">{disp.teamMembers.join(', ')}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Forklift & Work Scope Section */}
                  <div className="flex items-start space-x-2.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 font-bold mt-0.5">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Forklift & Work Scope:</span>
                      <strong className="text-white block text-xs font-bold leading-tight">
                        🚜 {disp.forkliftModel}
                      </strong>
                      <div className="space-y-1 pt-1">
                        {(() => {
                          let rawTasks = [];
                          if (Array.isArray(disp.assignedTasks) && disp.assignedTasks.length > 0) {
                            rawTasks = disp.assignedTasks;
                          } else if (disp.issueDescription) {
                            rawTasks = disp.issueDescription.split(/ • |\n/).map(s => s.trim()).filter(Boolean);
                          } else if (disp.workSummary) {
                            rawTasks = disp.workSummary.split(/ • |\n/).map(s => s.trim()).filter(Boolean);
                          }

                          const cleanTasks = rawTasks
                            .filter(t => !t.includes('⚠️') && !t.includes('Work Summary:') && !t.includes('On Site'))
                            .map(t => t.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/^[•\-\*\s✅❌]+/g, '').replace(/^(Done|Pending):\s*/i, '').trim())
                            .filter(Boolean);

                          if (cleanTasks.length === 0) {
                            cleanTasks.push('Service Visit / Maintenance');
                          }

                          return cleanTasks.map((task, idx) => (
                            <div key={idx} className="text-slate-200 text-xs font-medium flex items-start space-x-1.5 leading-snug">
                              <span className="text-amber-400 font-bold shrink-0">•</span>
                              <span>{task}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issued Parts Badges */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>📦 Parts Issued ({disp.itemsIssued?.length || 0} items):</span>
                    <span className="text-amber-400 font-black">{totalParts} Total Qty</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(disp.itemsIssued || []).map((item, idx) => (
                      <span 
                        key={idx}
                        className="text-xs font-semibold bg-slate-800/90 text-slate-200 px-2.5 py-1.5 rounded-xl border border-slate-700/80 flex items-center space-x-1"
                      >
                        <span className="truncate max-w-[180px]">{item.partName || item.name || 'Spare Part'}</span>
                        <strong className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                          {item.qtyIssued} {item.unit || 'Nos'}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mobile-Optimized Bottom Actions Row */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDispatchForCard(disp)}
                      className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Print Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDispatch(disp)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Cancel / Delete Trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {isScheduled ? (
                    <button
                      type="button"
                      onClick={() => handleStartTrip(disp)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-slate-950 font-black text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>🚀 Start Trip / Nikal Gaye</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedDispatchForRecon(disp)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>✅ Kaam Ho Gaya (Return Entry)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

    </div>
  );
}
