import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building, 
  Plus, 
  Phone, 
  MapPin, 
  Briefcase, 
  Truck, 
  CheckCircle2, 
  X,
  Search,
  Trash2,
  Edit3
} from 'lucide-react';
import { api } from '../api';

export default function TechniciansClients() {
  const [activeTab, setActiveTab] = useState('TECH'); // 'TECH' | 'CLIENTS'
  const [technicians, setTechnicians] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTechModal, setShowTechModal] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [techRes, cliRes] = await Promise.all([
        api.getTechnicians(),
        api.getClients()
      ]);
      if (techRes.success) setTechnicians(techRes.data || []);
      if (cliRes.success) setClients(cliRes.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      Promise.all([api.getTechnicians(), api.getClients()])
        .then(([techRes, cliRes]) => {
          if (techRes.success) setTechnicians(techRes.data || []);
          if (cliRes.success) setClients(cliRes.data || []);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleDeleteTech = async (tech) => {
    if (window.confirm(`Remove technician "${tech.name}" from Cloud Database?`)) {
      try {
        const res = await api.deleteTechnician(tech.id);
        if (res.success) {
          showToast('Technician removed & synced to Cloud Database.');
          loadData();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete technician.');
      }
    }
  };

  const handleDeleteClient = async (cli) => {
    if (window.confirm(`Remove client site "${cli.clientName}" from Cloud Database?`)) {
      try {
        const res = await api.deleteClient(cli.id);
        if (res.success) {
          showToast('Client site removed & synced to Cloud Database.');
          loadData();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete client site.');
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Field Technicians & Client Directory
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your service staff, engineer contacts, and frequent client site locations with 2-way Google Sheet sync.
          </p>
        </div>

        <div>
          {activeTab === 'TECH' ? (
            <button
              onClick={() => setShowTechModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Technician</span>
            </button>
          ) : (
            <button
              onClick={() => setShowClientModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Client Site</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-4">
        <button
          onClick={() => setActiveTab('TECH')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'TECH'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employees / Technicians ({technicians.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CLIENTS')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'CLIENTS'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Client Companies & Sites ({clients.length})</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'TECH' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl space-y-3 relative hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-base border border-amber-500/20">
                    {tech.name.charAt(0)}
                  </div>
                  <div>
                    <strong className="text-white text-base block">{tech.name}</strong>
                    <span className="text-xs text-amber-400 font-medium">{tech.designation}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingTech(tech)}
                    className="text-slate-400 hover:text-amber-400 p-1.5 transition-colors"
                    title="Edit Technician Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTech(tech)}
                    className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors"
                    title="Delete Technician"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                {tech.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{tech.phone}</span>
                  </div>
                )}
                {tech.experience && (
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    <span>Experience: {tech.experience}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
                  tech.status === 'On Site'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {tech.status === 'On Site' 
                    ? `🔴 On Site (${tech.currentTrip?.dispatchCode || 'Busy'})` 
                    : '🟢 Available'}
                </span>
                {tech.scheduledCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap">
                    📅 {tech.scheduledCount} Scheduled
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clients.map((cli) => (
            <div
              key={cli.id}
              className="bg-slate-900 rounded-3xl border border-slate-800 p-5 shadow-xl space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/20">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-white text-base block">{cli.clientName}</strong>
                    <span className="text-xs text-slate-400">{cli.contactPerson || 'No contact specified'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingClient(cli)}
                    className="text-slate-400 hover:text-amber-400 p-1.5 transition-colors"
                    title="Edit Client Site"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClient(cli)}
                    className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors"
                    title="Delete Client Site"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-300 flex items-start space-x-2 pt-2 border-t border-slate-800/80">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>{cli.siteAddress}</span>
              </div>

              {(() => {
                let forkliftList = [];
                if (Array.isArray(cli.forklifts)) {
                  forkliftList = cli.forklifts.flatMap(f => String(f).split(',')).map(s => s.trim()).filter(Boolean);
                } else if (typeof cli.forklifts === 'string') {
                  forkliftList = cli.forklifts.split(',').map(s => s.trim()).filter(Boolean);
                }

                if (forkliftList.length === 0) return null;

                return (
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      🚜 Registered Forklift Models ({forkliftList.length}):
                    </span>
                    <div className="space-y-1">
                      {forkliftList.map((fl, i) => (
                        <div 
                          key={i} 
                          className="px-3 py-1.5 bg-slate-950/80 rounded-xl text-xs text-amber-300 border border-slate-800 flex items-center space-x-2 font-semibold"
                        >
                          <span className="text-amber-400 font-bold text-xs shrink-0">•</span>
                          <span className="text-slate-200">{fl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Technician Modal */}
      {(showTechModal || editingTech) && (
        <TechModal
          initialData={editingTech}
          isEdit={Boolean(editingTech)}
          onClose={() => {
            setShowTechModal(false);
            setEditingTech(null);
          }}
          onSuccess={(msg) => {
            setShowTechModal(false);
            setEditingTech(null);
            showToast(msg);
            loadData();
          }}
        />
      )}

      {/* Add / Edit Client Modal */}
      {(showClientModal || editingClient) && (
        <ClientModal
          initialData={editingClient}
          isEdit={Boolean(editingClient)}
          onClose={() => {
            setShowClientModal(false);
            setEditingClient(null);
          }}
          onSuccess={(msg) => {
            setShowClientModal(false);
            setEditingClient(null);
            showToast(msg);
            loadData();
          }}
        />
      )}

    </div>
  );
}

const STANDARD_DESIGNATIONS = [
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

function TechModal({ initialData, isEdit, onClose, onSuccess }) {
  useEffect(() => {
    window.history.pushState({ modal: 'techModal' }, '');
    const handleBack = () => onClose();
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [onClose]);

  const initialIsCustom = initialData?.designation && !STANDARD_DESIGNATIONS.includes(initialData.designation);

  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [selectedDropdown, setSelectedDropdown] = useState(
    initialIsCustom ? '__CUSTOM__' : (initialData?.designation || 'Senior Forklift Mechanic')
  );
  const [customDesignation, setCustomDesignation] = useState(
    initialIsCustom ? initialData.designation : ''
  );
  const [experience, setExperience] = useState(initialData?.experience || '2 Years');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Technician name is required.');
      return;
    }

    const finalDesignation = selectedDropdown === '__CUSTOM__' 
      ? (customDesignation.trim() || 'Technician') 
      : selectedDropdown;

    try {
      setLoading(true);
      if (isEdit) {
        const res = await api.updateTechnician(initialData.id, {
          name: name.trim(),
          phone: phone.trim(),
          designation: finalDesignation,
          experience
        });
        if (res.success) onSuccess('Technician updated & synced to Cloud Database!');
      } else {
        const res = await api.createTechnician({
          name: name.trim(),
          phone: phone.trim(),
          designation: finalDesignation,
          experience
        });
        if (res.success) onSuccess('New technician added & synced to Cloud Database!');
      }
    } catch (err) {
      setError(err.message || 'Failed to save technician.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              {isEdit ? 'Edit Technician Details' : 'Add New Service Technician'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="E.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (Mobile)</label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="E.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Designation / Role</label>
                <select
                  value={selectedDropdown}
                  onChange={(e) => {
                    setSelectedDropdown(e.target.value);
                    if (e.target.value !== '__CUSTOM__') {
                      setCustomDesignation('');
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {STANDARD_DESIGNATIONS.map((des) => (
                    <option key={des} value={des}>{des}</option>
                  ))}
                  <option value="__CUSTOM__">✍️ + Custom / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Experience</label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3 Years">3 Years</option>
                  <option value="5+ Years">5+ Years</option>
                  <option value="10+ Years">10+ Years</option>
                </select>
              </div>
            </div>

            {/* Custom Designation Input Box */}
            {selectedDropdown === '__CUSTOM__' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1 animate-fadeIn">
                <label className="block text-[11px] font-bold text-amber-400">
                  ✍️ Enter Custom Designation / Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Field Supervisor / Special Engineer"
                  value={customDesignation}
                  onChange={(e) => setCustomDesignation(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 ring-1 ring-amber-400/20"
                />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Details' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientModal({ initialData, isEdit, onClose, onSuccess }) {
  useEffect(() => {
    window.history.pushState({ modal: 'clientModal' }, '');
    const handleBack = () => onClose();
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [onClose]);

  const [clientName, setClientName] = useState(initialData?.clientName || '');
  const [siteAddress, setSiteAddress] = useState(initialData?.siteAddress || '');
  const [contactPerson, setContactPerson] = useState(initialData?.contactPerson || '');
  const [forklifts, setForklifts] = useState(Array.isArray(initialData?.forklifts) ? initialData.forklifts.join(', ') : (initialData?.forklifts || 'Toyota 2.5T, Godrej 3T Electric'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !siteAddress.trim()) {
      setError('Client Name and Site Address are required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        clientName: clientName.trim(),
        siteAddress: siteAddress.trim(),
        contactPerson: contactPerson.trim(),
        forklifts: forklifts ? forklifts.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      if (isEdit) {
        const res = await api.updateClient(initialData.id, payload);
        if (res.success) onSuccess('Client site updated & synced to Google Sheet!');
      } else {
        const res = await api.createClient(payload);
        if (res.success) onSuccess('New client site added & synced to Google Sheet!');
      }
    } catch (err) {
      setError(err.message || 'Failed to save client.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              {isEdit ? 'Edit Client Site Details' : 'Add New Client & Site Location'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Client Name *</label>
            <input
              type="text"
              required
              placeholder="E.g. Tata Motors Plant 1"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Site / Godown Address *</label>
            <textarea
              rows="2"
              required
              placeholder="E.g. Plot No. 45, Chakan MIDC Phase 2, Pune"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Site Contact Person & Phone</label>
            <input
              type="text"
              placeholder="E.g. Mr. Sharma (9876543210)"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Forklifts Deployed (Comma separated)</label>
            <input
              type="text"
              placeholder="E.g. Toyota 8FB25, Godrej 3T Electric, Voltas 3T"
              value={forklifts}
              onChange={(e) => setForklifts(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Client' : 'Save Client Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
