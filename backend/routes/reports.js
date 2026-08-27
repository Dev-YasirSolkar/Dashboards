const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase, uuidv4 } = require('../database');
const { fetchAllDataFromGoogleSheets } = require('../googleSheets');

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

// GET Dashboard Metrics & Statistics
router.get('/dashboard', (req, res) => {
  const db = getDatabase();

  const inventory = db.inventory || [];
  const dispatches = db.dispatches || [];
  const technicians = db.technicians || [];

  const totalStockItems = inventory.length;
  const lowStockCount = inventory.filter(i => i.stockQuantity <= i.minAlertQuantity).length;
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
        if (!partUsageMap[item.partId]) {
          partUsageMap[item.partId] = {
            partId: item.partId,
            partNumber: item.partNumber,
            partName: item.partName,
            totalUsed: 0,
            unit: item.unit
          };
        }
        partUsageMap[item.partId].totalUsed += item.qtyUsed;
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
      designation: tech.designation,
      status: tech.status,
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
      lowStockAlerts: inventory.filter(i => i.stockQuantity <= i.minAlertQuantity).slice(0, 6),
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
router.get('/ledger', (req, res) => {
  const db = getDatabase();
  let ledger = [...(db.inventoryTransactions || [])];

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
      l.partName.toLowerCase().includes(s) ||
      l.partNumber.toLowerCase().includes(s) ||
      l.referenceId.toLowerCase().includes(s) ||
      (l.notes && l.notes.toLowerCase().includes(s))
    );
  }

  ledger.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, data: ledger });
});

module.exports = router;
