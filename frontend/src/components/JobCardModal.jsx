import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Package, 
  Wrench, 
  ShieldCheck, 
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';

export default function JobCardModal({ dispatch, onClose }) {
  const [downloadingImage, setDownloadingImage] = useState(false);
  const cardRef = useRef(null);

  if (!dispatch) return null;

  // Mobile & browser back button support
  useEffect(() => {
    window.history.pushState({ modal: 'jobCard' }, '');
    const handleBack = () => {
      onClose();
    };
    window.addEventListener('popstate', handleBack);
    return () => {
      window.removeEventListener('popstate', handleBack);
    };
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setDownloadingImage(true);
      
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High resolution crisp image
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1024
      });

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `JobCard_${dispatch.dispatchCode || 'Doc'}_${new Date().toISOString().slice(0,10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export card as image:', err);
      alert('Image download failed. Please try Print / Save as PDF.');
    } finally {
      setDownloadingImage(false);
    }
  };

  const isCompleted = dispatch.status === 'COMPLETED';
  const totalPartsIssued = (dispatch.itemsIssued || []).reduce((acc, item) => acc + (Number(item.qtyIssued) || 0), 0);
  const totalPartsUsed = (dispatch.itemsIssued || []).reduce((acc, item) => acc + (Number(item.qtyUsed) || 0), 0);
  const totalPartsReturned = (dispatch.itemsIssued || []).reduce((acc, item) => acc + (Number(item.qtyReturned) || 0), 0);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const cb = dispatch.costBreakdown;
  const hasCost = isCompleted && cb && (cb.totalCost > 0 || cb.partsCost > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-transparent">
      
      {/* Modal Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden print:max-h-none print:border-none print:rounded-none print:shadow-none">
        
        {/* Top Control Bar (Hidden in Print) */}
        <div className="p-3.5 sm:p-4 bg-slate-950 text-white flex items-center justify-between no-print border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm sm:text-base block leading-tight text-white">
                Official Job Card & Challan
              </span>
              <span className="font-mono text-[11px] text-amber-400 font-bold">
                REF: {dispatch.dispatchCode}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Download Image Button */}
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={downloadingImage}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition-all active:scale-95 shadow-md"
              title="Download Job Card as PNG Image"
            >
              {downloadingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Download Image</span>
                  <span className="sm:hidden">PNG</span>
                </>
              )}
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-lg active:scale-95"
              title="Print on Paper or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Print / PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Area (Custom Light Mode Executive Sheet) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40 print:p-0 print:bg-white">
          
          {/* Printable Sheet Card */}
          <div 
            ref={cardRef}
            id="printable-job-card" 
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto border border-slate-200 print:shadow-none print:border-none print:p-4 print:max-w-none font-sans"
            style={{ minHeight: '900px' }}
          >
            
            {/* Header Section */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-lg shadow-md shrink-0 border border-slate-800">
                  VE
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-none">
                    VE INVENTORY
                  </h1>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">
                    VITHAL ENTERPRISES
                  </span>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Forklift Spares, Material Gate Pass & Site Service Operations
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  SERVICE CHALLAN / JOB CARD
                </span>
                <span className="text-lg font-mono font-black text-slate-950 block leading-tight">
                  {dispatch.dispatchCode}
                </span>
                <div className="mt-1">
                  <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    isCompleted 
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {isCompleted ? '● WORK COMPLETED & CLOSED' : '● ON-SITE / IN PROGRESS'}
                  </span>
                </div>
              </div>
            </div>

            {/* Client & Equipment Summary 2-Column Box */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              
              {/* Left Column: Customer & Site Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  CLIENT & SITE DETAILS
                </span>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold block">Company / Client:</span>
                  <strong className="text-slate-950 text-sm block leading-tight">{dispatch.clientName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold block">Site Address:</span>
                  <p className="text-slate-800 text-[11px] leading-snug">{dispatch.siteAddress}</p>
                </div>
                {dispatch.contactPerson && (
                  <div>
                    <span className="text-slate-500 text-[10px] font-bold block">Site Contact:</span>
                    <span className="text-slate-800 font-semibold">{dispatch.contactPerson}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Machine & Crew Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  EQUIPMENT & SERVICE CREW
                </span>
                
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold text-[10px]">Forklift Unit:</span>
                  <strong className="text-slate-950">{dispatch.forkliftModel} {dispatch.forkliftSerialNo && `(S/N: ${dispatch.forkliftSerialNo})`}</strong>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold text-[10px]">Dispatch Schedule:</span>
                  <span className="text-slate-800 font-semibold font-mono">{dispatch.dispatchDate} at {dispatch.dispatchTime}</span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold text-[10px]">Service Technician:</span>
                  <strong className="text-slate-950">{dispatch.leadTechnician}</strong>
                </div>

                {dispatch.teamMembers && dispatch.teamMembers.length > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500 font-bold text-[10px]">Assistants / Helpers:</span>
                    <span className="text-slate-800 font-medium">{dispatch.teamMembers.join(', ')}</span>
                  </div>
                )}

                {dispatch.returnDate && (
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                    <span className="text-emerald-700 font-bold text-[10px]">Return & Closed:</span>
                    <span className="text-emerald-800 font-mono font-bold">{dispatch.returnDate} at {dispatch.returnTime}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Reported Problem / Job Scope */}
            <div className="mb-4 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
              <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 block mb-0.5">
                REPORTED PROBLEM / WORK SCOPE:
              </span>
              <p className="text-slate-800 font-medium text-xs leading-relaxed">
                {dispatch.issueDescription || 'Periodic maintenance, breakdown inspection & spares replacement.'}
              </p>
            </div>

            {/* Work Scope Completion Report (only when completed) */}
            {isCompleted && dispatch.completionReport && (
              <div className="mb-4 rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                    WORK SCOPE COMPLETION REPORT
                  </span>
                </div>

                {/* Completed Tasks */}
                {dispatch.completionReport.completedTasks && dispatch.completionReport.completedTasks.length > 0 && (
                  <div className="px-3 pt-2 pb-1">
                    <span className="text-[9px] font-black uppercase text-emerald-700 block mb-1">✅ Completed Tasks ({dispatch.completionReport.completedTasks.length})</span>
                    <div className="space-y-0.5">
                      {dispatch.completionReport.completedTasks.map((task, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5">
                          <span className="text-emerald-600 font-black text-[10px] mt-0.5">✓</span>
                          <span className="text-slate-700 text-[11px]">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Incomplete Tasks */}
                {dispatch.completionReport.incompleteTasks && dispatch.completionReport.incompleteTasks.length > 0 && (
                  <div className="px-3 pt-1.5 pb-1 border-t border-slate-100">
                    <span className="text-[9px] font-black uppercase text-rose-700 block mb-1">❌ Not Completed ({dispatch.completionReport.incompleteTasks.length})</span>
                    <div className="space-y-0.5">
                      {dispatch.completionReport.incompleteTasks.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5">
                          <span className="text-rose-500 font-black text-[10px] mt-0.5">✗</span>
                          <span className="text-slate-700 text-[11px]">
                            {item.task || item}
                            {item.reason ? <span className="text-slate-500 italic"> — {item.reason}</span> : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra Work */}
                {dispatch.completionReport.extraWork && dispatch.completionReport.extraWork.length > 0 && (
                  <div className="px-3 pt-1.5 pb-2 border-t border-slate-100 bg-purple-50/50">
                    <span className="text-[9px] font-black uppercase text-purple-700 block mb-1">➕ Additional / Extra Work Done</span>
                    <div className="space-y-0.5">
                      {dispatch.completionReport.extraWork.map((task, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5">
                          <span className="text-purple-600 font-black text-[10px] mt-0.5">+</span>
                          <span className="text-slate-700 text-[11px]">{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks */}
                {dispatch.completionReport.remarks && (
                  <div className="px-3 pt-1 pb-2 border-t border-slate-100">
                    <span className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">📝 Remarks</span>
                    <p className="text-slate-700 text-[11px] italic">{dispatch.completionReport.remarks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Fallback: Assigned tasks list when not yet completed */}
            {!isCompleted && dispatch.assignedTasks && dispatch.assignedTasks.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-200 overflow-hidden text-xs">
                <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800">
                    ASSIGNED WORK SCOPE ({dispatch.assignedTasks.length} Tasks — In Progress)
                  </span>
                </div>
                <div className="px-3 py-2 space-y-0.5">
                  {dispatch.assignedTasks.map((task, idx) => (
                    <div key={idx} className="flex items-start space-x-1.5">
                      <span className="text-amber-600 font-black text-[10px] mt-0.5">→</span>
                      <span className="text-slate-700 text-[11px]">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts Issued, Used & Returned Table */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  PARTS CONSUMPTION & RETURN RECONCILIATION
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  Total Items: {dispatch.itemsIssued?.length || 0}
                </span>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black text-[10px] uppercase border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                    <th className="p-2 border-r border-slate-300 text-left">Part No. & Description</th>
                    <th className="p-2 border-r border-slate-300 text-center w-16">Issued</th>
                    <th className="p-2 border-r border-slate-300 text-center w-16 bg-emerald-50 text-emerald-900">Used</th>
                    <th className="p-2 border-r border-slate-300 text-center w-16 bg-blue-50 text-blue-900">Returned</th>
                    <th className="p-2 text-left">Installation Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {(dispatch.itemsIssued && dispatch.itemsIssued.length > 0) ? (
                    dispatch.itemsIssued.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <span className="font-mono font-bold text-slate-950 block">{item.partNumber || 'N/A'}</span>
                          <span className="text-slate-700 text-xs">{item.partName}</span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-900 font-mono">
                          {item.qtyIssued} <span className="text-[9px] font-normal text-slate-500">{item.unit || 'Nos'}</span>
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-emerald-700 bg-emerald-50/40 font-mono">
                          {item.qtyUsed || 0}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center font-bold text-blue-700 bg-blue-50/40 font-mono">
                          {item.qtyReturned || 0}
                        </td>
                        <td className="p-2 text-slate-700 text-[10px]">
                          {item.installationNotes || (item.qtyUsed > 0 ? 'Fitted & verified on unit' : 'Returned to warehouse stock')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-3 text-center text-slate-500 text-xs">
                        No parts were issued for this service trip.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Summary Footer */}
                {dispatch.itemsIssued && dispatch.itemsIssued.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 text-[10px] uppercase border-t-2 border-slate-300">
                      <td colSpan="2" className="p-2 text-right border-r border-slate-300 font-black">
                        Total Quantities:
                      </td>
                      <td className="p-2 text-center font-mono border-r border-slate-300 font-black">
                        {totalPartsIssued}
                      </td>
                      <td className="p-2 text-center font-mono border-r border-slate-300 font-black text-emerald-800 bg-emerald-50">
                        {totalPartsUsed}
                      </td>
                      <td className="p-2 text-center font-mono border-r border-slate-300 font-black text-blue-800 bg-blue-50">
                        {totalPartsReturned}
                      </td>
                      <td className="p-2 text-[9px] text-slate-500 font-normal">
                        Reconciled in Inventory Ledger
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Work Completed Summary */}
            {dispatch.workSummary && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900 block mb-0.5">
                  WORK PERFORMED / TECHNICAL COMPLETION REPORT:
                </span>
                <p className="text-slate-800 text-xs leading-relaxed font-medium">
                  {dispatch.workSummary}
                </p>
              </div>
            )}

            {/* ── TRIP COST BREAKDOWN ── */}
            {hasCost && (
              <div className="mb-4 rounded-xl border border-slate-300 overflow-hidden text-xs">
                {/* Header */}
                <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-900">
                    MAINTENANCE TRIP COST BREAKDOWN
                  </span>
                  <span className="text-[9px] font-bold text-amber-700 font-mono">
                    {dispatch.dispatchCode}
                  </span>
                </div>

                <table className="w-full border-collapse text-xs">
                  <tbody className="divide-y divide-slate-100">
                    {/* Parts Cost row */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-slate-600 font-semibold w-1/2">
                        🔩 Parts / Spare Parts Cost
                        <span className="block text-[9px] text-slate-400 font-normal">
                          {(dispatch.itemsIssued || []).filter(i => (i.qtyUsed || 0) > 0).map(i =>
                            `${i.partName} (${i.qtyUsed} × ₹${i.unitPrice || 0})`
                          ).join(', ') || 'Used parts'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">{fmt(cb.partsCost)}</td>
                    </tr>

                    {/* Travelling Cost */}
                    {(cb.travellingCost || 0) > 0 && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-slate-600 font-semibold">
                          🚗 Travelling Cost
                          <span className="block text-[9px] text-slate-400 font-normal">Petrol, vehicle, toll charges</span>
                        </td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">{fmt(cb.travellingCost)}</td>
                      </tr>
                    )}

                    {/* Labour / Service Charge */}
                    {(cb.labourCost || 0) > 0 && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-slate-600 font-semibold">
                          👷 Labour / Service Charge
                          <span className="block text-[9px] text-slate-400 font-normal">Technician service fee</span>
                        </td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">{fmt(cb.labourCost)}</td>
                      </tr>
                    )}

                    {/* Other / Misc */}
                    {(cb.otherCost || 0) > 0 && (
                      <tr className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 text-slate-600 font-semibold">
                          📦 Other / Miscellaneous
                          {cb.otherCostNote && <span className="block text-[9px] text-slate-400 font-normal">{cb.otherCostNote}</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 font-mono">{fmt(cb.otherCost)}</td>
                      </tr>
                    )}
                  </tbody>

                  {/* Total Row */}
                  <tfoot>
                    <tr className="bg-amber-50 border-t-2 border-amber-300">
                      <td className="px-3 py-2.5 font-black text-amber-900 text-sm uppercase tracking-wide">
                        💰 TOTAL MAINTENANCE TRIP COST
                      </td>
                      <td className="px-3 py-2.5 text-right font-black text-amber-900 text-base font-mono">
                        {fmt(cb.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* 3 Authorization Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 mt-4 border-t-2 border-slate-300 text-xs text-center">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="h-10 border-b border-dashed border-slate-300 mb-1 flex items-end justify-center">
                  <span className="text-[9px] text-slate-300 font-mono italic">Sign Here</span>
                </div>
                <strong className="block text-slate-950 text-[11px] truncate">{dispatch.leadTechnician}</strong>
                <span className="text-slate-500 text-[9px] block uppercase font-bold">Service Technician Sign</span>
              </div>
              
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="h-10 border-b border-dashed border-slate-300 mb-1 flex items-end justify-center">
                  <span className="text-[9px] text-slate-300 font-mono italic">Sign / Stamp</span>
                </div>
                <strong className="block text-slate-950 text-[11px] truncate">{dispatch.verifiedBy || 'Store Incharge'}</strong>
                <span className="text-slate-500 text-[9px] block uppercase font-bold">Warehouse Stock Return Verified</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="h-10 border-b border-dashed border-slate-300 mb-1 flex items-end justify-center">
                  <span className="text-[9px] text-slate-300 font-mono italic">Sign & Stamp</span>
                </div>
                <strong className="block text-slate-950 text-[11px] truncate">{dispatch.clientName}</strong>
                <span className="text-slate-500 text-[9px] block uppercase font-bold">Client / Site Supervisor Sign</span>
              </div>
            </div>

            {/* Footer Audit Trail */}
            <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] text-slate-500 flex justify-between font-mono">
              <span>VE INVENTORY • Computer Generated Service Challan</span>
              <span>Ref: {dispatch.dispatchCode} • Generated: {new Date().toLocaleString()}</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
