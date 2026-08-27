const firebaseConfig = {
  apiKey: "AIzaSyBtQjwxahtP6eWiQS0f4_lYYhcSmN1h_jU",
  authDomain: "lucky-draw-7k8ft.firebaseapp.com",
  projectId: "lucky-draw-7k8ft",
  storageBucket: "lucky-draw-7k8ft.firebasestorage.app",
  messagingSenderId: "356829889903",
  appId: "1:356829889903:web:1483a06aa6337bbafb549a"
};

async function test() {
  console.log("Loading Firebase via dynamic import...");
  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');

    console.log("Firebase SDK loaded successfully!");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const docRef = doc(db, "test_collection", "status");
    await setDoc(docRef, { status: "ACTIVE", updatedAt: new Date().toISOString() });
    console.log("SUCCESSFULLY WRITTEN TO CLOUD FIRESTORE!");

    const snap = await getDoc(docRef);
    console.log("FIRESTORE DATA:", snap.data());
  } catch (err) {
    console.error("DYNAMIC IMPORT TEST ERROR:", err);
  }
}

test();
