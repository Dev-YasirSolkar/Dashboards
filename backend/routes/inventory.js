const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase, uuidv4 } = require('../database');
const { syncInventoryToGoogleSheets } = require('../googleSheets');

// GET all inventory items
router.get('/', (req, res) => {
  const db = getDatabase();
  const search = (req.query.search || '').toLowerCase();
  const category = req.query.category || '';

  let items = db.inventory || [];

  if (category && category !== 'ALL') {
    items = items.filter(item => item.category === category);
  }

  if (search) {
    items = items.filter(item => 
      (item.name && item.name.toLowerCase().includes(search)) ||
      (item.partNumber && item.partNumber.toLowerCase().includes(search)) ||
      (item.locationRack && item.locationRack.toLowerCase().includes(search)) ||
      (item.description && item.description.toLowerCase().includes(search))
    );
  }

  // Calculate stats
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.stockQuantity <= item.minAlertQuantity).length;
  const outOfStockItems = items.filter(item => item.stockQuantity === 0).length;
  const totalValue = items.reduce((acc, curr) => acc + (curr.stockQuantity * (curr.unitPrice || 0)), 0);

  res.json({
    success: true,
    data: items,
    stats: {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue
    }
  });
});

// POST Bulk Import parts
router.post('/bulk-import', async (req, res) => {
  try {
    const db = getDatabase();
    const { parts } = req.body;

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ success: false, message: 'No parts array provided for import.' });
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const p of parts) {
      const partNumber = (p.partNumber || p['Part Number'] || p['Part Code'] || p['part_number'] || '').toString().trim();
      const name = (p.name || p['Part Name'] || p['Name'] || p['part_name'] || '').toString().trim();

      if (!partNumber || !name) continue;

      const category = p.category || p['Category'] || 'General Spare Parts';
      const stockQuantity = Number(p.stockQuantity ?? p['Current Stock'] ?? p['Stock'] ?? p['Quantity'] ?? 0);
      const minAlertQuantity = Number(p.minAlertQuantity ?? p['Min Stock Alert'] ?? p['Min Alert'] ?? 2);
      const unit = p.unit || p['Unit'] || 'Nos';
      const unitPrice = Number(p.unitPrice ?? p['Unit Price'] ?? p['Price'] ?? 0);
      const locationRack = p.locationRack || p['Location / Rack'] || p['Rack'] || 'Warehouse Rack';
      const description = p.description || p['Description'] || p['Compatibility'] || '';

      const existingIndex = db.inventory.findIndex(i => i.partNumber.toLowerCase() === partNumber.toLowerCase());

      if (existingIndex !== -1) {
        db.inventory[existingIndex] = {
          ...db.inventory[existingIndex],
          name,
          category,
          stockQuantity,
          minAlertQuantity,
          unit,
          unitPrice,
          locationRack,
          description,
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        const newItem = {
          id: 'part-' + uuidv4().slice(0, 8),
          partNumber,
          name,
          category,
          stockQuantity,
          minAlertQuantity,
          unit,
          unitPrice,
          locationRack,
          description,
          createdAt: new Date().toISOString()
        };
        db.inventory.push(newItem);
        addedCount++;
      }
    }

    saveDatabase(db);
    await syncInventoryToGoogleSheets(db.inventory);

    res.json({
      success: true,
      message: `Imported successfully: ${addedCount} parts added, ${updatedCount} updated.`,
      stats: { addedCount, updatedCount }
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create single inventory item
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { partNumber, name, category, stockQuantity, minAlertQuantity, unit, unitPrice, locationRack, description } = req.body;

    if (!partNumber || !name) {
      return res.status(400).json({ success: false, message: 'Part Number and Part Name are required.' });
    }

    const existing = db.inventory.find(i => i.partNumber.toLowerCase() === partNumber.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ success: false, message: `Part with code "${partNumber}" already exists.` });
    }

    const newItem = {
      id: 'part-' + uuidv4().slice(0, 8),
      partNumber: partNumber.trim(),
      name: name.trim(),
      category: category || 'General Spare Parts',
      stockQuantity: Number(stockQuantity) || 0,
      minAlertQuantity: Number(minAlertQuantity) || 2,
      unit: unit || 'Nos',
      unitPrice: Number(unitPrice) || 0,
      locationRack: locationRack || 'Warehouse Rack',
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.inventory.push(newItem);

    if (newItem.stockQuantity > 0) {
      db.inventoryTransactions.push({
        id: 'tx-' + uuidv4().slice(0, 8),
        timestamp: new Date().toISOString(),
        type: 'INITIAL_STOCK',
        partId: newItem.id,
        partNumber: newItem.partNumber,
        partName: newItem.name,
        quantityChanged: newItem.stockQuantity,
        balanceAfter: newItem.stockQuantity,
        referenceId: 'MANUAL_ADD',
        notes: 'Initial stock added when creating part master'
      });
    }

    saveDatabase(db);
    await syncInventoryToGoogleSheets(db.inventory);

    res.status(201).json({ success: true, data: newItem, message: 'Part added & synced to Google Sheet!' });
  } catch (err) {
    console.error('Error creating part:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update inventory item
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const index = db.inventory.findIndex(i => i.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Part not found.' });
    }

    const oldItem = db.inventory[index];
    const { partNumber, name, category, stockQuantity, minAlertQuantity, unit, unitPrice, locationRack, description, adjustmentReason } = req.body;

    const newStock = Number(stockQuantity);
    const stockDiff = newStock - oldItem.stockQuantity;

    db.inventory[index] = {
      ...oldItem,
      partNumber: partNumber ? partNumber.trim() : oldItem.partNumber,
      name: name ? name.trim() : oldItem.name,
      category: category || oldItem.category,
      stockQuantity: !isNaN(newStock) ? newStock : oldItem.stockQuantity,
      minAlertQuantity: !isNaN(Number(minAlertQuantity)) ? Number(minAlertQuantity) : oldItem.minAlertQuantity,
      unit: unit || oldItem.unit,
      unitPrice: !isNaN(Number(unitPrice)) ? Number(unitPrice) : oldItem.unitPrice,
      locationRack: locationRack !== undefined ? locationRack : oldItem.locationRack,
      description: description !== undefined ? description : oldItem.description,
      updatedAt: new Date().toISOString()
    };

    if (stockDiff !== 0) {
      db.inventoryTransactions.push({
        id: 'tx-' + uuidv4().slice(0, 8),
        timestamp: new Date().toISOString(),
        type: 'MANUAL_ADJUSTMENT',
        partId: oldItem.id,
        partNumber: oldItem.partNumber,
        partName: oldItem.name,
        quantityChanged: stockDiff,
        balanceAfter: db.inventory[index].stockQuantity,
        referenceId: 'ADMIN_EDIT',
        notes: adjustmentReason || 'Stock manual adjustment by admin'
      });
    }

    saveDatabase(db);
    await syncInventoryToGoogleSheets(db.inventory);

    res.json({ success: true, data: db.inventory[index], message: 'Part updated & synced to Google Sheet!' });
  } catch (err) {
    console.error('Error updating part:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE inventory item
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const item = db.inventory.find(i => i.id === req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Part not found.' });
    }

    // Check if item is in an active dispatch
    const inUse = db.dispatches.some(d => 
      d.status === 'DISPATCHED' && d.itemsIssued.some(it => it.partId === req.params.id)
    );

    if (inUse) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete part because it is currently issued in an active site dispatch.' 
      });
    }

    db.inventory = db.inventory.filter(i => i.id !== req.params.id);
    saveDatabase(db);
    await syncInventoryToGoogleSheets(db.inventory);

    res.json({ success: true, message: 'Part deleted & updated in Google Sheet!' });
  } catch (err) {
    console.error('Error deleting part:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
