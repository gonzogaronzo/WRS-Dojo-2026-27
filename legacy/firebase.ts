import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCFrIPEViRG1RvezuhU-uh1MgGxmpvk67U",
  authDomain: "wrs-firebase.firebaseapp.com",
  projectId: "wrs-firebase",
  storageBucket: "wrs-firebase.firebasestorage.app",
  messagingSenderId: "680748133806",
  appId: "1:680748133806:web:29b30661a758b8b5bcac3f",
  measurementId: "G-DWZYCT2TF3"
};

// Singleton initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let dbInstance;
let authInstance;

try {
  dbInstance = getFirestore(app);
  authInstance = getAuth(app);
} catch (e) {
  console.error("Firebase services failed to initialize", e);
}

export const db = dbInstance!;
export const auth = authInstance!;
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});