const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase, pullFromFirestore, uuidv4 } = require('../database');
const { fetchAllDataFromGoogleSheets } = require('../googleSheets');
const { parseItemsIssued, normalizeStatus } = require('../utils/itemsParser');

// GET Dashboard Metrics & Statistics
router.get('/dashboard', async (req, res) => {
  let db = getDatabase();

  // Cold start fallback: pull from Firestore if memory cache is empty
  if (!db.dispatches || db.dispatches.length === 0 || !db.inventory || db.inventory.length === 0) {
    await pullFromFirestore();
    db = getDatabase();
  }

  const inventory = db.inventory || [];
  const rawDispatches = db.dispatches || [];
  const technicians = db.technicians || [];

  const dispatches = rawDispatches.map(d => ({
    ...d,
    status: normalizeStatus(d.status),
    itemsIssued: parseItemsIssued(d.itemsIssued)
  }));

  const totalStockItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.stockQuantity <= (i.minAlertQuantity !== undefined ? i.minAlertQuantity : 2)).length;
  const outOfStockCount = inventory.filter(i => i.stockQuantity === 0).length;
  const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.stockQuantity * (item.unitPrice || 0)), 0);

  const activeDispatches = dispatches.filter(d => d.status === 'DISPATCHED');
  const scheduledDispatches = dispatches.filter(d => d.status === 'SCHEDULED');
  const completedDispatches = dispatches.filter(d => d.status === 'COMPLETED');

  // Most used parts calculation
  const partUsageMap = {};
  dispatches.forEach(d => {
    (d.itemsIssued || []).forEach(item => {
      if (item.qtyUsed > 0) {
        const pId = item.partId || item.partNumber || item.partName;
        if (!partUsageMap[pId]) {
          partUsageMap[pId] = {
            partId: pId,
            partNumber: item.partNumber || 'N/A',
            partName: item.partName || item.name || 'Spare Part',
            totalUsed: 0,
            unit: item.unit || 'Nos'
          };
        }
        partUsageMap[pId].totalUsed += Number(item.qtyUsed) || 0;
      }
    });
  });

  const topUsedParts = Object.values(partUsageMap)
    .sort((a, b) => b.totalUsed - a.totalUsed)
    .slice(0, 5);

  // Technician activity
  const techActivity = technicians.map(tech => {
    const visits = dispatches.filter(d => 
      d.leadTechnician === tech.name || (d.teamMembers && d.teamMembers.includes(tech.name))
    );
    const active = visits.filter(d => d.status === 'DISPATCHED').length;
    const completed = visits.filter(d => d.status === 'COMPLETED').length;
    return {
      id: tech.id,
      name: tech.name,
      designation: tech.designation || 'Technician',
      status: tech.status || 'Available',
      totalVisits: visits.length,
      activeVisits: active,
      completedVisits: completed
    };
  });

  res.json({
    success: true,
    data: {
      metrics: {
        totalInventoryItems: totalStockItems,
        lowStockItems: lowStockCount,
        outOfStockItems: outOfStockCount,
        totalInventoryValue,
        activeSiteVisits: activeDispatches.length,
        scheduledVisits: scheduledDispatches.length,
        completedJobs: completedDispatches.length
      },
      activeDispatches: activeDispatches.slice(0, 5),
      lowStockAlerts: inventory.filter(i => i.stockQuantity <= (i.minAlertQuantity !== undefined ? i.minAlertQuantity : 2)).slice(0, 6),
      topUsedParts,
      technicianActivity: techActivity,
      recentTransactions: (db.inventoryTransactions || []).slice(-10).reverse()
    }
  });
});

