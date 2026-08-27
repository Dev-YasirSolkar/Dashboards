const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase, uuidv4 } = require('../database');
const { syncClientsToGoogleSheets } = require('../googleSheets');

// GET all clients
router.get('/', (req, res) => {
  const db = getDatabase();
  res.json({ success: true, data: db.clients || [] });
});

// POST new client (Instant Google Sheet Sync)
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { clientName, siteAddress, contactPerson, forklifts } = req.body;

    if (!clientName || !siteAddress) {
      return res.status(400).json({ success: false, message: 'Client Name and Site Address are required.' });
    }

    const newClient = {
      id: 'cli-' + uuidv4().slice(0, 8),
      clientName: clientName.trim(),
      siteAddress: siteAddress.trim(),
      contactPerson: contactPerson || '',
      forklifts: Array.isArray(forklifts) ? forklifts : (forklifts ? [forklifts] : [])
    };

    db.clients = db.clients || [];
    db.clients.push(newClient);
    saveDatabase(db);

    // Instant sync to Google Sheet
    await syncClientsToGoogleSheets(db.clients);

    res.status(201).json({ success: true, data: newClient, message: 'Client added & synced to Google Sheet!' });
  } catch (err) {
    console.error('Error adding client:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update client (Instant Google Sheet Sync)
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const index = (db.clients || []).findIndex(c => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    const { clientName, siteAddress, contactPerson, forklifts } = req.body;
    db.clients[index] = {
      ...db.clients[index],
      clientName: clientName !== undefined ? clientName.trim() : db.clients[index].clientName,
      siteAddress: siteAddress !== undefined ? siteAddress.trim() : db.clients[index].siteAddress,
      contactPerson: contactPerson !== undefined ? contactPerson : db.clients[index].contactPerson,
      forklifts: Array.isArray(forklifts) ? forklifts : (forklifts ? forklifts.split(',').map(s => s.trim()) : db.clients[index].forklifts)
    };

    saveDatabase(db);

    // Instant sync to Google Sheet
    await syncClientsToGoogleSheets(db.clients);

    res.json({ success: true, data: db.clients[index], message: 'Client updated & synced to Google Sheet!' });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE client (Instant Google Sheet Sync)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    db.clients = (db.clients || []).filter(c => c.id !== req.params.id);
    saveDatabase(db);

    // Instant sync to Google Sheet
    await syncClientsToGoogleSheets(db.clients);

    res.json({ success: true, message: 'Client deleted from App & Google Sheet.' });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
