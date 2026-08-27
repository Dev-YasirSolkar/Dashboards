import React, { useState } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Key, 
  Truck,
  Building,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PendingApproval() {
  const { currentUser, userStatus, refreshUserStatus, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setMsg(null);
    try {
      const status = await refreshUserStatus();
      if (status === 'APPROVED') {
        setMsg('🎉 Account Approved! Redirecting...');
      } else if (status === 'REJECTED') {
        setMsg('❌ Account is still not approved / access is disabled.');
      } else {
        setMsg('⏳ Status: Abhi bhi Admin Approval Pending hai. Kripya thoda intezar karein.');
      }
    } catch (err) {
      setMsg('Connection error. Kripya dubara koshish karein.');
    } finally {
      setChecking(false);
    }
  };

  const isRejected = userStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-500 items-center justify-center shadow-xl shadow-amber-500/25 mb-1">
            <Truck className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            VE <span className="text-amber-400">INVENTORY</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            VITHAL ENTERPRISES • Spares & Site Dispatch System
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-center">
          
          {/* Status Icon */}
          <div className="flex justify-center">
            {isRejected ? (
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/20">
                <XCircle className="w-8 h-8 stroke-[2.5]" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20 animate-pulse">
                <Clock className="w-8 h-8 stroke-[2.5]" />
              </div>
            )}
          </div>

          {/* Heading & Explanation */}
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-black text-white">
              {isRejected ? 'Access Denied / Account Disabled' : 'Waiting for Admin Approval'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isRejected ? (
                'Aapka account Admin dwara approve nahi kiya gaya hai ya access disabled hai. Kripya Company Admin se sampark karein.'
              ) : (
                'Aapka account successfully register ho gaya hai. Security rules ke mutabiq Admin dwara approve hone ke baad hi Dashboard access hoga.'
              )}
            </p>
          </div>

          {/* User Account Info Card */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-1.5 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold truncate">{currentUser?.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
              <Key className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">UID: {currentUser?.uid}</span>
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status:</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isRejected 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {isRejected ? '🚫 REJECTED / DISABLED' : '⏳ PENDING APPROVAL'}
              </span>
            </div>
          </div>

          {/* Feedback Message */}
          {msg && (
            <div className={`p-3 rounded-xl text-xs font-bold ${
              msg.includes('Approved') 
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
            }`}>
              {msg}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              disabled={checking}
              onClick={handleCheckStatus}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : '🔄 Check Approval Status'}</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign Out / Switch Account</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
