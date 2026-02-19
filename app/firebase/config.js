// app/firebase/config.js

// Firebase v9+ modular import
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCN-gwZsHOhjyxMtfdbpsQbxzFX_rAeo5Q",
  authDomain: "synera-fyp.firebaseapp.com",
  projectId: "synera-fyp",
  storageBucket: "synera-fyp.firebasestorage.app",
  messagingSenderId: "1049639783005",
  appId: "1:1049639783005:web:37858a5a50347e62cb1bb4",
  measurementId: "G-K06XXQNPL2"
};

// Prevent Firebase from reinitialising
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
