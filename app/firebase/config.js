// app/firebase/config.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Prevent Firebase from reinitialising in Next.js (VERY IMPORTANT)
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;