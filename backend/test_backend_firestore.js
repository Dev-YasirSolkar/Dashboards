const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBtQjwxahtP6eWiQS0f4_lYYhcSmN1h_jU",
  authDomain: "lucky-draw-7k8ft.firebaseapp.com",
  projectId: "lucky-draw-7k8ft",
  storageBucket: "lucky-draw-7k8ft.firebasestorage.app",
  messagingSenderId: "356829889903",
  appId: "1:356829889903:web:1483a06aa6337bbafb549a"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function run() {
  console.log("Testing Firestore Write from backend...");
  try {
    const docRef = doc(firestore, "test_collection", "ve_inventory_status");
    await setDoc(docRef, { 
      appName: "VE Inventory", 
      database: "Cloud Firestore",
      status: "ACTIVE",
      timestamp: new Date().toISOString() 
    });
    console.log("SUCCESSFULLY WRITTEN TO CLOUD FIRESTORE!");

    const snap = await getDoc(docRef);
    console.log("FETCHED FROM FIRESTORE:", snap.data());
  } catch (err) {
    console.error("FIRESTORE ERROR:", err);
  }
}

run();
