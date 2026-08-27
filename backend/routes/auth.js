const express = require('express');
const router = express.Router();
const { getDatabase, saveDatabase } = require('../database');

const MASTER_ADMIN_UIDS = ['juoQofnkViXcZn9Cg1F6haV8Q2j2'];

// Helper to ensure db.users array exists
function ensureUsersArray(db) {
  if (!db.users || !Array.isArray(db.users)) {
    db.users = [];
  }
  return db.users;
}

// 1. Register or Sync User on Login/Signup
router.post('/register-or-sync', (req, res) => {
  const db = getDatabase();
  ensureUsersArray(db);

  const { uid, email, displayName } = req.body;

  if (!uid) {
    return res.status(400).json({ success: false, message: 'UID is required' });
  }

  const isMasterAdmin = MASTER_ADMIN_UIDS.includes(uid);
  let userIndex = db.users.findIndex(u => u.uid === uid);

  if (isMasterAdmin) {
    if (userIndex === -1) {
      const adminRecord = {
        uid,
        email: email || 'admin@vithalenterprises.com',
        displayName: displayName || 'Master Admin',
        role: 'ADMIN',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: 'SYSTEM_SUPER_ADMIN'
      };
      db.users.push(adminRecord);
      saveDatabase(db);
      return res.json({ success: true, user: adminRecord, status: 'APPROVED', role: 'ADMIN' });
    } else {
      // Ensure master admin stays approved
      db.users[userIndex].role = 'ADMIN';
      db.users[userIndex].status = 'APPROVED';
      if (email) db.users[userIndex].email = email;
      if (displayName) db.users[userIndex].displayName = displayName;
      saveDatabase(db);
      return res.json({ success: true, user: db.users[userIndex], status: 'APPROVED', role: 'ADMIN' });
    }
  }

  // Non-admin user
  if (userIndex !== -1) {
    // Existing user -> Return current status
    const existing = db.users[userIndex];
    if (email) existing.email = email;
    if (displayName) existing.displayName = displayName;
    existing.lastLoginAt = new Date().toISOString();
    saveDatabase(db);
    return res.json({ 
      success: true, 
      user: existing, 
      status: existing.status || 'PENDING', 
      role: existing.role || 'STAFF' 
    });
  } else {
    // New user registration -> Create as PENDING
    const newUser = {
      uid,
      email: email || 'user@example.com',
      displayName: displayName || (email ? email.split('@')[0] : 'New User'),
      role: 'STAFF',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      lastLoginAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDatabase(db);

    return res.json({ 
      success: true, 
      user: newUser, 
      status: 'PENDING', 
      role: 'STAFF', 
      isNew: true 
    });
  }
});

// 2. Check Live Status of a Single User by UID
router.get('/status/:uid', (req, res) => {
  const db = getDatabase();
  ensureUsersArray(db);
  const { uid } = req.params;

  if (MASTER_ADMIN_UIDS.includes(uid)) {
    return res.json({ 
      success: true, 
      status: 'APPROVED', 
      role: 'ADMIN',
      isAdmin: true 
    });
  }

  const user = db.users.find(u => u.uid === uid);
  if (!user) {
    return res.json({ 
      success: true, 
      status: 'PENDING', 
      role: 'STAFF',
      notFound: true 
    });
  }

  res.json({ 
    success: true, 
    status: user.status || 'PENDING', 
    role: user.role || 'STAFF',
    user 
  });
});

// Middleware: Verify Master Admin Access
function requireAdmin(req, res, next) {
  const uid = req.headers['x-user-uid'] || req.query.adminUid || req.body?.adminUid;
  if (!uid || !MASTER_ADMIN_UIDS.includes(uid)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access Denied: Master Admin permissions required.' 
    });
  }
  next();
}

// Middleware: Verify Approved User Access
function requireApprovedUser(req, res, next) {
  const uid = req.headers['x-user-uid'];
  if (!uid) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required: Missing user identification.' 
    });
  }

  if (MASTER_ADMIN_UIDS.includes(uid)) {
    return next();
  }

  const db = getDatabase();
  const users = db.users || [];
  const user = users.find(u => u.uid === uid);

  if (!user || user.status !== 'APPROVED') {
    return res.status(403).json({ 
      success: false, 
      status: user ? user.status : 'UNREGISTERED',
      message: 'Access Denied: Your account is pending Admin approval.' 
    });
  }

  next();
}

// 3. GET All Registered Users (Protected: Master Admin Only)
router.get('/users', requireAdmin, (req, res) => {
  const db = getDatabase();
  ensureUsersArray(db);

  const usersList = [...db.users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = usersList.length;
  const pendingCount = usersList.filter(u => u.status === 'PENDING').length;
  const approvedCount = usersList.filter(u => u.status === 'APPROVED').length;
  const rejectedCount = usersList.filter(u => u.status === 'REJECTED').length;

  res.json({
    success: true,
    data: usersList,
    stats: {
      total,
      pendingCount,
      approvedCount,
      rejectedCount
    }
  });
});

// 4. Update User Status (Protected: Master Admin Only)
router.post('/users/:uid/status', requireAdmin, (req, res) => {
  const db = getDatabase();
  ensureUsersArray(db);

  const { uid } = req.params;
  const { status, role, approvedBy } = req.body;

  if (MASTER_ADMIN_UIDS.includes(uid) && status !== 'APPROVED') {
    return res.status(400).json({ success: false, message: 'Cannot modify Super Admin status' });
  }

  const userIndex = db.users.findIndex(u => u.uid === uid);
  if (userIndex === -1) {
    return res.status(404).json({ success: false, message: 'User not found in system' });
  }

  if (status) {
    db.users[userIndex].status = status; // 'APPROVED' | 'REJECTED' | 'PENDING'
    if (status === 'APPROVED') {
      db.users[userIndex].approvedAt = new Date().toISOString();
      db.users[userIndex].approvedBy = approvedBy || 'Admin';
    }
  }

  if (role) {
    db.users[userIndex].role = role; // 'ADMIN' | 'STAFF'
  }

  db.users[userIndex].updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({ 
    success: true, 
    message: `User status updated to ${status}`, 
    data: db.users[userIndex] 
  });
});

// 5. Delete User Entry (Protected: Master Admin Only)
router.delete('/users/:uid', requireAdmin, (req, res) => {
  const db = getDatabase();
  ensureUsersArray(db);

  const { uid } = req.params;

  if (MASTER_ADMIN_UIDS.includes(uid)) {
    return res.status(400).json({ success: false, message: 'Cannot delete Super Admin account' });
  }

  const initialLen = db.users.length;
  db.users = db.users.filter(u => u.uid !== uid);

  if (db.users.length === initialLen) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  saveDatabase(db);
  res.json({ success: true, message: 'User record removed from database' });
});

module.exports = {
  router,
  requireAdmin,
  requireApprovedUser
};
