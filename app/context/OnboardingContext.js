"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

const OnboardingContext = createContext({
  data: {},
  user: null,
  ready: false,
  updateField: () => {},
  updateAll: () => {},
  updateMany: () => {},
  resetAll: () => {},
});

const STORAGE_KEY = "synera_onboarding_v1";

const DEFAULT_DATA = {
  // BASIC PROFILE
  name: "",
  dob: "",
  height: "",
  heightUnit: "cm",
  weight: "",
  weightUnit: "kg",

  // FITNESS (from onboarding)
  activity: "",
  focus: [],

  // GOALS / NUTRITION (from onboarding)
  goals: [],
  foodGoals: [],
  eatingStyle: "",
  mealFrequency: "",
  eatingChallenges: [],
  restrictionLevel: "",

  // ALLERGIES
  allergies: [],
  otherAllergy: "",

  // SUPPLEMENTS (from onboarding)
  supplements: [],
  otherSupplement: "",

  // WORKOUT (from onboarding)
  workoutTypes: [],
  workoutDays: "",
  workoutEnvironment: [],
  workoutTime: [],

  // DASHBOARD RING VALUES
  moveProgress: 0,
  hydrationProgress: 0,
  sleepProgress: 0,

  // FITNESS APP STORAGE
  workouts: [],

  //Sex
  sex: "female", // "female" | "male" | "unspecified"


  // Steps
  stepGoal: 8000,
  stepsLog: [],

  // Cardio logs
  cardioLogs: [],

  // NUTRITION
  calorieGoal: 1800,
  macroGoals: { proteinG: 120, carbsG: 200, fatG: 60 },
  foodLogs: [],
  savedRecipes: [],

  // HYDRATION
  waterLitres: 0,
  waterGoalLitres: 3,
  waterIntake: "0L",

  // SUPPLEMENTS (hub schedule)
  supplementSchedule: [],
};

function safeObject(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : null;
}

function mergeData(base, incoming) {
  const obj = safeObject(incoming);
  if (!obj) return base;
  return { ...base, ...obj };
}

export function OnboardingProvider({ children }) {
  const [data, setData] = useState(DEFAULT_DATA);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const hasLoadedRemote = useRef(false);
  const saveTimer = useRef(null);
  const lastSavedJSON = useRef("");

  // ---- LocalStorage load (fast startup / offline)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData((prev) => mergeData(DEFAULT_DATA, mergeData(prev, parsed)));
      }
    } catch (e) {}
  }, []);

  // ---- Auth listener + Firestore load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      hasLoadedRemote.current = false;

      // Not logged in => use local data only
      if (!u) {
        setReady(true);
        return;
      }

      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const remoteDoc = snap.data() || {};
          const remoteData = remoteDoc.data || {};

          // Merge: defaults -> current local -> remote data
          setData((prev) =>
            mergeData(DEFAULT_DATA, mergeData(prev, remoteData))
          );
        } else {
          // First-time user: create clean doc
          await setDoc(
            ref,
            {
              email: u.email || "",
              onboardingComplete: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              data: JSON.parse(JSON.stringify(DEFAULT_DATA)),
            },
            { merge: true }
          );

          setData(DEFAULT_DATA);
        }
      } catch (e) {
        console.log("Firestore load failed:", e);
        // Keep local data if Firestore fails
      }

      hasLoadedRemote.current = true;
      setReady(true);
    });

    return () => unsub();
  }, []);

  // ---- Always mirror to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }, [data]);

  // ---- Debounced Firestore autosave (ONLY writes to doc.data)
  useEffect(() => {
    if (!user) return;
    if (!hasLoadedRemote.current) return;

    const json = JSON.stringify(data);
    if (json === lastSavedJSON.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        const ref = doc(db, "users", user.uid);

        // Remove undefined safely
        const payload = JSON.parse(JSON.stringify(data));

        await setDoc(
          ref,
          {
            email: user.email || "",
            updatedAt: serverTimestamp(),
            data: payload,
          },
          { merge: true }
        );

        lastSavedJSON.current = json;
      } catch (e) {
        console.log("Firestore save failed:", e);
      }
    }, 450);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, user]);

  function updateField(key, value) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function updateAll(newData) {
    setData((prev) => ({ ...prev, ...(newData || {}) }));
  }

  function updateMany(patch) {
    setData((prev) => ({ ...prev, ...(patch || {}) }));
  }

  function resetAll() {
    setData(DEFAULT_DATA);
    // also reset lastSavedJSON so it actually saves the reset
    lastSavedJSON.current = "";
  }

  const value = useMemo(
    () => ({ data, user, ready, updateField, updateAll, updateMany, resetAll }),
    [data, user, ready]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  return useContext(OnboardingContext);
}
