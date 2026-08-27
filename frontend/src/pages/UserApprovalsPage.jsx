import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ShieldCheck, 
  Trash2, 
  RefreshCw, 
  UserCheck, 
  UserX,
  Mail,
  Key,
  Calendar,
  ArrowLeft,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api';

export default function UserApprovalsPage({ setActiveTab }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const [filterStatus, setFilterStatus] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // UID being updated
  const [toast, setToast] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getAllUsers();
      if (res && res.success) {
        setUsers(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleUpdateStatus = async (uid, newStatus, newRole = null) => {
    try {
      setActionLoading(uid);
      const payload = { status: newStatus };
      if (newRole) payload.role = newRole;
      const res = await api.updateUserStatus(uid, payload);
      if (res && res.success) {
        showToastMsg(`User ${newStatus === 'APPROVED' ? 'Approved ✅' : 'Rejected ❌'}!`);
        await loadUsers();
      }
    } catch (err) {
      alert(err.message || 'Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid, email) => {
    if (window.confirm(`Are you sure you want to remove user "${email}" from database?`)) {
      try {
        setActionLoading(uid);
        const res = await api.deleteUser(uid);
        if (res && res.success) {
          showToastMsg('User record removed.');
          await loadUsers();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete user.');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterStatus === 'PENDING' && u.status !== 'PENDING') return false;
    if (filterStatus === 'APPROVED' && u.status !== 'APPROVED') return false;
    if (filterStatus === 'REJECTED' && u.status !== 'REJECTED') return false;

    if (search.trim()) {
      const s = search.toLowerCase();
      const matchEmail = u.email?.toLowerCase().includes(s);
      const matchName = u.displayName?.toLowerCase().includes(s);
      const matchUid = u.uid?.toLowerCase().includes(s);
      return matchEmail || matchName || matchUid;
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-24 animate-fadeIn">
      
      {/* Top Navigation & Header */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all active:scale-95 flex items-center space-x-1.5 text-xs font-bold shrink-0 shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-2xl font-black text-white">
                  User Access & Approvals
                </h1>
                {stats.pendingCount > 0 && (
                  <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    {stats.pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review new registrations, approve staff login or reject unauthorized access requests.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 text-amber-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 transition-all shadow-md active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh List'}</span>
          </button>

        </div>

        {/* Toast */}
        {toast && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        
        {/* Card 1: Pending */}
        <div 
          onClick={() => setFilterStatus('PENDING')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
            filterStatus === 'PENDING' 
              ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.pendingCount}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Waiting for review</span>
        </div>

        {/* Card 2: Approved */}
        <div 
          onClick={() => setFilterStatus('APPROVED')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
            filterStatus === 'APPROVED' 
              ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.approvedCount}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Active staff accounts</span>
        </div>

        {/* Card 3: Rejected */}
        <div 
          onClick={() => setFilterStatus('REJECTED')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
            filterStatus === 'REJECTED' 
              ? 'bg-rose-500/20 border-rose-500 ring-2 ring-rose-500/30' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.rejectedCount}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Access disabled</span>
        </div>

        {/* Card 4: Total */}
        <div 
          onClick={() => setFilterStatus('ALL')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
            filterStatus === 'ALL' 
              ? 'bg-slate-700/60 border-slate-500 ring-2 ring-slate-500/30' 
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">All Users</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{stats.total}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Total registered</span>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
        
        <div className="grid grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              filterStatus === 'PENDING'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pending ({stats.pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('APPROVED')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              filterStatus === 'APPROVED'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Approved ({stats.approvedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('REJECTED')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              filterStatus === 'REJECTED'
                ? 'bg-rose-500 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Rejected ({stats.rejectedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
              filterStatus === 'ALL'
                ? 'bg-slate-700 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">All ({stats.total})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search user by Email, Name, or UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

      </div>

      {/* User Records List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Loading user registrations...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2 bg-slate-900 rounded-3xl border border-slate-800">
            <Users className="w-10 h-10 mx-auto text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-semibold">
              {filterStatus === 'PENDING' 
                ? 'Koi pending user request nahi hai. All clear! 🎉'
                : 'Koi matching user record nahi mila.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSuperAdmin = u.uid === 'juoQofnkViXcZn9Cg1F6haV8Q2j2';
            const isPending = u.status === 'PENDING';
            const isApproved = u.status === 'APPROVED';
            const isRejected = u.status === 'REJECTED';
            const isUpdating = actionLoading === u.uid;

            return (
              <div
                key={u.uid}
                className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* User Profile Info */}
                  <div className="flex items-start space-x-3.5 overflow-hidden">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-md ${
                      isApproved
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isRejected
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {u.email ? u.email.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <strong className="text-white text-sm sm:text-base truncate block">
                          {u.displayName || u.email?.split('@')[0]}
                        </strong>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                          isSuperAdmin
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : isApproved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isRejected
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {isSuperAdmin ? '👑 MASTER ADMIN' : u.status}
                        </span>
                      </div>

                      <span className="text-xs text-slate-300 block truncate mt-0.5 font-mono">
                        {u.email}
                      </span>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1 font-mono">
                        <span>UID: {u.uid}</span>
                        <span>•</span>
                        <span>Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</span>
                        {u.approvedAt && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">Approved: {new Date(u.approvedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                    {isSuperAdmin ? (
                      <span className="text-xs text-amber-400 font-bold px-3 py-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        Full Super Access
                      </span>
                    ) : isPending ? (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(u.uid, 'APPROVED')}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
                        >
                          <UserCheck className="w-4 h-4 stroke-[3]" />
                          <span>Approve Access</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(u.uid, 'REJECTED')}
                          className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all active:scale-95 flex items-center space-x-1.5"
                        >
                          <UserX className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    ) : isApproved ? (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(u.uid, 'REJECTED')}
                          title="Revoke / Block Access"
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all flex items-center space-x-1.5"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Disable Access</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleDeleteUser(u.uid, u.email)}
                          title="Delete User Record"
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      // Rejected
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(u.uid, 'APPROVED')}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all active:scale-95 flex items-center space-x-1.5"
                        >
                          <UserCheck className="w-4 h-4 stroke-[3]" />
                          <span>Re-Approve Access</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleDeleteUser(u.uid, u.email)}
                          title="Delete User Record"
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
