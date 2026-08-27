import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Package, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Layers, 
  Tag, 
  ChevronRight,
  ShieldCheck,
  Building,
  Phone,
  Truck,
  Users,
  Wrench,
  Zap,
  RotateCcw,
  Sparkles,
  ArrowRight,
  PlusCircle,
  X,
  Play
} from 'lucide-react';
import { api } from '../api';

// Predefined Work Categories & Clauses
const WORK_CLAUSES = {
  ELECTRIC: [
    '🔋 Battery / Gravity Check & Top-up',
    '⚡ Pump Motor & Contactor Replacement',
    '🔌 Controller Diagnostic & Error Reset',
    '⚙️ Hydraulic Valve & Hoist Cylinder',
    '🛑 Brake Lining & Pedal Adjustment'
  ],
  DIESEL: [
    '🛢️ Engine Oil, Diesel & Air Filter Overhaul',
    '💧 Hydraulic Oil Leakage & Hose Fix',
    '⚙️ Transmission & Torque Converter Check',
    '🛑 Brake Master Cylinder & Wheel Shoe',
    '🌡️ Radiator Coolant Flush & Fan Belt'
  ],
  COMMON: [
    '🔧 500-Hr Periodic Preventive Service',
    '⛓️ Mast Bearing, Rollers & Lift Chain Grease',
    '💡 Lights, Horn, Beacon & Backup Alarm',
    '🔩 Fork Tine Inspection & Pin Calibration',
    '🚨 Emergency Breakdown Troubleshooting'
  ]
};

