const { randomUUID } = require('crypto');
const uuidv4 = randomUUID;

const INITIAL_DATA = {
  inventory: [],
  technicians: [],
  clients: [],
  dispatches: [],
  inventoryTransactions: [],
  users: []
};

// In-Memory RAM Cache (No data.json file!)
let cachedDb = { ...INITIAL_DATA };

// Firebase Web SDK
let auth, firestore, doc, getDoc, setDoc;
let isFirestoreInitialized = false;

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
        console.log('[Cloud Firestore] Successfully pulled live state from Cloud Firestore!');
      }
    }
  } catch (err) {
    console.warn('[Cloud Firestore] Pull warning:', err.message);
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
    console.log('[Cloud Firestore] Successfully saved database state to Cloud Firestore!');
  } catch (err) {
    console.warn('[Cloud Firestore] Push warning:', err.message);
  }
}

async function initFirestore() {
  try {
    const { initializeApp } = require('firebase/app');
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
    firestore = getFirestore(app);
    doc = fDoc;
    getDoc = fGetDoc;
    setDoc = fSetDoc;

    isFirestoreInitialized = true;
    console.log('[Cloud Firestore] Connected successfully on project lucky-draw-7k8ft!');
    await pullFromFirestore();
  } catch (err) {
    console.warn('[Cloud Firestore] Initialization warning:', err.message);
  }
}

function getDatabase() {
  return cachedDb;
}

function saveDatabase(data) {
  try {
    cachedDb = data;
    
    // Save directly to Cloud Firebase Firestore
    pushToFirestore(data).catch(err => {
      console.warn('[Cloud Firestore] Save warning:', err.message);
    });

    return true;
  } catch (err) {
    console.error('Error saving database:', err);
    return false;
  }
}

// Trigger Cloud Firestore initialization immediately
initFirestore().catch(err => {
  console.warn('[Cloud Firestore] Top-level init error:', err.message);
});

module.exports = {
  getDatabase,
  saveDatabase,
  initDatabase: () => {},
  pullFromFirestore,
  pushToFirestore,
  uuidv4
};
