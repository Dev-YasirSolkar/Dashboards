const { initializeApp } = require('../frontend/node_modules/firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('../frontend/node_modules/firebase/auth');
const { getFirestore, doc, setDoc, getDoc } = require('../frontend/node_modules/firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBtQjwxahtP6eWiQS0f4_lYYhcSmN1h_jU",
  authDomain: "lucky-draw-7k8ft.firebaseapp.com",
  projectId: "lucky-draw-7k8ft",
  storageBucket: "lucky-draw-7k8ft.firebasestorage.app",
  messagingSenderId: "356829889903",
  appId: "1:356829889903:web:1483a06aa6337bbafb549a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

async function testBackendAuth() {
  console.log("1. Authenticating backend with Firebase Auth...");
  const email = "system_backend@vithalenterprises.com";
  const password = "SystemBackendPass123!";

  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Logged in existing backend service account!");
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("Created & logged in new backend service account!");
      } catch (createErr) {
        console.error("Failed to create backend user:", createErr);
        return;
      }
    } else {
      console.error("Auth error:", err);
      return;
    }
  }

  console.log("User UID:", userCredential.user.uid);

  console.log("2. Testing Firestore Write as Authenticated User...");
  try {
    const docRef = doc(firestore, "test_collection", "authenticated_doc");
    await setDoc(docRef, {
      status: "AUTHENTICATED_FIRESTORE_WRITE_SUCCESS",
      writtenBy: userCredential.user.uid,
      timestamp: new Date().toISOString()
    });
    console.log("SUCCESSFULLY WRITTEN TO CLOUD FIRESTORE AS AUTHENTICATED USER!");

    const snap = await getDoc(docRef);
    console.log("FIRESTORE DATA:", snap.data());
  } catch (fsErr) {
    console.error("Firestore error after auth:", fsErr);
  }
}

testBackendAuth();
