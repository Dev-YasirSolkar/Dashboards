import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  ChevronDown, 
  Download, 
  CheckCircle2, 
  ArrowUpRight,
  TrendingDown,
  Layers,
  MapPin,
  X
} from 'lucide-react';
import { api } from '../api';
import * as XLSX from 'xlsx';

export default function HistoryReports() {
  const [activeSubTab, setActiveSubTab] = useState('DISPATCHES'); // 'DISPATCHES' | 'LEDGER'
  const [dispatches, setDispatches] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Selected job card for print/modal
  const [selectedJobCard, setSelectedJobCard] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dispRes, ledgRes, techRes] = await Promise.allSettled([
        api.getDispatches({
          status: statusFilter,
          employee: employeeFilter,
          startDate,
          endDate,
          search
        }),
        api.getLedger({
          employee: employeeFilter,
          startDate,
          endDate,
          search
        }),
        api.getTechnicians()
      ]);

      if (dispRes.status === 'fulfilled' && dispRes.value?.success) {
        setDispatches(dispRes.value.data || []);
      }
      if (ledgRes.status === 'fulfilled' && ledgRes.value?.success) {
        setLedger(ledgRes.value.data || []);
      }
      if (techRes.status === 'fulfilled' && techRes.value?.success) {
        setTechnicians(techRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, employeeFilter, clientFilter, startDate, endDate, search]);

  const clearFilters = () => {
    setStatusFilter('ALL');
    setEmployeeFilter('ALL');
    setClientFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (activeSubTab === 'DISPATCHES') {
      if (dispatches.length === 0) {
        alert('No dispatch records to export.');
        return;
      }

      const rows = dispatches.map(d => ({
        'Job Code': d.dispatchCode,
        'Client Name': d.clientName,
        'Site Location': d.siteAddress,
        'Forklift Machine': d.forkliftModel,
        'Lead Technician': d.leadTechnician,
        'Helper Team': (d.teamMembers || []).join(', '),
        'Dispatch Date': d.dispatchDate,
        'Dispatch Time': d.dispatchTime,
        'Status': d.status,
        'Return Date': d.returnDate || 'Pending',
        'Verified By': d.verifiedBy || '',
        'Total Items Issued': (d.itemsIssued || []).reduce((s, i) => s + (i.qtyIssued || 0), 0),
        'Total Items Used': (d.itemsIssued || []).reduce((s, i) => s + (i.qtyUsed || 0), 0),
        'Total Items Returned': (d.itemsIssued || []).reduce((s, i) => s + (i.qtyReturned || 0), 0),
        'Work Report Summary': d.workSummary || d.issueDescription || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dispatches History');
      XLSX.writeFile(wb, `Dispatches_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      if (ledger.length === 0) {
        alert('No ledger transactions to export.');
        return;
      }

      const rows = ledger.map(l => ({
        'Timestamp': new Date(l.timestamp).toLocaleString(),
        'Transaction Type': l.type,
        'Part Code': l.partNumber,
        'Part Name': l.partName,
        'Quantity Change': l.quantityChanged,
        'Balance Stock After': l.balanceAfter,
        'Reference ID': l.referenceId,
        'Employee / Staff': l.employeeName || '',
        'Notes': l.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Ledger');
      XLSX.writeFile(wb, `Stock_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Data Provenance Banner */}
      <div className="bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-white leading-tight">
                Service History & Stock Audit Ledger
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete audit trail of past site visits, issued spare parts, returned items & stock transactions.
              </p>
            </div>
          </div>
          
          {/* Data Origin Explanation Badge */}
          <div className="mt-3 inline-flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800/90 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">
              Data Source: <strong className="text-amber-400">Google Sheets (Dispatches Tab)</strong> & <strong className="text-emerald-400">App Internal Audit Ledger (Real-Time 2-Way Sync)</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel Report</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Service Visits</span>
          <strong className="text-lg sm:text-xl font-black text-white block">{dispatches.length}</strong>
        </div>
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Completed Trips</span>
          <strong className="text-lg sm:text-xl font-black text-emerald-400 block">
            {dispatches.filter(d => d.status === 'COMPLETED').length}
          </strong>
        </div>
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active On-Site</span>
          <strong className="text-lg sm:text-xl font-black text-amber-400 block">
            {dispatches.filter(d => d.status === 'DISPATCHED' || d.status === 'SCHEDULED').length}
          </strong>
        </div>
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Audit Ledger Logs</span>
          <strong className="text-lg sm:text-xl font-black text-purple-400 block">{ledger.length}</strong>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          onClick={() => setActiveSubTab('DISPATCHES')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'DISPATCHES'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Dispatches History ({dispatches.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('LEDGER')}
          className={`pb-3 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'LEDGER'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stock Audit Ledger ({ledger.length})</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
          <span className="flex items-center space-x-1.5 text-white">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Search & Filter Records</span>
          </span>
          {(statusFilter !== 'ALL' || employeeFilter !== 'ALL' || clientFilter !== 'ALL' || startDate || endDate || search) && (
            <button onClick={clearFilters} className="text-amber-400 hover:underline text-xs font-bold">
              Clear All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search code, client, part..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed / Reconciled</option>
            <option value="DISPATCHED">Active / On Site</option>
          </select>

          {/* Employee */}
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All Technicians</option>
            {technicians.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>

          {/* Date Range Start */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          />

          {/* Date Range End */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Dispatches History Tab */}
      {activeSubTab === 'DISPATCHES' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : dispatches.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
              No service dispatch records matched your search filters.
            </div>
          ) : (
            dispatches.map((dsp) => {
              const isCompleted = dsp.status === 'COMPLETED';
              const totalIssued = (dsp.itemsIssued || []).reduce((s, i) => s + (i.qtyIssued || 0), 0);
              const totalUsed = (dsp.itemsIssued || []).reduce((s, i) => s + (i.qtyUsed || 0), 0);
              const totalReturned = (dsp.itemsIssued || []).reduce((s, i) => s + (i.qtyReturned || 0), 0);

              // Clean date strings
              const cleanDateStr = String(dsp.dispatchDate || '')
                .replace(/Outward:\s*/gi, '')
                .replace(/Returned:\s*/gi, '')
                .replace(/\s*\([\d:\sAPM]+\)/gi, '')
                .split('\n')[0]
                .trim() || 'Today';

              return (
                <div
                  key={dsp.id}
                  className="bg-slate-900 rounded-3xl border border-slate-800 hover:border-slate-700 p-4 sm:p-5 shadow-xl transition-all space-y-3.5"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                        {dsp.dispatchCode}
                      </span>
                      <h2 className="text-base sm:text-lg font-black text-white">{dsp.clientName}</h2>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        isCompleted 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        {isCompleted ? '✓ COMPLETED & RECONCILED' : '🟢 ACTIVE ON-SITE'}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedJobCard(dsp)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 self-start sm:self-auto transition-colors whitespace-nowrap"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Job Card</span>
                    </button>
                  </div>

                  {/* Summary grid (4-Col Metadata) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/90 text-xs">
                    
                    {/* 1. Client & Machine */}
                    <div className="space-y-1">
                      <span className="text-slate-500 uppercase font-bold text-[9px] block tracking-wider">Client & Machine</span>
                      <strong className="text-white text-xs block leading-tight">{dsp.clientName}</strong>
                      <p className="text-amber-300 font-bold text-xs">🚜 {dsp.forkliftModel}</p>
                      <p className="text-slate-400 text-[11px]">📍 {dsp.siteAddress || 'Site Location'}</p>
                    </div>

                    {/* 2. Technician Team */}
                    <div className="space-y-1">
                      <span className="text-slate-500 uppercase font-bold text-[9px] block tracking-wider">Technician Team</span>
                      <p className="text-amber-300 font-bold text-xs leading-tight">
                        👨‍🔧 Lead: {dsp.leadTechnician}
                      </p>
                      <p className="text-slate-300 text-[11px] leading-tight">
                        🤝 Helpers: <span className="text-slate-200">{dsp.teamMembers && dsp.teamMembers.length > 0 ? dsp.teamMembers.join(', ') : 'None'}</span>
                      </p>
                      {dsp.verifiedBy && (
                        <p className="text-emerald-400 text-[10px] font-semibold pt-0.5">
                          ✍️ Verified By: {dsp.verifiedBy}
                        </p>
                      )}
                    </div>

                    {/* 3. Schedule & Return Timeline */}
                    <div className="space-y-1">
                      <span className="text-slate-500 uppercase font-bold text-[9px] block tracking-wider">Timeline & Schedule</span>
                      <p className="text-slate-300 text-[11px] font-medium">
                        🚀 Dispatched: <strong>{cleanDateStr}</strong> ({dsp.dispatchTime || '10:00 AM'})
                      </p>
                      <p className="text-emerald-400 text-[11px] font-bold">
                        ✅ Completed: <strong>{dsp.returnDate || 'Pending Return'}</strong> {dsp.returnTime ? `(${dsp.returnTime})` : ''}
                      </p>
                    </div>

                    {/* 4. Parts Reconciliation Breakdown */}
                    <div className="space-y-1">
                      <span className="text-slate-500 uppercase font-bold text-[9px] block tracking-wider">Parts Reconciliation</span>
                      <div className="flex items-center space-x-2 font-bold text-xs whitespace-nowrap pt-0.5">
                        <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Issued: {totalIssued}</span>
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Used: {totalUsed}</span>
                        <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Ret: {totalReturned}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        Total {dsp.itemsIssued?.length || 0} unique part items
                      </span>
                    </div>

                  </div>

                  {/* Work Description & Problem */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider block">
                        ⚠️ Scope of Work / Reported Issue:
                      </span>
                      <p className="text-slate-200 leading-relaxed font-medium">
                        {dsp.issueDescription || 'Standard breakdown & maintenance service.'}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                      <span className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider block">
                        🛠️ Work Done / Work Summary Report:
                      </span>
                      <div className="text-slate-200 leading-relaxed font-medium whitespace-pre-line">
                        {dsp.workSummary || (isCompleted ? '• ✅ Service visit completed & verified.' : '• 🟢 Work in progress on site.')}
                      </div>
                    </div>
                  </div>

                  {/* Spare Parts Table */}
                  <div className="bg-slate-950/80 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 text-xs">
                    <div className="p-2.5 px-3 bg-slate-800/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Spare Parts Dispatched & Installed On Machine</span>
                      <span>Usage Status</span>
                    </div>
                    {(dsp.itemsIssued || []).length === 0 ? (
                      <div className="p-3 text-center text-slate-500 text-xs">No spare parts issued for this trip.</div>
                    ) : (
                      (dsp.itemsIssued || []).map((item, idx) => (
                        <div key={idx} className="p-2.5 px-3.5 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0 whitespace-nowrap">
                              {item.partNumber || 'N/A'}
                            </span>
                            <span className="text-white font-medium truncate">{item.partName || item.name}</span>
                          </div>

                          <div className="flex items-center space-x-2.5 text-right text-[11px] shrink-0 whitespace-nowrap">
                            <span className="text-slate-300">Issued: <strong className="text-amber-400">{item.qtyIssued} {item.unit || 'Nos'}</strong></span>
                            <span className="text-slate-600">•</span>
                            <span className="text-emerald-400 font-bold">Used: {item.qtyUsed || 0}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-blue-400 font-bold">Ret: {item.qtyReturned || 0}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Stock Audit Ledger Tab */}
      {activeSubTab === 'LEDGER' && (
        <div className="space-y-4">
          
          {/* Info Banner */}
          <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-start space-x-2.5">
            <Layers className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Stock Audit Ledger:</strong> Every stock quantity change (Dispatch Outward, Return Restock, or Manual Inventory Stock Adjustment) is automatically logged here with timestamp, reference ID, and balance stock after transaction.
            </p>
          </div>

          {/* MOBILE VIEW FOR LEDGER: Cards Layout */}
          <div className="block md:hidden space-y-3">
            {ledger.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
                No stock audit ledger entries found.
              </div>
            ) : (
              ledger.map((tx) => (
                <div key={tx.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-4 space-y-2.5 shadow-xl">
                  {/* 1. Header: Timestamp + Type badge */}
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span className="font-mono text-[11px] text-slate-400">
                      📅 {new Date(tx.timestamp).toLocaleString()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap ${
                      tx.type === 'DISPATCH_OUT' 
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : tx.type === 'RETURN_RESTOCK'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {tx.type}
                    </span>
                  </div>

                  {/* 2. Part Name & Quantity Change */}
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <strong className="text-white text-xs block leading-tight">{tx.partName}</strong>
                      <span className="font-mono text-[10px] text-slate-500">{tx.partNumber}</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-black text-sm block ${
                        tx.quantityChanged > 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {tx.quantityChanged > 0 ? `+${tx.quantityChanged}` : tx.quantityChanged}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block">Bal Stock: {tx.balanceAfter}</span>
                    </div>
                  </div>

                  {/* 3. Reference & Employee */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="font-mono text-amber-400 font-bold">Ref: {tx.referenceId}</span>
                    <span>Staff: <strong className="text-slate-200">{tx.employeeName || 'Admin'}</strong></span>
                  </div>

                  {/* 4. Notes */}
                  {tx.notes && (
                    <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 break-words">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">Notes:</span>
                      <p className="leading-snug">{tx.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* DESKTOP VIEW FOR LEDGER: Table Layout */}
          <div className="hidden md:block bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                    <th className="p-4 whitespace-nowrap">Date & Time</th>
                    <th className="p-4 whitespace-nowrap">Transaction Type</th>
                    <th className="p-4 whitespace-nowrap">Part Details</th>
                    <th className="p-4 text-center whitespace-nowrap">Quantity Changed</th>
                    <th className="p-4 text-center whitespace-nowrap">Balance Stock</th>
                    <th className="p-4 whitespace-nowrap">Reference & Staff</th>
                    <th className="p-4">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ledger.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">
                        No stock audit ledger records matched your search filters.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono text-slate-400 whitespace-nowrap">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            tx.type === 'DISPATCH_OUT' 
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : tx.type === 'RETURN_RESTOCK'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <strong className="text-white block text-xs">{tx.partName}</strong>
                          <span className="text-slate-500 font-mono text-[10px]">{tx.partNumber}</span>
                        </td>
                        <td className="p-4 text-center font-mono font-black text-sm whitespace-nowrap">
                          <span className={tx.quantityChanged > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                            {tx.quantityChanged > 0 ? `+${tx.quantityChanged}` : tx.quantityChanged}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-white whitespace-nowrap">
                          <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            {tx.balanceAfter}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 whitespace-nowrap">
                          <span className="font-mono text-amber-400 font-bold block">{tx.referenceId}</span>
                          <span className="text-slate-400 text-[10px] block">By: {tx.employeeName || 'Admin'}</span>
                        </td>
                        <td className="p-4 text-slate-300 break-words max-w-xs leading-relaxed">
                          {tx.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable Job Card Modal */}
      {selectedJobCard && (
        <JobCardModal
          dispatch={selectedJobCard}
          onClose={() => setSelectedJobCard(null)}
        />
      )}

    </div>
  );
}

function JobCardModal({ dispatch, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  const totalIssued = (dispatch.itemsIssued || []).reduce((s, i) => s + (i.qtyIssued || 0), 0);
  const totalUsed = (dispatch.itemsIssued || []).reduce((s, i) => s + (i.qtyUsed || 0), 0);
  const totalReturned = (dispatch.itemsIssued || []).reduce((s, i) => s + (i.qtyReturned || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Service Job Card & Delivery Challan
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-amber-400 font-bold text-sm block">{dispatch.dispatchCode}</span>
                <strong className="text-white text-base block mt-0.5">{dispatch.clientName}</strong>
                <span className="text-slate-400 text-[11px]">{dispatch.siteAddress}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {dispatch.status}
                </span>
                <p className="text-slate-400 text-[10px] mt-1">{dispatch.dispatchDate} {dispatch.dispatchTime}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[9px]">Forklift Machine:</span>
                <span className="text-slate-200 font-semibold">{dispatch.forkliftModel}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[9px]">Lead Technician:</span>
                <span className="text-slate-200 font-semibold">{dispatch.leadTechnician}</span>
              </div>
            </div>

            {dispatch.issueDescription && (
              <div className="pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-500 block uppercase font-bold text-[9px]">Scope of Work:</span>
                <p className="text-slate-300 leading-snug">{dispatch.issueDescription}</p>
              </div>
            )}
          </div>

          {/* Parts List */}
          <div>
            <span className="text-slate-400 uppercase font-bold text-[10px] block mb-1.5">Spare Parts Dispatched:</span>
            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
              <div className="bg-slate-800/80 p-2 px-3 text-slate-400 font-semibold text-[10px] grid grid-cols-4">
                <span className="col-span-2">Part Name</span>
                <span className="text-center">Issued</span>
                <span className="text-right">Used / Ret</span>
              </div>
              {(dispatch.itemsIssued || []).map((item, i) => (
                <div key={i} className="p-2.5 px-3 grid grid-cols-4 items-center">
                  <div className="col-span-2">
                    <strong className="text-white block text-[11px] truncate">{item.partName}</strong>
                    <span className="font-mono text-[9px] text-slate-500">{item.partNumber}</span>
                  </div>
                  <span className="text-center text-slate-200 font-bold">{item.qtyIssued} {item.unit}</span>
                  <span className="text-right text-[11px]">
                    <span className="text-emerald-400 font-bold">{item.qtyUsed || 0}</span> / <span className="text-blue-400 font-bold">{item.qtyReturned || 0}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Now</span>
          </button>
        </div>

      </div>
    </div>
  );
}
