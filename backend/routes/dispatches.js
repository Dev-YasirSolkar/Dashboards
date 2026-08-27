const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase, uuidv4 } = require('../database');
const { syncDispatchToGoogleSheets, syncInventoryToGoogleSheets } = require('../googleSheets');

// Helper to generate readable Dispatch Number e.g. DSP-2026-001
function generateDispatchCode(db) {
  const year = new Date().getFullYear();
  const count = (db.dispatches || []).length + 1;
  return `DSP-${year}-${String(count).padStart(4, '0')}`;
}

// GET all dispatches with filtering
router.get('/', (req, res) => {
  const db = getDatabase();
  const { status, employee, client, startDate, endDate, search } = req.query;

  let list = db.dispatches || [];

  if (status && status !== 'ALL') {
    list = list.filter(d => d.status === status);
  }

  if (employee && employee !== 'ALL') {
    list = list.filter(d => 
      d.leadTechnician === employee || 
      (d.teamMembers && d.teamMembers.includes(employee))
    );
  }

  if (client && client !== 'ALL') {
    list = list.filter(d => d.clientName.toLowerCase().includes(client.toLowerCase()));
  }

  if (startDate) {
    list = list.filter(d => d.dispatchDate >= startDate);
  }

  if (endDate) {
    list = list.filter(d => d.dispatchDate <= endDate);
  }

  if (search) {
    const s = search.toLowerCase();
    list = list.filter(d => 
      d.dispatchCode.toLowerCase().includes(s) ||
      d.clientName.toLowerCase().includes(s) ||
      d.siteAddress.toLowerCase().includes(s) ||
      d.forkliftModel.toLowerCase().includes(s) ||
      d.leadTechnician.toLowerCase().includes(s) ||
      (d.itemsIssued && d.itemsIssued.some(item => item.partName.toLowerCase().includes(s) || item.partNumber.toLowerCase().includes(s)))
    );
  }

  // Sort latest first
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Compute summary stats
  const total = (db.dispatches || []).length;
  const activeCount = (db.dispatches || []).filter(d => d.status === 'DISPATCHED').length;
  const completedCount = (db.dispatches || []).filter(d => d.status === 'COMPLETED').length;

  res.json({
    success: true,
    data: list,
    stats: {
      total,
      activeCount,
      completedCount
    }
  });
});

// GET single dispatch by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const dispatch = (db.dispatches || []).find(d => d.id === req.params.id || d.dispatchCode === req.params.id);

  if (!dispatch) {
    return res.status(404).json({ success: false, message: 'Dispatch record not found' });
  }

  res.json({ success: true, data: dispatch });
});

