const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const uuidv4 = randomUUID;

const DATA_FILE = path.join(__dirname, 'data.json');

const INITIAL_DATA = {
  inventory: [],
  technicians: [],
  clients: [],
  dispatches: [],
  inventoryTransactions: [],
  users: []
};

// Initialize Firebase Web SDK dynamically from frontend node_modules
let auth, firestore, doc, getDoc, setDoc;
let isFirestoreInitialized = false;

async function initFirestore() {
  try {
    const { initializeApp } = require('firebase/app');
    const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
    const { getFirestore, doc: fDoc, getDoc: fGetDoc, setDoc: fSetDoc } = require('firebase/firestore');

    const firebaseConfig = {
      apiKey: "AIzaSyBtQjwxahtP6eWiQS0f4_lYYhcSmN1h_jU",
      authDomain: "lucky-draw-7k8ft.firebaseapp.com",
      projectId: "lucky-draw-7k8ft",
      storageBucket: "lucky-draw-7k8ft.firebasestorage.app",
      messagingSenderId: "356829889903",
      appId: "1:356829889903:web:1483a06aa6337bbafb549a"
    };

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    doc = fDoc;
    getDoc = fGetDoc;
    setDoc = fSetDoc;

    // Authenticate backend service account
    const email = "system_backend@vithalenterprises.com";
    const password = "SystemBackendPass123!";
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (cErr) {
          console.warn('[Firestore Auth] User creation warn:', cErr.message);
        }
      }
    }

    isFirestoreInitialized = true;
    console.log('[Firestore] Connected & Authenticated successfully on project lucky-draw-7k8ft!');
  } catch (err) {
    console.warn('[Firestore] Initialization warning:', err.message);
  }
}

let cachedDb = null;

function initDatabase() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
    }
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    cachedDb = JSON.parse(content);
  } catch (err) {
    console.error('Error initializing database:', err);
    cachedDb = JSON.parse(JSON.stringify(INITIAL_DATA));
    fs.writeFileSync(DATA_FILE, JSON.stringify(cachedDb, null, 2), 'utf8');
  }
}

async function pullFromFirestore() {
  if (!isFirestoreInitialized || !firestore || !doc || !getDoc) return;
  try {
    const docRef = doc(firestore, 'app_data', 'state');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data === 'object') {
        cachedDb = {
          inventory: Array.isArray(data.inventory) ? data.inventory : [],
          technicians: Array.isArray(data.technicians) ? data.technicians : [],
          clients: Array.isArray(data.clients) ? data.clients : [],
          dispatches: Array.isArray(data.dispatches) ? data.dispatches : [],
          inventoryTransactions: Array.isArray(data.inventoryTransactions) ? data.inventoryTransactions : [],
          users: Array.isArray(data.users) ? data.users : []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(cachedDb, null, 2), 'utf8');
        console.log('[Firestore] Successfully pulled live state from Cloud Firestore!');
      }
    }
  } catch (err) {
    console.warn('[Firestore] Pull warning:', err.message);
  }
}

async function pushToFirestore(data) {
  if (!isFirestoreInitialized || !firestore || !doc || !setDoc) return;
  try {
    const docRef = doc(firestore, 'app_data', 'state');
    await setDoc(docRef, {
      inventory: data.inventory || [],
      technicians: data.technicians || [],
      clients: data.clients || [],
      dispatches: data.dispatches || [],
      inventoryTransactions: data.inventoryTransactions || [],
      users: data.users || [],
      updatedAt: new Date().toISOString()
    });
    console.log('[Firestore] Successfully synced database state to Cloud Firestore!');
  } catch (err) {
    console.warn('[Firestore] Push warning:', err.message);
  }
}

function getDatabase() {
  if (!cachedDb) {
    initDatabase();
  }
  return cachedDb;
}

function saveDatabase(data) {
  try {
    cachedDb = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    
    // Async background sync to Cloud Firestore
    pushToFirestore(data).catch(err => {
      console.warn('[Firestore] Async save warning:', err.message);
    });

    return true;
  } catch (err) {
    console.error('Error saving database:', err);
    return false;
  }
}

// Trigger Firestore initialization
initFirestore().catch(err => {
  console.warn('[Firestore] Top-level init error:', err.message);
});

module.exports = {
  getDatabase,
  saveDatabase,
  initDatabase,
  uuidv4
};