// POST 2-Way Sync FROM Google Sheets (Google Sheet ➔ App)
router.post('/sync-from-sheets', async (req, res) => {
  try {
    const sheetData = await fetchAllDataFromGoogleSheets(true);
    if (!sheetData) {
      return res.status(200).json({ success: true, message: 'Google Sheets sync skipped (no response).' });
    }

    const db = getDatabase();

    // 1. Sync Inventory from Sheet
    if (sheetData.inventory && Array.isArray(sheetData.inventory)) {
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
    }

    // 2. Sync Technicians from Sheet (handles deletions & edits in sheet)
    if (sheetData.technicians && Array.isArray(sheetData.technicians)) {
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
    }

    // 3. Sync Clients from Sheet (handles deletions & edits in sheet)
    if (sheetData.clients && Array.isArray(sheetData.clients)) {
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
    }

    // 4. Sync Dispatches from Sheet (handles deletions & edits in Google Sheets)
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
          dispatchDate: (() => {
            const raw = d.dispatchDate || existing?.dispatchDate || '';
            const cleaned = String(raw).replace(/Outward:\s*/gi, '').replace(/Returned:\s*/gi, '').replace(/\s*\([\d:\sAPM]+\)/gi, '').split('\n')[0].trim();
            return cleaned || new Date().toISOString().split('T')[0];
          })(),
          dispatchTime: d.dispatchTime || existing?.dispatchTime || '10:00 AM',
          leadTechnician: (() => {
            const rawTechStr = d.leadTechnician || existing?.leadTechnician || 'Technician';
            return String(rawTechStr).split('\n')[0].replace(/\s*\([\s\S]*$/, '').trim() || 'Technician';
          })(),
          teamMembers: (() => {
            if (existing?.teamMembers && existing.teamMembers.length > 0) return existing.teamMembers;
            const rawTechStr = String(d.leadTechnician || '');
            if (rawTechStr.includes('(Helpers:')) {
              const match = rawTechStr.match(/\(Helpers:\s*([^\)]+)\)/i);
              if (match && match[1]) {
                return match[1].split(',').map(s => s.trim()).filter(Boolean);
              }
            }
            return [];
          })(),
          status: d.status || existing?.status || 'COMPLETED',
          itemsIssued: (() => {
            if (existing?.itemsIssued && existing.itemsIssued.length > 0) {
              return existing.itemsIssued;
            }
            if (d.itemsIssuedRaw) {
              return parsePartsFromSheetText(d.itemsIssuedRaw);
            }
            return [];
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
      });
    }

    saveDatabase(db);
    res.json({ 
      success: true, 
      message: 'Google Sheet data synced to App successfully!',
      stats: {
        inventory: db.inventory.length,
        technicians: db.technicians.length,
        clients: db.clients.length,
        dispatches: db.dispatches.length
      }
    });
  } catch (err) {
    console.error('Error syncing from sheets:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET Stock Audit Ledger
router.get('/ledger', async (req, res) => {
  let db = getDatabase();

  if ((!db.inventoryTransactions || db.inventoryTransactions.length === 0) && (!db.dispatches || db.dispatches.length === 0)) {
    await pullFromFirestore();
    db = getDatabase();
  }

  let ledger = [...(db.inventoryTransactions || [])];

  // Derive audit entries from dispatches if inventoryTransactions list is empty or sparse
  const dispatchTxSet = new Set(ledger.map(l => l.referenceId));

  (db.dispatches || []).forEach(d => {
    if (!dispatchTxSet.has(d.dispatchCode)) {
      const items = Array.isArray(d.itemsIssued) ? d.itemsIssued : parseItemsIssued(d.itemsIssued);
      items.forEach((item, idx) => {
        const issued = Number(item.qtyIssued) || 0;
        const used = Number(item.qtyUsed) || 0;
        const returned = Number(item.qtyReturned) || 0;

        if (issued > 0) {
          ledger.push({
            id: `tx-out-${d.id}-${idx}`,
            timestamp: d.createdAt || d.dispatchDate || new Date().toISOString(),
            type: 'DISPATCH_ISSUE',
            partId: item.partId || 'part-' + uuidv4().slice(0, 6),
            partNumber: item.partNumber || 'N/A',
            partName: item.partName || item.name || 'Spare Part',
            quantityChanged: -issued,
            balanceAfter: 'N/A',
            referenceId: d.dispatchCode,
            employeeName: d.leadTechnician || 'Technician',
            notes: `Parts issued for site visit at ${d.clientName}`
          });
        }

        if (used > 0) {
          ledger.push({
            id: `tx-use-${d.id}-${idx}`,
            timestamp: d.returnDate || d.updatedAt || new Date().toISOString(),
            type: 'RECONCILIATION_USE',
            partId: item.partId || 'part-' + uuidv4().slice(0, 6),
            partNumber: item.partNumber || 'N/A',
            partName: item.partName || item.name || 'Spare Part',
            quantityChanged: -used,
            balanceAfter: 'N/A',
            referenceId: d.dispatchCode,
            employeeName: d.leadTechnician || 'Technician',
            notes: `Parts installed/used at ${d.clientName} site`
          });
        }

        if (returned > 0) {
          ledger.push({
            id: `tx-ret-${d.id}-${idx}`,
            timestamp: d.returnDate || d.updatedAt || new Date().toISOString(),
            type: 'RECONCILIATION_RETURN',
            partId: item.partId || 'part-' + uuidv4().slice(0, 6),
            partNumber: item.partNumber || 'N/A',
            partName: item.partName || item.name || 'Spare Part',
            quantityChanged: returned,
            balanceAfter: 'N/A',
            referenceId: d.dispatchCode,
            employeeName: d.leadTechnician || 'Technician',
            notes: `Unused parts returned to godown from ${d.clientName}`
          });
        }
      });
    }
  });

  const { partId, employee, startDate, endDate, search } = req.query;

  if (partId) {
    ledger = ledger.filter(l => l.partId === partId);
  }

  if (employee && employee !== 'ALL') {
    ledger = ledger.filter(l => l.employeeName === employee);
  }

  if (startDate) {
    ledger = ledger.filter(l => new Date(l.timestamp) >= new Date(startDate));
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    ledger = ledger.filter(l => new Date(l.timestamp) <= end);
  }

  if (search) {
    const s = search.toLowerCase();
    ledger = ledger.filter(l => 
      (l.partName || '').toLowerCase().includes(s) ||
      (l.partNumber || '').toLowerCase().includes(s) ||
      (l.referenceId || '').toLowerCase().includes(s) ||
      (l.notes && l.notes.toLowerCase().includes(s))
    );
  }

  ledger.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, data: ledger });
});

module.exports = router;
