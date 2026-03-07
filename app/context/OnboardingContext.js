"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase/config";
import { getUserProfile, mergeUserProfile, sanitizeForFirestore } from "../services/userService";
import { logError } from "../lib/logging";

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

function safeObject(x) {
  return x && typeof x === "object" && !Array.isArray(x) ? x : null;
}


function parseLitres(value) {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  const num = Number(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(num)) return null;
  return Math.max(0, num);
}

function normalizeOnboardingData(input) {
  const obj = safeObject(input);
  if (!obj) return {};

  const next = { ...obj };

  const macroGoals = safeObject(next.macroGoals) || {};
  const legacyProtein = Number(next.proteinGoalG);
  if (!Number.isFinite(Number(macroGoals.proteinG)) && Number.isFinite(legacyProtein) && legacyProtein > 0) {
    next.macroGoals = { ...macroGoals, proteinG: legacyProtein };
  }

  const goalLitres = parseLitres(next.waterGoalLitres);
  const legacyGoal = parseLitres(next.waterGoal);
  if (goalLitres == null && legacyGoal != null) next.waterGoalLitres = legacyGoal;

  const litres = parseLitres(next.waterLitres);
  const intakeLitres = parseLitres(next.waterIntake);
  if (litres == null && intakeLitres != null) next.waterLitres = intakeLitres;

  return next;
}
function mergeOnboardingData(base, incoming) {
  const obj = safeObject(incoming);
  if (!obj) return base;
  return { ...base, ...obj };
}

export function OnboardingProvider({ children }) {
  const isE2EMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";
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
  const [user, setUser] = useState(() => (isE2EMode ? { uid: "e2e-user", email: "e2e@local.test" } : null));
  const [ready, setReady] = useState(() => isE2EMode);

  const hasLoadedRemote = useRef(false);
  const saveTimer = useRef(null);
  const lastSavedJSON = useRef("");

  // ---- Auth listener + Firestore load
  useEffect(() => {
    if (isE2EMode) return () => {};

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
        const isNestedDataDoc = safeObject(remoteDoc.data) !== null;
        const remoteData = normalizeOnboardingData(
          safeObject(remoteDoc.data) || safeObject(remoteDoc) || {},
        );

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
        logError("onboarding.remote_load.failed", error, { stage: "load" });
        // Keep local data if Firestore fails
      }

      hasLoadedRemote.current = true;
      setReady(true);
    });

    return () => unsub();
  }, [isE2EMode]);

  // ---- Always mirror to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

  // ---- Debounced Firestore autosave (ONLY writes to doc.data)
  useEffect(() => {
    if (!user || (isE2EMode && user?.uid === "e2e-user")) return;
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
        logError("onboarding.remote_save.failed", error, { stage: "save" });
      }
    }, 450);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, user, isE2EMode]);

  const updateField = useCallback((key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateAll = useCallback((newData) => {
    setData((prev) => ({ ...prev, ...(newData || {}) }));
  }, []);

  const updateMany = useCallback((patch) => {
    setData((prev) => ({ ...prev, ...(patch || {}) }));
  }, []);

  const resetAll = useCallback(() => {
    setData(DEFAULT_DATA);
    // also reset lastSavedJSON so it actually saves the reset
    lastSavedJSON.current = "";
  }, []);


  // ---- Best-effort flush on tab hide / unload to reduce data-loss on fast logout or close
  useEffect(() => {
    if (!user || (isE2EMode && user?.uid === "e2e-user")) return;

    const flushNow = async () => {
      try {
        await mergeUserProfile(user.uid, {
          email: user.email || "",
          updatedAt: serverTimestamp(),
          data: sanitizeForFirestore(normalizeOnboardingData(data)),
        });
      } catch {
        // silent best-effort flush
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };

    const onBeforeUnload = () => {
      flushNow();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [data, user, isE2EMode]);

  const value = useMemo(
    () => ({ data, user, ready, updateField, updateAll, updateMany, resetAll }),
    [data, user, ready, updateField, updateAll, updateMany, resetAll]
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