// POST Create New Site Dispatch / Outward Challan
router.post('/', async (req, res) => {
  const db = getDatabase();
  const {
    clientName,
    siteAddress,
    contactPerson,
    forkliftModel,
    forkliftSerialNo,
    issueDescription,
    dispatchDate,
    dispatchTime,
    leadTechnician,
    teamMembers,
    itemsIssued,
    notes
  } = req.body;

  // Validation
  if (!clientName || !siteAddress || !leadTechnician || !dispatchDate) {
    return res.status(400).json({ 
      success: false, 
      message: 'Client Name, Site Address, Lead Technician, and Dispatch Date are required.' 
    });
  }

  if (!itemsIssued || !Array.isArray(itemsIssued) || itemsIssued.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least 1 spare part or item to dispatch for the site visit.'
    });
  }

  // Verify stock availability for each item
  const validatedItems = [];
  for (const item of itemsIssued) {
    const qty = Number(item.qtyIssued);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid quantity for item "${item.partName || item.partNumber}". Quantity must be greater than 0.`
      });
    }

    const inventoryItem = db.inventory.find(i => 
      (item.partId && i.id === item.partId) || 
      (item.partNumber && i.partNumber === item.partNumber) || 
      (i.name && i.name === (item.partName || item.name))
    );
    if (!inventoryItem) {
      // If still not found, create a fallback item representation
      validatedItems.push({
        partId: item.partId || 'part-' + uuidv4().slice(0, 8),
        partNumber: item.partNumber || 'N/A',
        partName: item.partName || item.name || 'Spare Part',
        category: item.category || 'General Spare Parts',
        unit: item.unit || 'Nos',
        unitPrice: Number(item.unitPrice) || 0,
        qtyIssued: qty,
        qtyUsed: 0,
        qtyReturned: 0,
        qtyDamaged: 0,
        itemStatus: 'ISSUED',
        installationNotes: ''
      });
      continue;
    }

    if (inventoryItem.stockQuantity < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for "${inventoryItem.name}" (${inventoryItem.partNumber}). Available: ${inventoryItem.stockQuantity}, Requested: ${qty}`
      });
    }

    validatedItems.push({
      partId: inventoryItem.id,
      partNumber: inventoryItem.partNumber,
      partName: inventoryItem.name,
      category: inventoryItem.category,
      unit: inventoryItem.unit,
      unitPrice: inventoryItem.unitPrice,
      qtyIssued: qty,
      qtyUsed: 0,
      qtyReturned: 0,
      qtyDamaged: 0,
      itemStatus: 'ISSUED',
      installationNotes: ''
    });
  }

  const isScheduled = req.body.isScheduled === true || req.body.status === 'SCHEDULED';
  const initialStatus = isScheduled ? 'SCHEDULED' : 'DISPATCHED';

  const dispatchCode = generateDispatchCode(db);
  const newDispatch = {
    id: 'dsp-' + uuidv4().slice(0, 8),
    dispatchCode,
    clientName: clientName.trim(),
    siteAddress: siteAddress.trim(),
    contactPerson: contactPerson || '',
    forkliftModel: forkliftModel || 'Standard Forklift',
    forkliftSerialNo: forkliftSerialNo || '',
    issueDescription: issueDescription || 'Site Maintenance / Breakdown Visit',
    assignedTasks: Array.isArray(req.body.assignedTasks) && req.body.assignedTasks.length > 0 
      ? req.body.assignedTasks 
      : (issueDescription ? issueDescription.split(/ • |\n/).map(s => s.trim()).filter(Boolean) : []),
    dispatchDate,
    dispatchTime: dispatchTime || '10:00 AM',
    leadTechnician,
    teamMembers: Array.isArray(teamMembers) ? teamMembers : (teamMembers ? [teamMembers] : []),
    status: initialStatus,
    itemsIssued: validatedItems,
    notes: notes || '',
    returnDate: null,
    returnTime: null,
    workSummary: '',
    verifiedBy: '',
    customerSignOff: false,
    customerRemarks: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Deduct stock from inventory and log audit transactions
  for (const item of validatedItems) {
    const invIndex = db.inventory.findIndex(i => i.id === item.partId);
    if (invIndex !== -1) {
      db.inventory[invIndex].stockQuantity -= item.qtyIssued;
      db.inventory[invIndex].updatedAt = new Date().toISOString();

      db.inventoryTransactions.push({
        id: 'tx-' + uuidv4().slice(0, 8),
        timestamp: new Date().toISOString(),
        type: isScheduled ? 'RESERVATION_OUT' : 'DISPATCH_OUT',
        partId: item.partId,
        partNumber: item.partNumber,
        partName: item.partName,
        quantityChanged: -item.qtyIssued,
        balanceAfter: db.inventory[invIndex].stockQuantity,
        referenceId: dispatchCode,
        employeeName: leadTechnician,
        notes: isScheduled 
          ? `Reserved/Scheduled for ${clientName} on ${dispatchDate}` 
          : `Dispatched to ${clientName} for ${forkliftModel}`
      });
    }
  }

  // If immediate dispatch, update technician status to 'On Site'
  if (!isScheduled) {
    const allStaff = [leadTechnician, ...(newDispatch.teamMembers || [])];
    db.technicians.forEach(tech => {
      if (allStaff.includes(tech.name)) {
        tech.status = 'On Site';
      }
    });
  }

  db.dispatches.push(newDispatch);
  saveDatabase(db);

  // Sync to Google Sheets immediately
  await syncDispatchToGoogleSheets(newDispatch);
  await syncInventoryToGoogleSheets(db.inventory);

  res.status(201).json({
    success: true,
    data: newDispatch,
    message: isScheduled 
      ? `📅 Site Visit ${dispatchCode} Scheduled for ${dispatchDate}!`
      : `🚀 Site Dispatch ${dispatchCode} created & synced to Google Sheet!`
  });
});

