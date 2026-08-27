import React, { useState, useEffect } from 'react';
import { 
  X, 
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
  AlertCircle
} from 'lucide-react';
import { api } from '../api';

export default function UserApprovalsModal({ onClose, onUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // UID being updated
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAllUsers();
      if (res.success) {
        setUsers(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Could not load user requests.');
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
      if (res.success) {
        showToastMsg(`User ${newStatus === 'APPROVED' ? 'Approved ✅' : 'Rejected ❌'}!`);
        await loadUsers();
        if (onUserUpdated) onUserUpdated();
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
        if (res.success) {
          showToastMsg('User record removed.');
          await loadUsers();
          if (onUserUpdated) onUserUpdated();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete user.');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    if (activeTab === 'PENDING' && u.status !== 'PENDING') return false;
    if (activeTab === 'APPROVED' && u.status !== 'APPROVED') return false;
    if (activeTab === 'REJECTED' && u.status !== 'REJECTED') return false;

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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  User Registration & Access Approvals
                </h2>
                {stats.pendingCount > 0 && (
                  <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    {stats.pendingCount} New Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Naye registered accounts ko Approve ya Reject karke dashboard access control karein.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/60 space-y-3 shrink-0">
          
          {/* Toast */}
          {toast && (
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toast}</span>
            </div>
          )}

          {/* Tab Buttons */}
          <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Pending ({stats.pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('APPROVED')}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'APPROVED'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Approved ({stats.approvedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REJECTED')}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'REJECTED'
                  ? 'bg-rose-500 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Rejected ({stats.rejectedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'ALL'
                  ? 'bg-slate-700 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">All ({stats.total})</span>
            </button>
          </div>

          {/* Search + Refresh */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Email, Name, or UID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="button"
              onClick={loadUsers}
              disabled={loading}
              title="Refresh User List"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

        </div>

        {/* User List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading registered users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <Users className="w-8 h-8 mx-auto text-slate-600 stroke-[1.5]" />
              <p className="text-xs font-semibold">
                {activeTab === 'PENDING' 
                  ? 'Koi pending user request nahi hai. All clear! 🎉'
                  : 'Koi user record nahi mila.'}
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
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    {/* User Identity */}
                    <div className="flex items-start space-x-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
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
                          <strong className="text-white text-xs sm:text-sm truncate block">
                            {u.displayName || u.email?.split('@')[0]}
                          </strong>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
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

                        <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-1 font-mono">
                          <span>UID: {u.uid.slice(0, 12)}...</span>
                          <span>•</span>
                          <span>Reg: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                      {isSuperAdmin ? (
                        <span className="text-[11px] text-amber-400 font-bold px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                          Full Super Access
                        </span>
                      ) : isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(u.uid, 'APPROVED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1"
                          >
                            <UserCheck className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(u.uid, 'REJECTED')}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all active:scale-95 flex items-center space-x-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
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
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all flex items-center space-x-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Disable</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleDeleteUser(u.uid, u.email)}
                            title="Delete User"
                            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        // Rejected user
                        <>
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(u.uid, 'APPROVED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all active:scale-95 flex items-center space-x-1"
                          >
                            <UserCheck className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Re-Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleDeleteUser(u.uid, u.email)}
                            title="Delete User"
                            className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Total Registered: <strong className="text-white">{stats.total}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
