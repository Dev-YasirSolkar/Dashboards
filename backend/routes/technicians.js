const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase, uuidv4 } = require('../database');
const { syncTechniciansToGoogleSheets } = require('../googleSheets');

// GET all technicians with dynamic live status calculation
router.get('/', (req, res) => {
  const db = getDatabase();
  const activeDispatches = (db.dispatches || []).filter(d => d.status === 'DISPATCHED');
  const scheduledDispatches = (db.dispatches || []).filter(d => d.status === 'SCHEDULED');

  const enrichedTechnicians = (db.technicians || []).map(tech => {
    const currentTrip = activeDispatches.find(d => 
      d.leadTechnician === tech.name || (d.teamMembers && d.teamMembers.includes(tech.name))
    );
    const scheduledTrips = scheduledDispatches.filter(d => 
      d.leadTechnician === tech.name || (d.teamMembers && d.teamMembers.includes(tech.name))
    );

    const liveStatus = currentTrip ? 'On Site' : (tech.status === 'On Leave' ? 'On Leave' : 'Available');

    return {
      ...tech,
      status: liveStatus,
      currentTrip: currentTrip ? {
        dispatchCode: currentTrip.dispatchCode,
        clientName: currentTrip.clientName,
        dispatchDate: currentTrip.dispatchDate,
        dispatchTime: currentTrip.dispatchTime
      } : null,
      scheduledCount: scheduledTrips.length
    };
  });

  res.json({ success: true, data: enrichedTechnicians });
});

// POST new technician (Instant Google Sheet Sync)
router.post('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { name, phone, designation, experience } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Technician name is required.' });
    }

    const newTech = {
      id: 'tech-' + uuidv4().slice(0, 8),
      name: name.trim(),
      phone: phone || '',
      designation: designation || 'Service Technician',
      experience: experience || '1 Year',
      status: 'Available'
    };

    db.technicians = db.technicians || [];
    db.technicians.push(newTech);
    saveDatabase(db);

    // Instant sync to Google Sheet
    await syncTechniciansToGoogleSheets(db.technicians);

    res.status(201).json({ success: true, data: newTech, message: 'Technician added & synced to Google Sheet!' });
  } catch (err) {
    console.error('Error adding tech:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update technician (Instant Google Sheet Sync)
router.put('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const index = (db.technicians || []).findIndex(t => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Technician not found.' });
    }

    const { name, phone, designation, experience, status } = req.body;
    db.technicians[index] = {
      ...db.technicians[index],
      name: name !== undefined ? name.trim() : db.technicians[index].name,
      phone: phone !== undefined ? phone.trim() : db.technicians[index].phone,
      designation: designation !== undefined ? designation.trim() : db.technicians[index].designation,
      experience: experience !== undefined ? experience.trim() : db.technicians[index].experience,
      status: status || db.technicians[index].status
    };

    saveDatabase(db);

    // Instant sync to Google Sheet
    await syncTechniciansToGoogleSheets(db.technicians);

    res.json({ success: true, data: db.technicians[index], message: 'Technician updated & synced to Google Sheet!' });
  } catch (err) {
    console.error('Error updating tech:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE technician (Instant Google Sheet Sync)
router.delete('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const index = (db.technicians || []).findIndex(t => t.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Technician not found.' });
    }

    const deleted = db.technicians.splice(index, 1)[0];
    saveDatabase(db);

    // Instant sync to Google Sheet
    await syncTechniciansToGoogleSheets(db.technicians);

    res.json({ success: true, data: deleted, message: 'Technician deleted & synced to Google Sheet!' });
  } catch (err) {
    console.error('Error deleting tech:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
