import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  RotateCcw, 
  Package, 
  ShieldCheck, 
  Check, 
  Plus, 
  Minus, 
  ClipboardCheck,
  XCircle,
  PlusCircle,
  Trash2,
  IndianRupee,
  Car,
  Wrench,
  ReceiptText
} from 'lucide-react';
import { api } from '../api';

export default function ReconciliationModal({ dispatch, onClose, onSuccess }) {
  const [returnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Extract all assigned tasks from the dispatch record (excluding status notices)
  const assignedTasksList = useMemo(() => {
    if (!dispatch) return [];
    let rawList = [];
    if (Array.isArray(dispatch.assignedTasks) && dispatch.assignedTasks.length > 0) {
      rawList = dispatch.assignedTasks;
    } else if (dispatch.issueDescription) {
      rawList = dispatch.issueDescription
        .split(/ • |\n/)
        .map(s => s.trim())
        .filter(Boolean);
    } else if (dispatch.workSummary) {
      rawList = dispatch.workSummary
        .split(/ • |\n/)
        .map(s => s.trim())
        .filter(Boolean);
    }

    const filtered = rawList.filter(t => 
      !t.includes('⚠️') && 
      !t.includes('Work Summary:') && 
      !t.includes('On Site') && 
      !t.toLowerCase().startsWith('remark:')
    );

    return filtered.length > 0 ? filtered : ['Standard Site Service Visit'];
  }, [dispatch]);

  // Per-task completion state
  const [taskCompletionMap, setTaskCompletionMap] = useState(() =>
    assignedTasksList.map(task => ({ task, status: 'DONE', reason: '' }))
  );

  // Extra / unplanned work done on site
  const [extraWorkList, setExtraWorkList] = useState([]);
  const [extraWorkInput, setExtraWorkInput] = useState('');
  const [customRemarks, setCustomRemarks] = useState('');

  // Parts + quantities state
  const [itemsState, setItemsState] = useState([]);

  useEffect(() => {
    if (dispatch && dispatch.itemsIssued) {
      setItemsState(
        dispatch.itemsIssued.map((item) => ({
          partId: item.partId,
          partNumber: item.partNumber,
          partName: item.partName,
          unit: item.unit,
          unitPrice: item.unitPrice || 0, // ← carry unit price for auto cost calculation
          qtyIssued: item.qtyIssued,
          qtyUsed: item.qtyIssued,
          qtyReturned: 0,
          qtyDamaged: 0,
          installationNotes: ''
        }))
      );
    }
  }, [dispatch]);

  // ── COST STATE ──────────────────────────────────────────────
  const [travellingCost, setTravellingCost] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [otherCostNote, setOtherCostNote] = useState('');

  // Auto-calculated parts cost (updates whenever qtyUsed changes)
  const partsCost = useMemo(() =>
    itemsState.reduce((sum, item) => sum + (item.qtyUsed * (item.unitPrice || 0)), 0),
    [itemsState]
  );

  const totalTripCost = useMemo(() =>
    partsCost +
    (parseFloat(travellingCost) || 0) +
    (parseFloat(labourCost) || 0) +
    (parseFloat(otherCost) || 0),
    [partsCost, travellingCost, labourCost, otherCost]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal back button
  useEffect(() => {
    window.history.pushState({ modal: 'reconciliation' }, '');
    const handleBack = () => onClose();
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [onClose]);

  // ── TASK HANDLERS ────────────────────────────────────────────
  const handleToggleTaskStatus = (index) => {
    setTaskCompletionMap(prev => prev.map((item, i) =>
      i === index
        ? { ...item, status: item.status === 'DONE' ? 'NOT_DONE' : 'DONE', reason: item.status === 'DONE' ? item.reason : '' }
        : item
    ));
  };

  const handleTaskReasonChange = (index, value) => {
    setTaskCompletionMap(prev => prev.map((item, i) =>
      i === index ? { ...item, reason: value } : item
    ));
  };

  const handleMarkAllDone = () => {
    setTaskCompletionMap(prev => prev.map(item => ({ ...item, status: 'DONE', reason: '' })));
  };

  const handleAddExtraWork = (e) => {
    if (e) e.preventDefault();
    if (!extraWorkInput.trim()) return;
    setExtraWorkList(prev => [...prev, extraWorkInput.trim()]);
    setExtraWorkInput('');
  };

  const handleRemoveExtraWork = (index) => {
    setExtraWorkList(prev => prev.filter((_, i) => i !== index));
  };

  // ── PARTS QTY HANDLERS ───────────────────────────────────────
  const handleMarkAllItemsUsed = () => {
    setItemsState(prev => prev.map(item => ({ ...item, qtyUsed: item.qtyIssued, qtyReturned: 0 })));
  };

  const handleMarkAllItemsReturned = () => {
    setItemsState(prev => prev.map(item => ({ ...item, qtyUsed: 0, qtyReturned: item.qtyIssued })));
  };

  const handleStepQty = (partId, type, delta) => {
    setItemsState(prev => prev.map(item => {
      if (item.partId === partId) {
        if (type === 'USED') {
          const nextUsed = Math.max(0, Math.min(item.qtyIssued, item.qtyUsed + delta));
          return { ...item, qtyUsed: nextUsed, qtyReturned: item.qtyIssued - nextUsed };
        } else {
          const nextRet = Math.max(0, Math.min(item.qtyIssued, item.qtyReturned + delta));
          return { ...item, qtyReturned: nextRet, qtyUsed: item.qtyIssued - nextRet };
        }
      }
      return item;
    }));
  };

  const handleDirectQtyChange = (partId, type, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setItemsState(prev => prev.map(item => {
      if (item.partId === partId) {
        if (type === 'USED') {
          const v = Math.min(item.qtyIssued, num);
          return { ...item, qtyUsed: v, qtyReturned: item.qtyIssued - v };
        } else {
          const v = Math.min(item.qtyIssued, num);
          return { ...item, qtyReturned: v, qtyUsed: item.qtyIssued - v };
        }
      }
      return item;
    }));
  };

  // ── SUBMIT ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    for (const item of itemsState) {
      const total = item.qtyUsed + item.qtyReturned + (item.qtyDamaged || 0);
      if (total !== item.qtyIssued) {
        setError(`"${item.partName}": Total ${item.qtyIssued} tha, lekin calculation ${total} ban rha hai.`);
        return;
      }
    }

    const completedTasks = taskCompletionMap.filter(t => t.status === 'DONE').map(t => t.task);
    const incompleteTasks = taskCompletionMap.filter(t => t.status === 'NOT_DONE').map(t => ({ task: t.task, reason: t.reason }));

    const completionReport = {
      completedTasks,
      incompleteTasks,
      extraWork: extraWorkList,
      remarks: customRemarks.trim()
    };

    const costBreakdown = {
      partsCost: Math.round(partsCost * 100) / 100,
      travellingCost: parseFloat(travellingCost) || 0,
      labourCost: parseFloat(labourCost) || 0,
      otherCost: parseFloat(otherCost) || 0,
      otherCostNote: otherCostNote.trim(),
      totalCost: Math.round(totalTripCost * 100) / 100
    };

    const summaryLines = [];

    // A. Completed tasks
    completedTasks.forEach(t => summaryLines.push(`• ✅ ${t}`));

    // B. Incomplete tasks with reason directly underneath
    incompleteTasks.forEach(t => {
      summaryLines.push(`• ❌ ${t.task}`);
      if (t.reason && t.reason.trim()) {
        summaryLines.push(`  ⚠️ (Reason: ${t.reason.trim()})`);
      }
    });

    // C. Extra work completed
    extraWorkList.forEach(t => summaryLines.push(`• ✅ ${t}`));

    // D. Custom overall remark
    if (customRemarks.trim()) {
      summaryLines.push(`  ⚠️ (Remark: ${customRemarks.trim()})`);
    }

    let finalWorkSummary = summaryLines.join('\n');
    if (!finalWorkSummary.trim()) {
      finalWorkSummary = '• ✅ Service Visit Completed';
    }

    try {
      setLoading(true);
      const res = await api.reconcileDispatch(dispatch.id, {
        itemsReconciliation: itemsState,
        returnDate,
        returnTime,
        workSummary: finalWorkSummary,
        completionReport,
        costBreakdown,
        verifiedBy: dispatch.leadTechnician,
        customerSignOff: true
      });

      if (res.success) {
        onSuccess(res.message || 'Kaam complete ho gaya & Database me sync ho gaya!');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit reconciliation.');
    } finally {
      setLoading(false);
    }
  };

  const totalIssued = itemsState.reduce((sum, i) => sum + i.qtyIssued, 0);
  const totalReturned = itemsState.reduce((sum, i) => sum + i.qtyReturned, 0);
  const doneTasks = taskCompletionMap.filter(t => t.status === 'DONE').length;
  const notDoneTasks = taskCompletionMap.filter(t => t.status === 'NOT_DONE').length;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white">Kaam Ho Gaya? Return Entry</h2>
                <span className="text-[11px] font-mono font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                  {dispatch.dispatchCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Client: <strong className="text-white">{dispatch.clientName}</strong> • Lead Tech: <strong className="text-amber-400">{dispatch.leadTechnician}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* ─── SECTION 1: ASSIGNED WORK STATUS ─── */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  1. Assigned Work Status
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">✓ {doneTasks} Done</span>
                {notDoneTasks > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">✗ {notDoneTasks} Pending</span>
                )}
                <button type="button" onClick={handleMarkAllDone} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700">
                  All Done
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">Dispatch banate waqt jo kaam assign kiye the — har kaam ke liye ✅ DONE ya ❌ NOT DONE mark karein:</p>

            <div className="space-y-2">
              {taskCompletionMap.map((item, idx) => {
                const isDone = item.status === 'DONE';
                return (
                  <div key={idx} className={`rounded-xl border transition-all overflow-hidden ${isDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                    <button
                      type="button"
                      onClick={() => handleToggleTaskStatus(idx)}
                      className="w-full p-2.5 text-left text-xs font-semibold flex items-center justify-between gap-2"
                    >
                      <span className={`truncate flex-1 ${isDone ? 'text-emerald-200' : 'text-rose-200 line-through opacity-70'}`}>{item.task}</span>
                      <div className={`flex items-center space-x-1 shrink-0 px-2 py-1 rounded-lg font-black text-[10px] ${isDone ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                        {isDone ? <><Check className="w-3 h-3 stroke-[3]" /><span>DONE</span></> : <><XCircle className="w-3 h-3" /><span>NOT DONE</span></>}
                      </div>
                    </button>
                    {!isDone && (
                      <div className="px-2.5 pb-2.5">
                        <input
                          type="text"
                          placeholder="Kyu nahi hua? (Optional reason)"
                          value={item.reason}
                          onChange={(e) => handleTaskReasonChange(idx, e.target.value)}
                          className="w-full bg-slate-900 border border-rose-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── SECTION 2: EXTRA WORK DONE ─── */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2">
              <PlusCircle className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">2. Extra Work Done (Unplanned)</span>
              {extraWorkList.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">+{extraWorkList.length} Added</span>
              )}
            </div>

            {extraWorkList.length > 0 && (
              <div className="space-y-1.5">
                {extraWorkList.map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                    <span className="text-purple-200 font-medium flex-1 mr-2">➕ {task}</span>
                    <button type="button" onClick={() => handleRemoveExtraWork(idx)} className="text-slate-500 hover:text-rose-400 p-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g. Battery top-up, hose clamp replace..."
                value={extraWorkInput}
                onChange={(e) => setExtraWorkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddExtraWork(e); }}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
              <button type="button" onClick={handleAddExtraWork} className="px-3 py-2 bg-purple-500 hover:bg-purple-400 text-white font-black text-xs rounded-xl active:scale-95 shrink-0">
                + Add
              </button>
            </div>

            <input
              type="text"
              placeholder="📝 General remarks / customer observation (optional)..."
              value={customRemarks}
              onChange={(e) => setCustomRemarks(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* ─── SECTION 3: PARTS USED & RETURN ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Parts Used & Return:</span>
              </span>
              <div className="flex items-center space-x-1.5 text-[10px] font-bold">
                <button type="button" onClick={handleMarkAllItemsUsed} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 active:scale-95 flex items-center space-x-1">
                  <Check className="w-3 h-3 stroke-[3]" /><span>All Used</span>
                </button>
                <button type="button" onClick={handleMarkAllItemsReturned} className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 active:scale-95 flex items-center space-x-1">
                  <RotateCcw className="w-3 h-3 stroke-[3]" /><span>All Returned</span>
                </button>
              </div>
            </div>

            {itemsState.map((item) => (
              <div key={item.partId} className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-white text-sm block font-bold">{item.partName}</strong>
                    <span className="text-[11px] font-mono text-slate-400">
                      {item.partNumber} • Carried: <strong className="text-amber-400">{item.qtyIssued} {item.unit}</strong>
                      {item.unitPrice > 0 && <span className="text-slate-500"> • {fmt(item.unitPrice)}/unit</span>}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap ${
                    item.qtyUsed === item.qtyIssued ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : item.qtyReturned === item.qtyIssued ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {item.qtyUsed} Used • {item.qtyReturned} Wapas
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {/* Used */}
                  <div className="bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 block uppercase">🟢 Lag Gaya (Used)</span>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <input type="tel" inputMode="numeric" pattern="[0-9]*" value={item.qtyUsed}
                          onChange={(e) => handleDirectQtyChange(item.partId, 'USED', e.target.value)}
                          className="w-10 bg-slate-900 border border-emerald-500/40 rounded-lg text-center text-sm font-bold text-white py-0.5 focus:outline-none focus:border-emerald-400"
                        />
                        <span className="text-xs text-emerald-300 font-semibold">{item.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button type="button" onClick={() => handleStepQty(item.partId, 'USED', -1)} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95"><Minus className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleStepQty(item.partId, 'USED', 1)} className="w-8 h-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center active:scale-95"><Plus className="w-3.5 h-3.5 stroke-[3]" /></button>
                    </div>
                  </div>

                  {/* Returned */}
                  <div className="bg-blue-950/40 p-2.5 rounded-2xl border border-blue-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-400 block uppercase">🔵 Wapas Aaya (Returned)</span>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <input type="tel" inputMode="numeric" pattern="[0-9]*" value={item.qtyReturned}
                          onChange={(e) => handleDirectQtyChange(item.partId, 'RETURNED', e.target.value)}
                          className="w-10 bg-slate-900 border border-blue-500/40 rounded-lg text-center text-sm font-bold text-white py-0.5 focus:outline-none focus:border-blue-400"
                        />
                        <span className="text-xs text-blue-300 font-semibold">{item.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button type="button" onClick={() => handleStepQty(item.partId, 'RETURNED', -1)} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center active:scale-95"><Minus className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => handleStepQty(item.partId, 'RETURNED', 1)} className="w-8 h-8 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold flex items-center justify-center active:scale-95"><Plus className="w-3.5 h-3.5 stroke-[3]" /></button>
                    </div>
                  </div>
                </div>

                {/* Per-part cost preview */}
                {item.unitPrice > 0 && item.qtyUsed > 0 && (
                  <div className="text-[10px] text-right text-emerald-400 font-bold pr-0.5">
                    Part Cost: {fmt(item.qtyUsed * item.unitPrice)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ─── SECTION 4: TRIP COST ENTRY ─── */}
          <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-amber-500/30 space-y-3">
            <div className="flex items-center space-x-2">
              <ReceiptText className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">4. Trip Cost Breakdown</span>
            </div>

            {/* Auto Parts Cost — Read Only */}
            <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 block">Parts Cost (Auto-Calculated)</span>
                  <span className="text-[10px] text-slate-400">qtyUsed × unitPrice for all parts</span>
                </div>
              </div>
              <span className="text-lg font-black text-emerald-300 font-mono">{fmt(partsCost)}</span>
            </div>

            {/* Travelling Cost */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 text-[10px] font-black uppercase text-slate-300">
                  <Car className="w-3 h-3 text-blue-400" />
                  <span>Travelling Cost (₹)</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  min="0"
                  value={travellingCost}
                  onChange={(e) => setTravellingCost(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-blue-400 text-right"
                />
                <span className="text-[10px] text-slate-500 block">Petrol, vehicle, toll</span>
              </div>

              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 text-[10px] font-black uppercase text-slate-300">
                  <Wrench className="w-3 h-3 text-purple-400" />
                  <span>Labour / Service Charge (₹)</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  min="0"
                  value={labourCost}
                  onChange={(e) => setLabourCost(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-purple-400 text-right"
                />
                <span className="text-[10px] text-slate-500 block">Technician service fee</span>
              </div>
            </div>

            {/* Other Cost + Note */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="flex items-center space-x-1.5 text-[10px] font-black uppercase text-slate-300">
                  <IndianRupee className="w-3 h-3 text-orange-400" />
                  <span>Other / Misc Cost (₹)</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  min="0"
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-orange-400 text-right"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-300 block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Tool purchase, loadman"
                  value={otherCostNote}
                  onChange={(e) => setOtherCostNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>

            {/* Total Cost — Big Display */}
            <div className="p-3 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 block">💰 Total Trip Cost</span>
                <div className="text-[10px] text-slate-400 mt-0.5 space-y-0.5">
                  <div>Parts: {fmt(partsCost)}</div>
                  {(parseFloat(travellingCost) || 0) > 0 && <div>Travelling: {fmt(travellingCost)}</div>}
                  {(parseFloat(labourCost) || 0) > 0 && <div>Labour: {fmt(labourCost)}</div>}
                  {(parseFloat(otherCost) || 0) > 0 && <div>Other: {fmt(otherCost)}</div>}
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-300 font-mono">{fmt(totalTripCost)}</span>
              </div>
            </div>
          </div>

          {/* Completion Summary Preview */}
          <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-black uppercase text-amber-400 block">👁️ Final Report Preview:</span>
            <div className="space-y-1 text-xs">
              {taskCompletionMap.filter(t => t.status === 'DONE').length > 0 && (
                <p className="text-emerald-300">
                  <span className="font-black">✅ Done ({doneTasks}):</span>{' '}
                  {taskCompletionMap.filter(t => t.status === 'DONE').map(t => t.task).join(' • ')}
                </p>
              )}
              {taskCompletionMap.filter(t => t.status === 'NOT_DONE').length > 0 && (
                <p className="text-rose-300">
                  <span className="font-black">❌ Not Done ({notDoneTasks}):</span>{' '}
                  {taskCompletionMap.filter(t => t.status === 'NOT_DONE').map(t => t.task + (t.reason ? ` (${t.reason})` : '')).join(' • ')}
                </p>
              )}
              {extraWorkList.length > 0 && (
                <p className="text-purple-300">
                  <span className="font-black">➕ Extra ({extraWorkList.length}):</span>{' '}
                  {extraWorkList.join(' • ')}
                </p>
              )}
              <p className="text-amber-300 font-black">💰 Total Cost: {fmt(totalTripCost)}</p>
            </div>
          </div>

          {/* Restock Banner */}
          {totalReturned > 0 ? (
            <div className="p-3 bg-blue-500/15 border border-blue-500/30 rounded-2xl flex items-center space-x-2.5 text-xs text-blue-300 font-bold">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <span>{totalReturned} unused items automatically warehouse me wapas <strong>restock</strong> ho jayenge!</span>
            </div>
          ) : (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sabhi {totalIssued} items forklift me use ho gaye.</span>
            </div>
          )}

        </div>

        {/* Submit */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            {loading ? <span>Saving & Syncing...</span> : (
              <><CheckCircle2 className="w-5 h-5 stroke-[2.5]" /><span>✅ CONFIRM KAAM HO GAYA & COMPLETE VISIT</span></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
