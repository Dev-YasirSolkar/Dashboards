import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtQjwxahtP6eWiQS0f4_lYYhcSmN1h_jU",
  authDomain: "lucky-draw-7k8ft.firebaseapp.com",
  projectId: "lucky-draw-7k8ft",
  storageBucket: "lucky-draw-7k8ft.firebasestorage.app",
  messagingSenderId: "356829889903",
  appId: "1:356829889903:web:1483a06aa6337bbafb549a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
};

export default app;