export default function NewDispatch({ setActiveTab, onDataRefresh }) {
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Dispatch Mode: IMMEDIATE vs SCHEDULED
  const [dispatchMode, setDispatchMode] = useState('IMMEDIATE'); // 'IMMEDIATE' | 'SCHEDULED'

  // Selected site details
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [forkliftType, setForkliftType] = useState('ALL');
  const [forkliftModel, setForkliftModel] = useState('');
  const [forkliftSerialNo, setForkliftSerialNo] = useState('');
  const [selectedForklifts, setSelectedForklifts] = useState([]);

  // Selected work clauses (Empty by default - user must select or type at least 1)
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customClauseInput, setCustomClauseInput] = useState('');
  const [customAddedClauses, setCustomAddedClauses] = useState([]);

  // Date & Time
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dispatchTime, setDispatchTime] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Technicians (Support Multi-Selection)
  const [selectedTechs, setSelectedTechs] = useState([]);

  // Issued Parts
  const [issuedParts, setIssuedParts] = useState([]);

  // Search & Filter
  const [partSearch, setPartSearch] = useState('');

  // Modals
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [showAddPartModal, setShowAddPartModal] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadAllMasterData = async () => {
    try {
      setLoadingInitial(true);
      const [cliRes, techRes, invRes] = await Promise.all([
        api.getClients(),
        api.getTechnicians(),
        api.getInventory()
      ]);

      if (cliRes.success && cliRes.data && cliRes.data.length > 0) {
        setClients(cliRes.data);
        if (!selectedClientId) {
          handleSelectClient(cliRes.data[0]);
        }
      }
      if (techRes.success && techRes.data && techRes.data.length > 0) {
        setTechnicians(techRes.data);
        if (selectedTechs.length === 0) {
          setSelectedTechs([techRes.data[0].name]);
        }
      }
      if (invRes.success) {
        setInventory(invRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadAllMasterData();
  }, []);

  const parseForkliftList = (rawForklifts) => {
    if (!rawForklifts) return [];
    let items = [];
    if (Array.isArray(rawForklifts)) {
      items = rawForklifts.flatMap(f => String(f).split(/,|\n/));
    } else if (typeof rawForklifts === 'string') {
      items = rawForklifts.split(/,|\n/);
    }
    return items
      .map(s => String(s).replace(/^[•\*\-\s]+/, '').trim())
      .filter(Boolean);
  };

  const availableSiteMachines = React.useMemo(() => {
    const currentClient = clients.find(c => c.id === selectedClientId || c.clientName === clientName);
    if (!currentClient || !currentClient.forklifts) return [];
    return parseForkliftList(currentClient.forklifts);
  }, [clients, selectedClientId, clientName]);

  const handleSelectClient = (cli) => {
    setSelectedClientId(cli.id);
    setClientName(cli.clientName);
    setSiteAddress(cli.siteAddress || 'Client Site');
    setContactPerson(cli.contactPerson || '');

    const machines = parseForkliftList(cli.forklifts);

    if (machines.length > 0) {
      setSelectedForklifts([machines[0]]);
      setForkliftModel(machines[0]);
      if (machines[0].toLowerCase().includes('diesel')) {
        setForkliftType('DIESEL');
      } else if (machines[0].toLowerCase().includes('electric')) {
        setForkliftType('ELECTRIC');
      }
    } else {
      setSelectedForklifts([]);
      setForkliftModel('');
    }
  };

  const handleToggleForklift = (machineName) => {
    let updated;
    if (selectedForklifts.includes(machineName)) {
      updated = selectedForklifts.filter(m => m !== machineName);
    } else {
      updated = [...selectedForklifts, machineName];
    }
    setSelectedForklifts(updated);
    setForkliftModel(updated.join(', '));
  };

  const handleToggleTask = (taskLabel) => {
    if (selectedTasks.includes(taskLabel)) {
      setSelectedTasks(prev => prev.filter(t => t !== taskLabel));
    } else {
      setSelectedTasks(prev => [...prev, taskLabel]);
    }
  };

  const handleAddCustomClause = (e) => {
    if (e) e.preventDefault();
    if (!customClauseInput.trim()) return;

    const newClause = `🛠️ ${customClauseInput.trim()}`;
    if (!customAddedClauses.includes(newClause)) {
      setCustomAddedClauses(prev => [newClause, ...prev]);
    }
    if (!selectedTasks.includes(newClause)) {
      setSelectedTasks(prev => [newClause, ...prev]);
    }
    setCustomClauseInput('');
  };

  const handleAddPart = (part) => {
    if (part.stockQuantity <= 0) {
      alert(`"${part.name}" ka stock 0 hai. Niche "+ Add Part" se stock badhayein.`);
      return;
    }

    const existingIndex = issuedParts.findIndex(p => p.partId === part.id);
    if (existingIndex !== -1) {
      const currentQty = issuedParts[existingIndex].qtyIssued;
      if (currentQty < part.stockQuantity) {
        setIssuedParts(prev => prev.map((p, idx) => 
          idx === existingIndex ? { ...p, qtyIssued: currentQty + 1 } : p
        ));
      } else {
        alert(`Godown me sirf ${part.stockQuantity} ${part.unit} available hai.`);
      }
    } else {
      setIssuedParts(prev => [...prev, {
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.name,
        name: part.name,
        category: part.category,
        unit: part.unit,
        unitPrice: part.unitPrice,
        stockAvailable: part.stockQuantity,
        qtyIssued: 1
      }]);
    }
  };

  const handleQtyChange = (partId, delta) => {
    setIssuedParts(prev => prev.map(p => {
      if (p.partId === partId) {
        const next = p.qtyIssued + delta;
        if (next <= 0) return null;
        const capped = Math.min(p.stockAvailable, next);
        return { ...p, qtyIssued: capped };
      }
      return p;
    }).filter(Boolean));
  };

  const handleRemovePart = (partId) => {
    setIssuedParts(prev => prev.filter(p => p.partId !== partId));
  };

  const handleToggleTech = (techName) => {
    if (selectedTechs.includes(techName)) {
      setSelectedTechs(prev => prev.filter(t => t !== techName));
    } else {
      setSelectedTechs(prev => [...prev, techName]);
    }
  };

  // Trigger dispatch submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const finalClient = clientName.trim();
    const finalLeadTech = selectedTechs[0] ? selectedTechs[0].trim() : '';
    const finalTeamMembers = selectedTechs.slice(1);

    if (!finalClient) {
      setError('⚠️ Kripya Client / Site select karein ya "+ Add Site" se naya add karein.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!finalLeadTech) {
      setError('⚠️ Kripya kam se kam 1 Technician select karein ya "+ Add Tech" se naya add karein.');
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return;
    }
    let finalTasks = [...selectedTasks];
    if (customClauseInput.trim()) {
      const customClause = `🛠️ ${customClauseInput.trim()}`;
      if (!finalTasks.includes(customClause)) {
        finalTasks.push(customClause);
      }
    }

    if (finalTasks.length === 0) {
      setError('⚠️ Kripya kam se kam 1 Work Scope select karein ya custom scope enter karein!');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    if (issuedParts.length === 0) {
      setError('⚠️ Kripya kam se kam 1 spare part select karein ya "+ Add Part" se add karein.');
      window.scrollTo({ top: 400, behavior: 'smooth' });
      return;
    }

    const combinedIssue = finalTasks.join(' • ');

    try {
      setSubmitting(true);
      const isScheduled = dispatchMode === 'SCHEDULED';
      const payload = {
        clientName: finalClient,
        siteAddress: siteAddress.trim() || 'Client Site',
        contactPerson: contactPerson || '',
        forkliftModel: forkliftModel ? `${forkliftModel} [${forkliftType}]` : `Forklift [${forkliftType}]`,
        forkliftSerialNo: forkliftSerialNo || '',
        issueDescription: combinedIssue,
        assignedTasks: selectedTasks,
        dispatchDate: dispatchDate || new Date().toISOString().split('T')[0],
        dispatchTime: dispatchTime || '10:00 AM',
        leadTechnician: finalLeadTech,
        teamMembers: finalTeamMembers,
        isScheduled,
        status: isScheduled ? 'SCHEDULED' : 'DISPATCHED',
        itemsIssued: issuedParts.map(p => ({
          partId: p.partId,
          qtyIssued: Number(p.qtyIssued) || 1
        }))
      };

      const res = await api.createDispatch(payload);
      if (res.success) {
        setSuccessMsg(res.message || `🚀 DISPATCH ${res.data.dispatchCode} CONFIRMED!`);
        if (onDataRefresh) onDataRefresh();
        setTimeout(() => {
          setActiveTab('active');
        }, 800);
      } else {
        setError(res.message || 'Dispatch creation failed.');
      }
    } catch (err) {
      console.error('Dispatch Submit Error:', err);
      setError(err.message || 'Server error while creating dispatch.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredParts = inventory.filter(item => {
    const s = partSearch.toLowerCase();
    return item.name.toLowerCase().includes(s) || item.partNumber.toLowerCase().includes(s);
  });

  const totalPartsQty = issuedParts.reduce((sum, i) => sum + i.qtyIssued, 0);

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28">
      
      {/* Top Header */}
      <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
            <Send className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white">
              {dispatchMode === 'SCHEDULED' ? 'Schedule Future Visit' : 'New Outward Dispatch'}
            </h1>
            <p className="text-[10px] text-slate-400">Outward Gate Pass • Real-time Sync</p>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Stacked 2-Grid on Mobile */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setDispatchMode('IMMEDIATE')}
          className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
            dispatchMode === 'IMMEDIATE'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>⚡ Immediate Trip</span>
        </button>

        <button
          type="button"
          onClick={() => setDispatchMode('SCHEDULED')}
          className={`py-2 px-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 ${
            dispatchMode === 'SCHEDULED'
              ? 'bg-blue-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>📅 Schedule Date</span>
        </button>
      </div>

      {/* Date & Time Selector Bar */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-md space-y-2">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
          <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{dispatchMode === 'SCHEDULED' ? 'Scheduled Visit Date & Time:' : 'Dispatch Date & Time:'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dispatchDate}
            onChange={(e) => setDispatchDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-mono focus:border-amber-400"
          />
          <input
            type="text"
            placeholder="10:30 AM"
            value={dispatchTime}
            onChange={(e) => setDispatchTime(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-mono focus:border-amber-400 text-center"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. SELECT SITE */}
      <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <Building className="w-3.5 h-3.5 shrink-0" />
            <span>1. SELECT SITE</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddSiteModal(true)}
            className="text-[10px] font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all"
          >
            + ADD SITE
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="p-3 bg-slate-950/60 rounded-xl text-center text-xs text-slate-400">
            Koi site nahi hai. Upar "+ ADD SITE" dabayein.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {clients.map((cli) => {
              const isSelected = selectedClientId === cli.id && clientName === cli.clientName;
              return (
                <button
                  key={cli.id}
                  type="button"
                  onClick={() => handleSelectClient(cli)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start space-x-2 active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-700 text-slate-400'}`}>
                    <Building className="w-3.5 h-3.5" />
                  </div>
                  <div className="overflow-hidden">
                    <strong className={`text-xs block truncate ${isSelected ? 'text-amber-300 font-bold' : 'text-white'}`}>
                      {cli.clientName}
                    </strong>
                    <span className="text-[10px] text-slate-400 block truncate">{cli.siteAddress}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Site Input */}
        {clientName && (
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Selected Site:</span>
                <strong className="text-white text-xs truncate block">{clientName}</strong>
              </div>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {selectedForklifts.length} Machine(s) Selected
              </span>
            </div>

            {/* Site Machines Toggle Pills */}
            {availableSiteMachines.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-800/80">
                <label className="text-slate-400 block text-[9px] uppercase font-bold">
                  Tap to Select Machine(s) / Forklifts (Multiple Allowed):
                </label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {availableSiteMachines.map((m, idx) => {
                    const isSelected = selectedForklifts.includes(m);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleForklift(m)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 active:scale-95 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span>🚜 {m}</span>
                        {isSelected && <span className="font-black text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Edit / Comma-Separated Input */}
            <div className="pt-1">
              <label className="text-slate-400 block text-[9px] uppercase font-bold mb-1">
                Selected Machine / Model (Comma Separated):
              </label>
              <input
                type="text"
                placeholder="E.g. Toyota 2.5T, Main Forklift 3T"
                value={forkliftModel}
                onChange={(e) => {
                  const val = e.target.value;
                  setForkliftModel(val);
                  setSelectedForklifts(val.split(',').map(s => s.trim()).filter(Boolean));
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. WORK / SCOPE (Category Buttons Placed Cleanly Below/Niche) */}
      <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-md">
        
        {/* Title & Count */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span>2. WORK SCOPE ({selectedTasks.length})</span>
          </label>
        </div>

        {/* Category Pills Placed Below Full Width */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-[11px] font-black text-center">
          <button
            type="button"
            onClick={() => setForkliftType('ELECTRIC')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              forkliftType === 'ELECTRIC' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Electric
          </button>
          <button
            type="button"
            onClick={() => setForkliftType('DIESEL')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              forkliftType === 'DIESEL' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⛽ Diesel
          </button>
          <button
            type="button"
            onClick={() => setForkliftType('ALL')}
            className={`py-1.5 px-1 rounded-lg transition-all ${
              forkliftType === 'ALL' 
                ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tasks
          </button>
        </div>

        {/* Clauses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {/* Custom clauses */}
          {customAddedClauses.map((clause, i) => {
            const isChecked = selectedTasks.includes(clause);
            return (
              <button
                key={`custom-${i}`}
                type="button"
                onClick={() => handleToggleTask(clause)}
                className={`p-2 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                  isChecked ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="truncate pr-1">{clause}</span>
                {isChecked && <span className="text-xs font-black shrink-0">✓</span>}
              </button>
            );
          })}

          {/* Electric */}
          {(forkliftType === 'ELECTRIC' || forkliftType === 'ALL') &&
            WORK_CLAUSES.ELECTRIC.map((clause, idx) => {
              const isChecked = selectedTasks.includes(clause);
              return (
                <button
                  key={`el-${idx}`}
                  type="button"
                  onClick={() => handleToggleTask(clause)}
                  className={`p-2 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                    isChecked ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="truncate pr-1">{clause}</span>
                  {isChecked && <span className="text-xs font-black shrink-0">✓</span>}
                </button>
              );
            })}

          {/* Diesel */}
          {(forkliftType === 'DIESEL' || forkliftType === 'ALL') &&
            WORK_CLAUSES.DIESEL.map((clause, idx) => {
              const isChecked = selectedTasks.includes(clause);
              return (
                <button
                  key={`ds-${idx}`}
                  type="button"
                  onClick={() => handleToggleTask(clause)}
                  className={`p-2 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                    isChecked ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="truncate pr-1">{clause}</span>
                  {isChecked && <span className="text-xs font-black shrink-0">✓</span>}
                </button>
              );
            })}

          {/* Common */}
          {WORK_CLAUSES.COMMON.map((clause, idx) => {
            const isChecked = selectedTasks.includes(clause);
            return (
              <button
                key={`cm-${idx}`}
                type="button"
                onClick={() => handleToggleTask(clause)}
                className={`p-2 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                  isChecked ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
              >
                <span className="truncate pr-1">{clause}</span>
                {isChecked && <span className="text-xs font-black shrink-0">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Add Custom Clause input */}
        <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
          <input
            type="text"
            placeholder="+ Custom Scope..."
            value={customClauseInput}
            onChange={(e) => setCustomClauseInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomClause(); } }}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400"
          />
          <button
            type="button"
            onClick={handleAddCustomClause}
            className="px-3 py-1.5 bg-amber-500 text-slate-950 font-black text-xs rounded-xl"
          >
            + Add
          </button>
        </div>
      </div>

      {/* 3. TECHNICIAN (Support Multi-Selection & Dynamic Availability) */}
      <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>3. SERVICE TEAM ({selectedTechs.length})</span>
          </label>
          <button
            type="button"
            onClick={() => setShowAddTechModal(true)}
            className="text-[10px] font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all"
          >
            + ADD TECH
          </button>
        </div>

        {technicians.length === 0 ? (
          <div className="p-3 bg-slate-950/60 rounded-xl text-center text-xs text-slate-400">
            Koi technician nahi hai. Upar "+ ADD TECH" dabayein.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {technicians.map((tech) => {
              const isSelected = selectedTechs.includes(tech.name);
              const isLead = selectedTechs[0] === tech.name;
              const isOnSite = tech.status === 'On Site';

              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => handleToggleTech(tech.name)}
                  className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 relative overflow-hidden ${
                    isSelected
                      ? isLead
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md ring-2 ring-amber-400/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold ring-2 ring-emerald-500/30'
                      : 'bg-slate-800/60 text-slate-200 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <strong className="text-xs block truncate">{tech.name}</strong>
                    
                    <div className="flex items-center space-x-1 shrink-0">
                      {isOnSite ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          🔴 Busy
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          🟢 Free
                        </span>
                      )}

                      {isSelected && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                          isLead ? 'bg-slate-950 text-amber-400' : 'bg-emerald-500 text-slate-950'
                        }`}>
                          {isLead ? '⭐ LEAD' : '👥 TEAM'}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] block truncate ${
                    isSelected ? (isLead ? 'text-slate-950 font-bold' : 'text-emerald-400') : 'text-slate-400'
                  }`}>
                    {tech.designation}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. SPARE PARTS */}
      <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span>4. PARTS ({issuedParts.length} ITEMS • {totalPartsQty} QTY)</span>
          </label>

          <button
            type="button"
            onClick={() => setShowAddPartModal(true)}
            className="text-[10px] font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all"
          >
            + ADD PART
          </button>
        </div>

        {/* Selected Items List */}
        {issuedParts.length > 0 && (
          <div className="space-y-1.5 p-2.5 bg-slate-950/70 rounded-xl border border-amber-500/30">
            <span className="text-[9px] font-black text-amber-300 uppercase block">
              PARTS IN BAG:
            </span>
            {issuedParts.map((item) => (
              <div 
                key={item.partId}
                className="p-2 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-between gap-2"
              >
                <div className="overflow-hidden">
                  <span className="font-bold text-white text-xs block truncate">{item.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{item.partNumber} • Stock: {item.stockAvailable}</span>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(item.partId, -1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="w-7 text-center text-xs font-black text-amber-400">
                    {item.qtyIssued}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQtyChange(item.partId, 1)}
                    className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePart(item.partId)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Part Picker */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search spare parts..."
            value={partSearch}
            onChange={(e) => setPartSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {filteredParts.length === 0 ? (
              <div className="col-span-full py-3 text-center text-xs text-slate-400">
                Koi part nahi mila. Upar "+ ADD PART" dabayein.
              </div>
            ) : (
              filteredParts.map((part) => {
                const selected = issuedParts.find(p => p.partId === part.id);
                const isOutOfStock = part.stockQuantity <= 0;

                return (
                  <button
                    key={part.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddPart(part)}
                    className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between active:scale-95 ${
                      isOutOfStock
                        ? 'bg-slate-900/40 border-slate-800 opacity-40'
                        : selected
                        ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/40'
                        : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="overflow-hidden mr-1">
                      <strong className="text-white text-xs block truncate">{part.name}</strong>
                      <span className="text-[10px] text-slate-400 block">{part.stockQuantity} {part.unit}</span>
                    </div>
                    <span className="text-xs font-black text-amber-400 shrink-0">
                      {selected ? `(${selected.qtyIssued})` : '+ Add'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="sticky bottom-16 sm:bottom-4 z-30 pt-2">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-all ${
            dispatchMode === 'SCHEDULED'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-slate-950'
              : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-amber-500/30'
          }`}
        >
          {submitting ? (
            <span>SAVING...</span>
          ) : dispatchMode === 'SCHEDULED' ? (
            <>
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Schedule Visit ({dispatchDate})</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 stroke-[3] shrink-0" />
              <span>Confirm & Dispatch ({issuedParts.length} Parts)</span>
            </>
          )}
        </button>
      </div>

      {/* POPUP: Add Site Modal */}
      {showAddSiteModal && (
        <QuickAddSiteModal
          onClose={() => setShowAddSiteModal(false)}
          onSuccess={(newCli) => {
            setShowAddSiteModal(false);
            setClients(prev => [...prev, newCli]);
            handleSelectClient(newCli);
          }}
        />
      )}

      {/* POPUP: Add Tech Modal */}
      {showAddTechModal && (
        <QuickAddTechModal
          onClose={() => setShowAddTechModal(false)}
          onSuccess={(newTech) => {
            setShowAddTechModal(false);
            setTechnicians(prev => [...prev, newTech]);
            setSelectedTechs(prev => [...prev, newTech.name]);
          }}
        />
      )}

      {/* POPUP: Add Part Modal */}
      {showAddPartModal && (
        <QuickAddPartModal
          onClose={() => setShowAddPartModal(false)}
          onSuccess={(newPart) => {
            setShowAddPartModal(false);
            setInventory(prev => [newPart, ...prev]);
            handleAddPart(newPart);
          }}
        />
      )}

    </div>
  );
}

// -------------------------------------------------------------
// INLINE QUICK MODALS
// -------------------------------------------------------------

function QuickAddSiteModal({ onClose, onSuccess }) {
  const [clientName, setClientName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [forklifts, setForklifts] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) return alert('Client Name is required');

    try {
      setLoading(true);
      const res = await api.createClient({
        clientName: clientName.trim(),
        siteAddress: siteAddress.trim(),
        contactPerson: contactPerson.trim(),
        forklifts: forklifts ? forklifts.split(',').map(f => f.trim()).filter(Boolean) : ['Toyota 2.5T', 'Diesel Forklift']
      });
      if (res.success) {
        onSuccess(res.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-black text-white text-sm">Add New Client / Site</h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 font-bold block mb-1">Company / Client Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Tata Motors"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Site Location / Address</label>
            <input
              type="text"
              placeholder="e.g. Pune Plant 2, Gate 4"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Contact Person / Phone</label>
            <input
              type="text"
              placeholder="e.g. Rahul Sharma (9876543210)"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-lg transition-all active:scale-95"
          >
            {loading ? 'Saving...' : 'Save & Select Site'}
          </button>
        </form>
      </div>
    </div>
  );
}

function QuickAddTechModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDropdown, setSelectedDropdown] = useState('Senior Forklift Mechanic');
  const [customDesignation, setCustomDesignation] = useState('');
  const [loading, setLoading] = useState(false);

  const STANDARD_TECH_ROLES = [
    'Senior Forklift Mechanic',
    'Lead Service Engineer',
    'Electrical Technician',
    'Hydraulic Specialist',
    'Assistant Technician',
    'Diesel Engine Mechanic',
    'Battery & Charger Specialist',
    'Helper / Trainee',
    'Store / Warehouse Incharge'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Technician Name is required');

    const finalDesignation = selectedDropdown === '__CUSTOM__'
      ? (customDesignation.trim() || 'Technician')
      : selectedDropdown;

    try {
      setLoading(true);
      const res = await api.createTechnician({
        name: name.trim(),
        phone: phone.trim(),
        designation: finalDesignation,
        experience: '2 Years'
      });
      if (res.success) {
        onSuccess(res.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to add technician');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-black text-white text-sm">Add Technician / Staff</h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 font-bold block mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-slate-400 font-bold block mb-1">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
            />
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Role / Designation</label>
              <select
                value={selectedDropdown}
                onChange={(e) => {
                  setSelectedDropdown(e.target.value);
                  if (e.target.value !== '__CUSTOM__') {
                    setCustomDesignation('');
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
              >
                {STANDARD_TECH_ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
                <option value="__CUSTOM__">✍️ + Custom Designation (Apna Likhein)</option>
              </select>
            </div>

            {selectedDropdown === '__CUSTOM__' && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1 animate-fadeIn">
                <label className="block text-[10px] font-bold text-amber-400">
                  ✍️ Enter Custom Designation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Forklift Electrical Specialist"
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 ring-1 ring-amber-400/20"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-lg transition-all active:scale-95"
          >
            {loading ? 'Saving...' : 'Save & Assign Tech'}
          </button>
        </form>
      </div>
    </div>
  );
}

function QuickAddPartModal({ onClose, onSuccess }) {
  const [partNumber, setPartNumber] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General Spare Parts');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [unit, setUnit] = useState('Nos');
  const [unitPrice, setUnitPrice] = useState('500');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Part Name is required');

    try {
      setLoading(true);
      const res = await api.createPart({
        partNumber: partNumber.trim() || 'PART-' + Math.floor(1000 + Math.random() * 9000),
        name: name.trim(),
        category,
        stockQuantity: Number(stockQuantity) || 0,
        unit,
        unitPrice: Number(unitPrice) || 0,
        minAlertQuantity: 2,
        locationRack: 'Rack A-1'
      });
      if (res.success) {
        onSuccess(res.data);
      }
    } catch (err) {
      alert(err.message || 'Failed to add part');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-black text-white text-sm">Add New Part to Godown</h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 font-bold block mb-1">Part Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Hydraulic Hose 1/2-inch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 font-bold block mb-1">Part Code / Number</label>
              <input
                type="text"
                placeholder="e.g. HYD-HOSE-01"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-slate-400 font-bold block mb-1">Initial Stock Qty</label>
              <input
                type="tel"
                inputMode="numeric"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-lg transition-all active:scale-95"
          >
            {loading ? 'Saving...' : 'Save & Select Part'}
          </button>
        </form>
      </div>
    </div>
  );
}
