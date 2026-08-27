import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  ArrowUpDown, 
  Upload, 
  Download, 
  CheckCircle2, 
  FileSpreadsheet,
  MapPin,
  X,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react';
import { api } from '../api';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import FullStockListModal from '../components/FullStockListModal';

export default function Inventory({ onDataRefresh }) {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFullStockModal, setShowFullStockModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const fileInputRef = useRef(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory({
        category: selectedCategory,
        search
      });
      if (res.success) {
        setInventory(res.data || []);
        setStats(res.stats || {});
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(() => {
      api.getInventory({ category: selectedCategory, search })
        .then(res => {
          if (res.success) {
            setInventory(res.data || []);
            setStats(res.stats || {});
          }
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedCategory, search]);

  const showToast = (msg) => {
    setToastMessage(msg);
    if (onDataRefresh) onDataRefresh();
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDelete = async (part) => {
    if (window.confirm(`Are you sure you want to delete "${part.name}" (${part.partNumber}) from inventory & Google Sheet?`)) {
      try {
        const res = await api.deletePart(part.id);
        if (res.success) {
          showToast(res.message || 'Part deleted & updated in Google Sheet!');
          fetchInventory();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete part.');
      }
    }
  };

  // Excel / CSV Export
  const handleExportExcel = () => {
    if (inventory.length === 0) {
      alert('No inventory items to export.');
      return;
    }

    const exportData = inventory.map(item => {
      const row = {
        'Part Number': item.partNumber,
        'Part Name': item.name,
        'Category': item.category,
        'Current Stock': item.stockQuantity,
        'Min Alert Level': item.minAlertQuantity,
        'Unit': item.unit
      };
      if (isAdmin) {
        row['Unit Price (INR)'] = item.unitPrice || 0;
      }
      row['Location / Rack'] = item.locationRack || 'Warehouse Rack';
      row['Compatibility / Notes'] = item.description || '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Warehouse Inventory');
    XLSX.writeFile(wb, `Forklift_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel / CSV Bulk Upload & Parsing
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (!rawData || rawData.length === 0) {
          alert('Excel sheet seems empty or could not be parsed.');
          return;
        }

        const normalizedParts = rawData.map(row => ({
          partNumber: (row['Part Number'] || row['Part Code'] || row['part_number'] || row['PART NO'] || row['PartNo'] || '').toString().trim(),
          name: (row['Part Name'] || row['Name'] || row['part_name'] || row['DESCRIPTION'] || row['Item Name'] || '').toString().trim(),
          category: (row['Category'] || row['CATEGORY'] || 'General Spare Parts').toString().trim(),
          stockQuantity: Number(row['Current Stock'] || row['Stock'] || row['Quantity'] || row['QTY'] || row['stockQuantity'] || 0),
          minAlertQuantity: Number(row['Min Stock Alert'] || row['Min Alert'] || row['MIN ALERT'] || 2),
          unit: (row['Unit'] || row['UNIT'] || 'Nos').toString().trim(),
          unitPrice: Number(row['Unit Price'] || row['Price'] || row['PRICE'] || row['Rate'] || 0),
          locationRack: (row['Location / Rack'] || row['Location'] || row['Rack'] || row['Bin'] || 'Warehouse Rack').toString().trim(),
          description: (row['Compatibility / Notes'] || row['Description'] || row['Notes'] || '').toString().trim()
        })).filter(p => p.partNumber && p.name);

        if (normalizedParts.length === 0) {
          alert('Could not find columns for Part Number and Part Name in uploaded file.');
          return;
        }

        const res = await api.bulkImportParts(normalizedParts);
        if (res.success) {
          showToast(res.message);
          fetchInventory();
        }
      } catch (err) {
        console.error('File parsing error:', err);
        alert('Error parsing Excel file: ' + err.message);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const categories = [
    'ALL',
    'Motors & Electrical',
    'Hydraulics',
    'Mast & Carriage',
    'Brakes & Tires',
    'Filters & Consumables',
    'Battery & Charger',
    'General Spare Parts'
  ];

  const displayItems = filterLowStockOnly
    ? inventory.filter(item => item.stockQuantity <= item.minAlertQuantity)
    : inventory;

  return (
    <div className="space-y-5">
      
      {/* Hidden file input for Excel upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between shadow-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-xs sm:text-sm">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white text-xs ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Page Header */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Forklift Warehouse Inventory
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of spares, motors, hydraulic pumps, filters & consumables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View All Full-Page List Button */}
          <button
            onClick={() => setShowFullStockModal(true)}
            title="Open Full Page Row-by-Row Stock List"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all active:scale-95 shadow-md"
          >
            <span>📋 View All (Row-by-Row)</span>
          </button>

          {/* Import Excel Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload Excel / CSV"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export</span>
          </button>

          {/* Add Part Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Part</span>
          </button>
        </div>
      </div>

      {/* Stats summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900/80 p-3 sm:p-3.5 rounded-2xl border border-slate-800">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase block">Total Part SKUs</span>
          <span className="text-lg sm:text-xl font-black text-white block mt-0.5">{stats.totalItems || 0}</span>
        </div>
        <div 
          onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          className={`p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition-all ${
            filterLowStockOnly 
              ? 'bg-rose-950/40 border-rose-500 text-rose-300 ring-2 ring-rose-500/30' 
              : 'bg-slate-900/80 border-slate-800 hover:border-rose-500/50'
          }`}
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-rose-400 uppercase flex items-center justify-between">
            <span>Low Stock</span>
            {filterLowStockOnly && <span className="text-[9px] bg-rose-500 text-white px-1.5 rounded font-black">Filtered</span>}
          </span>
          <span className="text-lg sm:text-xl font-black text-rose-400 block mt-0.5">{stats.lowStockItems || 0} Items</span>
        </div>
        <div className="bg-slate-900/80 p-3 sm:p-3.5 rounded-2xl border border-slate-800">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase block">Out of Stock</span>
          <span className="text-lg sm:text-xl font-black text-amber-400 block mt-0.5">{stats.outOfStockItems || 0} Items</span>
        </div>
        <div className="bg-slate-900/80 p-3 sm:p-3.5 rounded-2xl border border-slate-800">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase block">Est. Valuation</span>
          <span className="text-lg sm:text-xl font-black text-emerald-400 block mt-0.5">
            {isAdmin ? `₹${(stats.totalValue || 0).toLocaleString('en-IN')}` : '₹ ***'}
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by part name, part code, rack location, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Horizontal Scroll Hint */}
      <div className="block sm:hidden flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-amber-400 font-semibold shadow-md">
        <div className="flex items-center space-x-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5 animate-pulse" />
          <span>Swipe left ➔ right to view all columns</span>
        </div>
        <span className="text-[10px] text-slate-400">Total {displayItems.length} Parts</span>
      </div>

      {/* UNIVERSAL HORIZONTALLY SCROLLABLE TABLE (Works for Mobile, Tablet, Desktop) */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-800/90 text-slate-400 font-semibold border-b border-slate-800 text-[11px] uppercase tracking-wider">
                <th className="p-3.5 sm:p-4 whitespace-nowrap min-w-[200px]">Part Code & Name</th>
                <th className="p-3.5 sm:p-4 whitespace-nowrap">Category</th>
                <th className="p-3.5 sm:p-4 text-center whitespace-nowrap">In Stock</th>
                <th className="p-3.5 sm:p-4 text-center whitespace-nowrap">Min Alert</th>
                <th className="p-3.5 sm:p-4 whitespace-nowrap">Location / Rack</th>
                {isAdmin && <th className="p-3.5 sm:p-4 text-right whitespace-nowrap">Unit Price</th>}
                <th className="p-3.5 sm:p-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading parts inventory...
                  </td>
                </tr>
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500 text-xs">
                    No spare parts found. Click <strong>"+ Add Part"</strong> above.
                  </td>
                </tr>
              ) : (
                displayItems.map((part) => {
                  const isLow = part.stockQuantity <= part.minAlertQuantity;
                  const isZero = part.stockQuantity === 0;

                  return (
                    <tr key={part.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & Code (1-Line Title + Next-Line Description) */}
                      <td className="p-3.5 sm:p-4 min-w-[200px]">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                            {part.partNumber}
                          </span>
                          <strong className="text-white text-sm font-bold truncate block">
                            {part.name}
                          </strong>
                        </div>
                        {part.description && (
                          <div className="text-[11px] text-slate-400 mt-1 break-words max-w-xs leading-snug">
                            {part.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3.5 sm:p-4 text-slate-300 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] border border-slate-700 font-medium">
                          {part.category}
                        </span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="p-3.5 sm:p-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-block ${
                          isZero
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : isLow
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {part.stockQuantity} {part.unit}
                        </span>
                      </td>

                      {/* Min Alert */}
                      <td className="p-3.5 sm:p-4 text-center text-slate-400 font-mono whitespace-nowrap">
                        {part.minAlertQuantity} {part.unit}
                      </td>

                      {/* Location Rack */}
                      <td className="p-3.5 sm:p-4 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-medium">{part.locationRack || 'Warehouse'}</span>
                        </div>
                      </td>

                      {/* Unit Price (Only Visible to Admin) */}
                      {isAdmin && (
                        <td className="p-3.5 sm:p-4 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                          ₹{(part.unitPrice || 0).toLocaleString('en-IN')}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="p-3.5 sm:p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setEditingPart(part)}
                            title="Edit part details"
                            className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(part)}
                            title="Delete part from inventory"
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Part Modal */}
      {(showAddModal || editingPart) && (
        <PartModal
          isAdmin={isAdmin}
          isEdit={Boolean(editingPart)}
          initialData={editingPart}
          onClose={() => {
            setShowAddModal(false);
            setEditingPart(null);
          }}
          onSuccess={(msg) => {
            setShowAddModal(false);
            setEditingPart(null);
            showToast(msg);
            fetchInventory();
          }}
        />
      )}

      {/* Full Page Row-by-Row Stock List Modal */}
      {showFullStockModal && (
        <FullStockListModal
          onClose={() => setShowFullStockModal(false)}
        />
      )}

    </div>
  );
}

function PartModal({ isAdmin, isEdit, initialData, onClose, onSuccess }) {
  useEffect(() => {
    window.history.pushState({ modal: 'partModal' }, '');
    const handleBack = () => onClose();
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [onClose]);

  const [partNumber, setPartNumber] = useState(initialData?.partNumber || '');
  const [name, setName] = useState(initialData?.name || '');
  const [category, setCategory] = useState(initialData?.category || 'Motors & Electrical');
  const [stockQuantity, setStockQuantity] = useState(initialData?.stockQuantity ?? 10);
  const [minAlertQuantity, setMinAlertQuantity] = useState(initialData?.minAlertQuantity ?? 2);
  const [unit, setUnit] = useState(initialData?.unit || 'Nos');
  const [unitPrice, setUnitPrice] = useState(initialData?.unitPrice ?? 0);
  const [locationRack, setLocationRack] = useState(initialData?.locationRack || 'Rack A-01');
  const [description, setDescription] = useState(initialData?.description || '');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!partNumber.trim() || !name.trim()) {
      setError('Part Code and Part Name are required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        partNumber: partNumber.trim(),
        name: name.trim(),
        category,
        stockQuantity: Number(stockQuantity),
        minAlertQuantity: Number(minAlertQuantity),
        unit,
        unitPrice: Number(unitPrice),
        locationRack,
        description,
        adjustmentReason: isEdit ? adjustmentReason : undefined
      };

      if (isEdit) {
        const res = await api.updatePart(initialData.id, payload);
        if (res.success) onSuccess(res.message || 'Part updated successfully.');
      } else {
        const res = await api.createPart(payload);
        if (res.success) onSuccess(res.message || 'Part added to warehouse inventory.');
      }
    } catch (err) {
      setError(err.message || 'Failed to save part.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Motors & Electrical',
    'Hydraulics',
    'Mast & Carriage',
    'Brakes & Tires',
    'Filters & Consumables',
    'Battery & Charger',
    'General Spare Parts'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {isEdit ? 'Edit Spare Part / Adjust Stock' : 'Add New Forklift Spare Part'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Part Number / Code *</label>
              <input
                type="text"
                required
                placeholder="E.g. MOT-TX-48V"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Part Name & Specifications *</label>
            <input
              type="text"
              required
              placeholder="E.g. 48V AC Traction Drive Motor Assembly"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Current Stock *</label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Min Alert Level</label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={minAlertQuantity}
                onChange={(e) => setMinAlertQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white text-center focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="Nos">Nos</option>
                <option value="Set">Set</option>
                <option value="Can">Can</option>
                <option value="Ltr">Ltr</option>
                <option value="Pair">Pair</option>
                <option value="Mtr">Mtr</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Unit Price (₹ INR)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            <div className={isAdmin ? '' : 'sm:col-span-2'}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Godown Rack / Bin Location</label>
              <input
                type="text"
                placeholder="E.g. Rack B-04 / Bin 12"
                value={locationRack}
                onChange={(e) => setLocationRack(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Forklift Compatibility / Notes</label>
            <textarea
              rows="2"
              placeholder="E.g. Fits Toyota 8FB, Godrej 2.5T, Voltas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Stock Adjustment Reason (Audit)</label>
              <input
                type="text"
                placeholder="E.g. Physical inventory count correction"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add to Inventory'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
