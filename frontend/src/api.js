import { auth } from './firebase';

// Automatically detect whether accessed via localhost (laptop) or local network IP (mobile phone)
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
const API_BASE = isLocal ? `http://${hostname}:5000/api` : '/api';

async function request(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    const userUid = auth.currentUser?.uid || (typeof localStorage !== 'undefined' ? localStorage.getItem('ve_user_uid') : '') || '';

    const headers = {
      'Content-Type': 'application/json',
      'x-user-uid': userUid,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (!response.ok) {
        throw new Error(`Server Error (${response.status}): ${text.replace(/<[^>]*>/g, '').trim().slice(0, 150) || 'Server error occurred'}`);
      }
      throw new Error(`Invalid response format from server.`);
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Inventory
  getInventory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory?${query}`);
  },
  getPart: (id) => request(`/inventory/${id}`),
  createPart: (data) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  bulkImportParts: (parts) => request('/inventory/bulk-import', { method: 'POST', body: JSON.stringify({ parts }) }),
  updatePart: (id, data) => request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePart: (id) => request(`/inventory/${id}`, { method: 'DELETE' }),

  // Dispatches
  getDispatches: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/dispatches?${query}`);
  },
  getDispatch: (id) => request(`/dispatches/${id}`),
  createDispatch: (data) => request('/dispatches', { method: 'POST', body: JSON.stringify(data) }),
  startScheduledTrip: (id) => request(`/dispatches/${id}/start-trip`, { method: 'POST' }),
  reconcileDispatch: (id, data) => request(`/dispatches/${id}/reconcile`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDispatch: (id) => request(`/dispatches/${id}`, { method: 'DELETE' }),

  // Technicians
  getTechnicians: () => request('/technicians'),
  createTechnician: (data) => request('/technicians', { method: 'POST', body: JSON.stringify(data) }),
  updateTechnician: (id, data) => request(`/technicians/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTechnician: (id) => request(`/technicians/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: () => request('/clients'),
  createClient: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  // Reports & Dashboard
  getDashboard: () => request('/reports/dashboard'),
  getDashboardMetrics: () => request('/reports/dashboard'),
  getLedger: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/ledger?${query}`);
  },
  syncFromSheets: () => request('/reports/sync-from-sheets', { method: 'POST' }),
  syncFromGoogleSheets: () => request('/reports/sync-from-sheets', { method: 'POST' }),

  // User Authentication & Approvals
  registerOrSyncUser: (data) => request('/auth/register-or-sync', { method: 'POST', body: JSON.stringify(data) }),
  getUserStatus: (uid) => request(`/auth/status/${uid}`),
  getAllUsers: () => request('/auth/users'),
  updateUserStatus: (uid, data) => request(`/auth/users/${uid}/status`, { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (uid) => request(`/auth/users/${uid}`, { method: 'DELETE' })
};
