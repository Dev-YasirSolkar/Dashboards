const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDatabase, saveDatabase, uuidv4 } = require('./database');
const { fetchAllDataFromGoogleSheets } = require('./googleSheets');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

const { router: authRouter, requireApprovedUser } = require('./routes/auth');

// Auto-sync Google Sheets on GET requests (crucial for Vercel Serverless environment)
app.use(async (req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api/') && !req.path.includes('/auth/')) {
    try {
      await autoSyncFromSheets(true);
    } catch (e) {
      console.warn('[Sheets Sync Middleware Warn]:', e.message);
    }
  }
  next();
});

// Public Auth Routes (Register, Login Sync, Status Check)
app.use('/api/auth', authRouter);

// Protected Operational Routes (Require APPROVED status or Super Admin)
app.use('/api/inventory', requireApprovedUser, require('./routes/inventory'));
app.use('/api/dispatches', requireApprovedUser, require('./routes/dispatches'));
app.use('/api/technicians', requireApprovedUser, require('./routes/technicians'));
app.use('/api/clients', requireApprovedUser, require('./routes/clients'));
app.use('/api/reports', requireApprovedUser, require('./routes/reports'));

// Background Auto-Sync Worker (Google Sheets ➔ App every 10 seconds)
async function autoSyncFromSheets(force = false) {
  try {
    const sheetData = await fetchAllDataFromGoogleSheets(force);
    if (!sheetData) return;

    const db = getDatabase();
    let modified = false;

    // 1. Sync Inventory
    if (Array.isArray(sheetData.inventory)) {
      db.inventory = sheetData.inventory.map(item => {
        const existing = (db.inventory || []).find(i => i.partNumber === item.partNumber);
        return {
          id: existing?.id || 'part-' + uuidv4().slice(0, 8),
          partNumber: item.partNumber,
          name: item.name,
          category: item.category || 'General Spare Parts',
          stockQuantity: Number(item.stockQuantity) || 0,
          minAlertQuantity: existing?.minAlertQuantity || 2,
          unit: item.unit || 'Nos',
          unitPrice: Number(item.unitPrice) || 0,
          locationRack: item.locationRack || 'Warehouse Rack',
          description: existing?.description || '',
          updatedAt: new Date().toISOString()
        };
      });
      modified = true;
    }

    // 2. Sync Technicians
    if (Array.isArray(sheetData.technicians)) {
      db.technicians = sheetData.technicians.map(t => {
        const existing = (db.technicians || []).find(tech => tech.name.toLowerCase() === t.name.toLowerCase());
        return {
          id: existing?.id || 'tech-' + uuidv4().slice(0, 8),
          name: t.name,
          phone: t.phone || '',
          designation: t.designation || 'Technician',
          experience: t.experience || '1 Year',
          status: t.status || 'Available'
        };
      });
      modified = true;
    }

    // 3. Sync Clients
    if (Array.isArray(sheetData.clients)) {
      db.clients = sheetData.clients.map(c => {
        const existing = (db.clients || []).find(cli => cli.clientName.toLowerCase() === c.clientName.toLowerCase());
        return {
          id: existing?.id || 'cli-' + uuidv4().slice(0, 8),
          clientName: c.clientName,
          siteAddress: c.siteAddress,
          contactPerson: c.contactPerson || '',
          forklifts: Array.isArray(c.forklifts) ? c.forklifts : (c.forklifts ? c.forklifts.split(',').map(s => s.trim()) : [])
        };
      });
      modified = true;
    }

    // 4. Sync Dispatches (Handles row deletions in Google Sheets)
    if (Array.isArray(sheetData.dispatches)) {
      db.dispatches = sheetData.dispatches.map(d => {
        const existing = (db.dispatches || []).find(disp => disp.dispatchCode === d.dispatchCode);
        return {
          id: existing?.id || 'dsp-' + uuidv4().slice(0, 8),
          dispatchCode: d.dispatchCode,
          clientName: d.clientName || 'Client Site',
          siteAddress: d.siteAddress || '',
          contactPerson: existing?.contactPerson || '',
          forkliftModel: d.forkliftModel || 'Standard Forklift',
          forkliftSerialNo: existing?.forkliftSerialNo || '',
          issueDescription: d.workSummary || existing?.issueDescription || 'Service Visit',
          dispatchDate: d.dispatchDate || existing?.dispatchDate || new Date().toISOString().split('T')[0],
          dispatchTime: d.dispatchTime || existing?.dispatchTime || '10:00 AM',
          leadTechnician: d.leadTechnician || 'Technician',
          teamMembers: existing?.teamMembers || [],
          status: d.status || existing?.status || 'COMPLETED',
          itemsIssued: existing?.itemsIssued || [],
          notes: existing?.notes || '',
          returnDate: d.returnDate || existing?.returnDate || null,
          returnTime: existing?.returnTime || null,
          workSummary: d.workSummary || existing?.workSummary || '',
          verifiedBy: existing?.verifiedBy || d.leadTechnician || '',
          customerSignOff: existing?.customerSignOff || false,
          customerRemarks: existing?.customerRemarks || '',
          costBreakdown: {
            partsCost: d.partsCost || existing?.costBreakdown?.partsCost || '',
            travellingCost: d.travellingCost || existing?.costBreakdown?.travellingCost || '',
            otherCost: d.otherCost || existing?.costBreakdown?.otherCost || '',
            totalCost: d.totalTripCost || existing?.costBreakdown?.totalCost || ''
          },
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
      modified = true;
    }

    if (modified) {
      saveDatabase(db);
    }
  } catch (err) {
    console.warn('[Auto-Sync Warning]:', err.message);
  }
}

// Trigger background sheet sync every 10 seconds
setInterval(autoSyncFromSheets, 10000);
setTimeout(autoSyncFromSheets, 2000);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'VE INVENTORY - Spares & Site Dispatch Operations API',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` VE INVENTORY API running on port ${PORT}`);
  console.log(` http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

module.exports = app;
