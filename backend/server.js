const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDatabase, saveDatabase, uuidv4 } = require('./database');
const { fetchAllDataFromGoogleSheets } = require('./googleSheets');
const { parseItemsIssued, normalizeStatus } = require('./utils/itemsParser');

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

// Public Auth Routes (Register, Login Sync, Status Check)
app.use('/api/auth', authRouter);

// Protected Operational Routes (Require APPROVED status or Super Admin)
app.use('/api/inventory', requireApprovedUser, require('./routes/inventory'));
app.use('/api/dispatches', requireApprovedUser, require('./routes/dispatches'));
app.use('/api/technicians', requireApprovedUser, require('./routes/technicians'));
app.use('/api/clients', requireApprovedUser, require('./routes/clients'));
app.use('/api/reports', requireApprovedUser, require('./routes/reports'));

function parsePartsFromSheetText(partsText) {
  if (!partsText || partsText.includes('No parts issued')) return [];
  const items = [];
  const blocks = String(partsText).split('\n\n').map(b => b.trim()).filter(Boolean);
  blocks.forEach(block => {
    const lines = block.split('\n');
    const headerLine = lines[0] || '';
    let partName = headerLine.replace(/^\d+\.\s*/, '').trim();
    let partNumber = 'N/A';
    const match = headerLine.match(/(?:\d+\.\s*)?(.+?)\s*(?:\(([^)]+)\))?$/);
    if (match) {
      partName = (match[1] || partName).replace(/^\d+\.\s*/, '').trim();
      if (match[2]) partNumber = match[2].trim();
    }
    let qtyIssued = 1;
    let unit = 'Nos';
    const statusLine = lines[1] || lines[0] || '';
    const qtyMatch = statusLine.match(/Issued:\s*(\d+)\s*(\w+)?/i);
    if (qtyMatch) {
      qtyIssued = parseInt(qtyMatch[1]) || 1;
      if (qtyMatch[2]) unit = qtyMatch[2].trim();
    }
    items.push({
      partId: 'part-' + (partNumber !== 'N/A' ? partNumber : uuidv4().slice(0, 6)),
      partNumber,
      partName,
      name: partName,
      qtyIssued,
      qtyUsed: 0,
      qtyReturned: 0,
      unit,
      unitPrice: 0
    });
  });
  return items;
}

