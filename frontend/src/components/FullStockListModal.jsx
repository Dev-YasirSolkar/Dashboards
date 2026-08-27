import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Search, 
  Filter, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Plus,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function FullStockListModal({ onClose, onSelectPart }) {
  const { isAdmin } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

  // Back button handle
  useEffect(() => {
    window.history.pushState({ modal: 'fullStockList' }, '');
    const handleBack = () => onClose();
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [onClose]);

  const loadStock = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory();
      if (res.success) {
        setInventory(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load stock list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

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

  // Filtering
  const filteredItems = inventory.filter(item => {
    const s = search.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(s) || 
                          item.partNumber.toLowerCase().includes(s) ||
                          (item.locationRack || '').toLowerCase().includes(s);

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === 'IN_STOCK') {
      matchesStatus = item.stockQuantity > item.minAlertQuantity;
    } else if (statusFilter === 'LOW_STOCK') {
      matchesStatus = item.stockQuantity <= item.minAlertQuantity && item.stockQuantity > 0;
    } else if (statusFilter === 'OUT_OF_STOCK') {
      matchesStatus = item.stockQuantity === 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalQty = inventory.reduce((sum, item) => sum + (item.stockQuantity || 0), 0);
  const lowStockCount = inventory.filter(item => item.stockQuantity <= item.minAlertQuantity).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
      
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 shrink-0 max-w-6xl w-full mx-auto">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Package className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  Complete Warehouse Stock Catalog
                </h2>
                <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30">
                  {inventory.length} SKUs
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live row-by-row parts availability, rack bin locations & inventory levels.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-md shrink-0"
            title="Close Stock List"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search part name, code, rack location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Category Dropdown */}
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

        {/* Status Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'ALL' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Items ({inventory.length})
          </button>

          <button
            onClick={() => setStatusFilter('IN_STOCK')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'IN_STOCK' 
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md' 
                : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
            }`}
          >
            🟢 In Stock
          </button>

          <button
            onClick={() => setStatusFilter('LOW_STOCK')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'LOW_STOCK' 
                ? 'bg-amber-500 text-slate-950 font-black shadow-md' 
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
          >
            ⚠️ Low Stock ({lowStockCount})
          </button>

          <button
            onClick={() => setStatusFilter('OUT_OF_STOCK')}
            className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'OUT_OF_STOCK' 
                ? 'bg-rose-500 text-white font-black shadow-md' 
                : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
            }`}
          >
            🔴 Out of Stock
          </button>
        </div>

      </div>

      {/* Main Row-by-Row Stock List Container */}
      <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto my-3 pr-1 space-y-2.5">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading parts catalog...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <Package className="w-10 h-10 text-slate-600 mx-auto" />
            <strong className="text-white text-sm block">Koi spare part match nahi hua</strong>
            <p className="text-xs text-slate-500">Search query ya filter badal kar check karein.</p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isZero = item.stockQuantity === 0;
            const isLow = item.stockQuantity <= item.minAlertQuantity && !isZero;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3 sm:p-4 shadow-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                
                {/* Left: Part Code, Name, Category & Location */}
                <div className="flex items-start space-x-3 overflow-hidden flex-1">
                  
                  {/* Serial Number */}
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
                    {index + 1}
                  </div>

                  <div className="space-y-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 whitespace-nowrap">
                        {item.partNumber}
                      </span>
                      <strong className="text-white text-sm sm:text-base font-bold truncate block">
                        {item.name}
                      </strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 font-medium">
                        {item.category}
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1 text-[11px] text-slate-300">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>Rack: <strong>{item.locationRack || 'Warehouse'}</strong></span>
                      </span>
                      {item.description && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500 truncate max-w-xs">{item.description}</span>
                        </>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right: Quantity Badge, Pricing (Admin only), Status */}
                <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
                  
                  {/* Stock Quantity Pill */}
                  <div className="text-left sm:text-right">
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap inline-flex items-center space-x-1 ${
                        isZero
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : isLow
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        <span>{item.stockQuantity} {item.unit}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Min Alert: {item.minAlertQuantity} {item.unit}
                    </span>
                  </div>

                  {/* Pricing (Only for Admin) */}
                  <div className="text-right pl-3 border-l border-slate-800">
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Unit Cost:</span>
                    <strong className="text-xs sm:text-sm font-mono font-bold text-amber-300 block whitespace-nowrap">
                      {isAdmin ? `₹${(item.unitPrice || 0).toLocaleString('en-IN')}` : '₹ ***'}
                    </strong>
                  </div>

                </div>

              </div>
            );
          })
        )}

      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 px-4 shadow-xl shrink-0 max-w-6xl w-full mx-auto flex items-center justify-between text-xs font-bold text-slate-400">
        <div className="flex items-center space-x-3">
          <span>Showing: <strong className="text-white">{filteredItems.length}</strong> of {inventory.length} Parts</span>
          <span>•</span>
          <span>Total In-Stock Qty: <strong className="text-amber-400">{totalQty} Units</strong></span>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all active:scale-95"
        >
          Close Catalog
        </button>
      </div>

    </div>
  );
}
