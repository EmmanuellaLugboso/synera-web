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
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/config";
import { getUserProfile, mergeUserProfile, sanitizeForFirestore } from "../services/userService";
import { mergeOnboardingData, normalizeOnboardingData } from "./onboardingData";

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
  experience: "",
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

export function OnboardingProvider({ children }) {
  const [data, setData] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_DATA;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_DATA;
      const parsed = JSON.parse(saved);
      return mergeOnboardingData(DEFAULT_DATA, normalizeOnboardingData(parsed));
    } catch {
      return DEFAULT_DATA;
    }
  });
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const hasLoadedRemote = useRef(false);
  const saveTimer = useRef(null);
  const lastSavedJSON = useRef("");

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
        const remoteDoc = (await getUserProfile(u.uid)) || {};
        const nested = remoteDoc && typeof remoteDoc.data === "object" && !Array.isArray(remoteDoc.data)
          ? remoteDoc.data
          : null;
        const flat = remoteDoc && typeof remoteDoc === "object" && !Array.isArray(remoteDoc)
          ? remoteDoc
          : {};
        const isNestedDataDoc = nested !== null;
        const remoteData = normalizeOnboardingData(nested || flat);

        if (Object.keys(remoteDoc).length > 0) {
          // Merge: defaults -> current local -> remote data
          setData((prev) =>
            mergeOnboardingData(DEFAULT_DATA, mergeOnboardingData(prev, remoteData))
          );

          if (!isNestedDataDoc) {
            await mergeUserProfile(u.uid, {
              updatedAt: serverTimestamp(),
              data: sanitizeForFirestore(remoteData),
            });
          }
        } else {
          // First-time user: create clean doc
          await mergeUserProfile(u.uid, {
            email: u.email || "",
            onboardingComplete: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            data: sanitizeForFirestore(DEFAULT_DATA),
          });

          setData(DEFAULT_DATA);
        }
      } catch (error) {
        console.log("Firestore load failed:", error);
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
    } catch {}
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
        const payload = sanitizeForFirestore(normalizeOnboardingData(data));

        await mergeUserProfile(user.uid, {
          email: user.email || "",
          updatedAt: serverTimestamp(),
          data: payload,
        });

        lastSavedJSON.current = json;
      } catch (error) {
        console.log("Firestore save failed:", error);
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