// Background Auto-Sync Worker (Google Sheets ➔ App every 10 seconds)
async function autoSyncFromSheets(force = false) {
  try {
    const sheetData = await fetchAllDataFromGoogleSheets(force);
    if (!sheetData) return;

    const db = getDatabase();
    let modified = false;

    // 1. Sync Inventory
    if (Array.isArray(sheetData.inventory) && sheetData.inventory.length > 0) {
      const currentInv = db.inventory || [];
      const syncedInv = [...currentInv];

      sheetData.inventory.forEach(item => {
        if (!item.partNumber) return;
        const idx = syncedInv.findIndex(i => i.partNumber === item.partNumber);
        const existing = idx !== -1 ? syncedInv[idx] : null;

        const merged = {
          id: existing?.id || 'part-' + uuidv4().slice(0, 8),
          partNumber: item.partNumber,
          name: item.name || existing?.name || 'Spare Part',
          category: item.category || existing?.category || 'General Spare Parts',
          stockQuantity: item.stockQuantity !== undefined ? Number(item.stockQuantity) : (existing?.stockQuantity || 0),
          minAlertQuantity: existing?.minAlertQuantity || 2,
          unit: item.unit || existing?.unit || 'Nos',
          unitPrice: item.unitPrice !== undefined ? Number(item.unitPrice) : (existing?.unitPrice || 0),
          locationRack: item.locationRack || existing?.locationRack || 'Warehouse Rack',
          description: existing?.description || '',
          updatedAt: new Date().toISOString()
        };

        if (idx !== -1) {
          syncedInv[idx] = merged;
        } else {
          syncedInv.push(merged);
        }
      });

      db.inventory = syncedInv;
      modified = true;
    }

    // 2. Sync Technicians
    if (Array.isArray(sheetData.technicians) && sheetData.technicians.length > 0) {
      const currentTechs = db.technicians || [];
      const syncedTechs = [...currentTechs];

      sheetData.technicians.forEach(t => {
        if (!t.name) return;
        const idx = syncedTechs.findIndex(tech => tech.name.toLowerCase() === t.name.toLowerCase());
        const existing = idx !== -1 ? syncedTechs[idx] : null;

        const merged = {
          id: existing?.id || 'tech-' + uuidv4().slice(0, 8),
          name: t.name,
          phone: t.phone || existing?.phone || '',
          designation: t.designation || existing?.designation || 'Technician',
          experience: t.experience || existing?.experience || '1 Year',
          status: t.status || existing?.status || 'Available'
        };

        if (idx !== -1) {
          syncedTechs[idx] = merged;
        } else {
          syncedTechs.push(merged);
        }
      });

      db.technicians = syncedTechs;
      modified = true;
    }

    // 3. Sync Clients
    if (Array.isArray(sheetData.clients) && sheetData.clients.length > 0) {
      const currentClients = db.clients || [];
      const syncedClients = [...currentClients];

      sheetData.clients.forEach(c => {
        if (!c.clientName) return;
        const idx = syncedClients.findIndex(cli => cli.clientName.toLowerCase() === c.clientName.toLowerCase());
        const existing = idx !== -1 ? syncedClients[idx] : null;

        const merged = {
          id: existing?.id || 'cli-' + uuidv4().slice(0, 8),
          clientName: c.clientName,
          siteAddress: c.siteAddress || existing?.siteAddress || '',
          contactPerson: c.contactPerson || existing?.contactPerson || '',
          forklifts: Array.isArray(c.forklifts) ? c.forklifts : (c.forklifts ? c.forklifts.split(',').map(s => s.trim()) : (existing?.forklifts || []))
        };

        if (idx !== -1) {
          syncedClients[idx] = merged;
        } else {
          syncedClients.push(merged);
        }
      });

      db.clients = syncedClients;
      modified = true;
    }

    // 4. Sync Dispatches (Safely MERGE without wiping un-synced items)
    if (Array.isArray(sheetData.dispatches) && sheetData.dispatches.length > 0) {
      const currentDispatches = db.dispatches || [];
      const syncedDispatches = [...currentDispatches];

      sheetData.dispatches.forEach(d => {
        if (!d.dispatchCode) return;
        const existingIndex = syncedDispatches.findIndex(disp => disp.dispatchCode === d.dispatchCode);
        const existing = existingIndex !== -1 ? syncedDispatches[existingIndex] : null;

        const mergedItem = {
          id: existing?.id || 'dsp-' + uuidv4().slice(0, 8),
          dispatchCode: d.dispatchCode,
          clientName: d.clientName || existing?.clientName || 'Client Site',
          siteAddress: d.siteAddress || existing?.siteAddress || '',
          contactPerson: existing?.contactPerson || '',
          forkliftModel: d.forkliftModel || existing?.forkliftModel || 'Standard Forklift',
          forkliftSerialNo: existing?.forkliftSerialNo || '',
          issueDescription: d.workSummary || existing?.issueDescription || 'Service Visit',
          dispatchDate: d.dispatchDate || existing?.dispatchDate || new Date().toISOString().split('T')[0],
          dispatchTime: d.dispatchTime || existing?.dispatchTime || '10:00 AM',
          leadTechnician: d.leadTechnician || existing?.leadTechnician || 'Technician',
          teamMembers: existing?.teamMembers || [],
          status: normalizeStatus(d.status || existing?.status || 'COMPLETED'),
          itemsIssued: (() => {
            const parsed = parseItemsIssued(d.itemsIssuedRaw || d.itemsIssued || existing?.itemsIssued);
            if (parsed.length > 0) return parsed;
            return parseItemsIssued(existing?.itemsIssued);
          })(),
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

        if (existingIndex !== -1) {
          syncedDispatches[existingIndex] = mergedItem;
        } else {
          syncedDispatches.push(mergedItem);
        }
      });

      db.dispatches = syncedDispatches;
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
