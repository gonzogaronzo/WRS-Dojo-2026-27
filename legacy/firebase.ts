import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from "firebase/auth";

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
let persistenceReady: Promise<void> = Promise.resolve();

try {
  // App records intentionally use optional fields. Firestore rejects JavaScript
  // `undefined` values by default, so omit them at the serialization boundary.
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
  authInstance = getAuth(app);
  // Teacher authentication must survive reloads and transient network delays.
  // Never substitute an anonymous/local session when Firebase is merely slow.
  persistenceReady = setPersistence(authInstance, browserLocalPersistence);
} catch (e) {
  console.error("Firebase services failed to initialize", e);
}

export const db = dbInstance!;
export const auth = authInstance!;
export const authPersistenceReady = persistenceReady;
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});
