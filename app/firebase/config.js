import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCN-gwZsHOhjyxMtfdbpsQbxzFX_rAeo5Q",
  authDomain: "synera-fyp.firebaseapp.com",
  projectId: "synera-fyp",
  storageBucket: "synera-fyp.firebasestorage.app",
  messagingSenderId: "1049639783005",
  appId: "1:1049639783005:web:37858a5a50347e62cb1bb4",
  measurementId: "G-K06XXQNPL2"
};

// Prevent re-initializing Firebase during Next.js reloads.
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

export const auth = getAuth(app);
export const db = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false
    });
  } catch {
    return getFirestore(app);
  }
})();
export const storage = getStorage(app);

export default app;