// POST Start Trip for a Scheduled Dispatch
router.post('/:id/start-trip', async (req, res) => {
  try {
    const db = getDatabase();
    const dispatchIndex = db.dispatches.findIndex(d => d.id === req.params.id || d.dispatchCode === req.params.id);

    if (dispatchIndex === -1) {
      return res.status(404).json({ success: false, message: 'Dispatch record not found' });
    }

    const dispatch = db.dispatches[dispatchIndex];
    dispatch.status = 'DISPATCHED';
    dispatch.dispatchDate = new Date().toISOString().split('T')[0];
    dispatch.dispatchTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dispatch.updatedAt = new Date().toISOString();

    // Mark staff on site
    const allStaff = [dispatch.leadTechnician, ...(dispatch.teamMembers || [])];
    db.technicians.forEach(tech => {
      if (allStaff.includes(tech.name)) {
        tech.status = 'On Site';
      }
    });

    db.dispatches[dispatchIndex] = dispatch;
    saveDatabase(db);

    // Sync to Google Sheet
    await syncDispatchToGoogleSheets(dispatch);

    res.json({
      success: true,
      data: dispatch,
      message: `🚀 Trip ${dispatch.dispatchCode} marked as DISPATCHED / On-Site!`
    });
  } catch (err) {
    console.error('Error starting scheduled trip:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Reconcile / Complete Site Return (Record what was USED and what was RETURNED)
router.post('/:id/reconcile', async (req, res) => {
  const db = getDatabase();
  const dispatchIndex = db.dispatches.findIndex(d => d.id === req.params.id || d.dispatchCode === req.params.id);

  if (dispatchIndex === -1) {
    return res.status(404).json({ success: false, message: 'Dispatch record not found' });
  }

  const dispatch = db.dispatches[dispatchIndex];
  const {
    itemsReconciliation,
    returnDate,
    returnTime,
    workSummary,
    completionReport,
    costBreakdown,
    customerRemarks,
    verifiedBy,
    customerSignOff
  } = req.body;

  if (!itemsReconciliation || !Array.isArray(itemsReconciliation)) {
    return res.status(400).json({
      success: false,
      message: 'Items reconciliation data is required.'
    });
  }

  // Validate items reconciliation count and quantities
  const updatedItems = [];
  const stockToRestock = [];

  for (const origItem of dispatch.itemsIssued) {
    const reconItem = itemsReconciliation.find(r => r.partId === origItem.partId) || {};
    const qtyUsed = Number(reconItem.qtyUsed) || 0;
    const qtyReturned = Number(reconItem.qtyReturned) || 0;
    const qtyDamaged = Number(reconItem.qtyDamaged) || 0;

    const totalAccounted = qtyUsed + qtyReturned + qtyDamaged;
    if (totalAccounted !== origItem.qtyIssued) {
      return res.status(400).json({
        success: false,
        message: `Quantity mismatch for "${origItem.partName}". Total Issued: ${origItem.qtyIssued}, but accounted: ${totalAccounted}.`
      });
    }

    let itemStatus = 'USED';
    if (qtyReturned === origItem.qtyIssued) {
      itemStatus = 'RETURNED_UNUSED';
    } else if (qtyReturned > 0 && qtyUsed > 0) {
      itemStatus = 'PARTIALLY_USED_RETURNED';
    } else if (qtyDamaged > 0) {
      itemStatus = 'DAMAGED_REPLACED';
    }

    updatedItems.push({
      ...origItem,
      qtyUsed,
      qtyReturned,
      qtyDamaged,
      itemStatus,
      installationNotes: reconItem.installationNotes || origItem.installationNotes || ''
    });

    if (qtyReturned > 0) {
      stockToRestock.push({
        partId: origItem.partId,
        partNumber: origItem.partNumber,
        partName: origItem.partName,
        qtyToReturn: qtyReturned
      });
    }
  }

  // Restock unused items back into warehouse
  for (const item of stockToRestock) {
    const invIndex = db.inventory.findIndex(i => i.id === item.partId);
    if (invIndex !== -1) {
      db.inventory[invIndex].stockQuantity += item.qtyToReturn;
      db.inventory[invIndex].updatedAt = new Date().toISOString();

      db.inventoryTransactions.push({
        id: 'tx-' + uuidv4().slice(0, 8),
        timestamp: new Date().toISOString(),
        type: 'RETURN_RESTOCK',
        partId: item.partId,
        partNumber: item.partNumber,
        partName: item.partName,
        quantityChanged: item.qtyToReturn,
        balanceAfter: db.inventory[invIndex].stockQuantity,
        referenceId: dispatch.dispatchCode,
        employeeName: dispatch.leadTechnician,
        notes: `Returned unused from site visit ${dispatch.dispatchCode} (${dispatch.clientName})`
      });
    }
  }

  // Update dispatch status
  dispatch.status = 'COMPLETED';
  dispatch.itemsIssued = updatedItems;
  dispatch.returnDate = returnDate || new Date().toISOString().split('T')[0];
  dispatch.returnTime = returnTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  dispatch.workSummary = workSummary || 'Work completed successfully on-site.';
  dispatch.completionReport = completionReport || null;
  dispatch.costBreakdown = costBreakdown || null;
  dispatch.customerRemarks = customerRemarks || '';
  dispatch.verifiedBy = verifiedBy || dispatch.leadTechnician;
  dispatch.customerSignOff = !!customerSignOff;
  dispatch.updatedAt = new Date().toISOString();

  // Reset technicians status back to Available
  const allStaff = [dispatch.leadTechnician, ...(dispatch.teamMembers || [])];
  allStaff.forEach(staffName => {
    const otherActive = db.dispatches.some(d => 
      d.id !== dispatch.id && 
      d.status === 'DISPATCHED' && 
      (d.leadTechnician === staffName || (d.teamMembers && d.teamMembers.includes(staffName)))
    );
    if (!otherActive) {
      const tech = db.technicians.find(t => t.name === staffName);
      if (tech) tech.status = 'Available';
    }
  });

  db.dispatches[dispatchIndex] = dispatch;
  saveDatabase(db);

  // Sync to Google Sheets immediately
  await syncDispatchToGoogleSheets(dispatch);
  await syncInventoryToGoogleSheets(db.inventory);

  res.json({
    success: true,
    data: dispatch,
    message: `Site Dispatch ${dispatch.dispatchCode} closed & synced to Google Sheet! Unused parts restocked.`
  });
});

// DELETE dispatch (Instant Google Sheet Sync)
router.delete('/:id', async (req, res) => {
  const db = getDatabase();
  const dispatchIndex = db.dispatches.findIndex(d => d.id === req.params.id || d.dispatchCode === req.params.id);

  if (dispatchIndex === -1) {
    return res.status(404).json({ success: false, message: 'Dispatch record not found' });
  }

  const dispatch = db.dispatches[dispatchIndex];

  if (dispatch.status === 'DISPATCHED') {
    for (const item of dispatch.itemsIssued) {
      const invIndex = db.inventory.findIndex(i => i.id === item.partId);
      if (invIndex !== -1) {
        db.inventory[invIndex].stockQuantity += item.qtyIssued;
        db.inventory[invIndex].updatedAt = new Date().toISOString();

        db.inventoryTransactions.push({
          id: 'tx-' + uuidv4().slice(0, 8),
          timestamp: new Date().toISOString(),
          type: 'DISPATCH_CANCELLED',
          partId: item.partId,
          partNumber: item.partNumber,
          partName: item.partName,
          quantityChanged: item.qtyIssued,
          balanceAfter: db.inventory[invIndex].stockQuantity,
          referenceId: dispatch.dispatchCode,
          notes: `Cancelled dispatch ${dispatch.dispatchCode} - Stock rolled back`
        });
      }
    }
  }

  db.dispatches.splice(dispatchIndex, 1);
  saveDatabase(db);

  // Sync delete to Google Sheet immediately
  const { deleteDispatchFromGoogleSheets } = require('../googleSheets');
  await deleteDispatchFromGoogleSheets(dispatch.dispatchCode);
  await syncInventoryToGoogleSheets(db.inventory);

  res.json({ success: true, message: `Dispatch ${dispatch.dispatchCode} deleted and removed from Google Sheet.` });
});

module.exports = router;
