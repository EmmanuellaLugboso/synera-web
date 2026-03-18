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
  name: "",
  dob: "",
  height: "",
  heightUnit: "cm",
  weight: "",
  weightUnit: "kg",
  activity: "",
  experience: "",
  focus: [],
  goals: [],
  foodGoals: [],
  eatingStyle: "",
  mealFrequency: "",
  eatingChallenges: [],
  restrictionLevel: "",
  allergies: [],
  otherAllergy: "",
  supplements: [],
  otherSupplement: "",
  workoutTypes: [],
  workoutDays: "",
  workoutEnvironment: [],
  workoutTime: [],
  moveProgress: 0,
  hydrationProgress: 0,
  sleepProgress: 0,
  workouts: [],

  sex: "female",

  stepGoal: 8000,
  stepsLog: [],
  cardioLogs: [],
  calorieGoal: 1800,
  macroGoals: { proteinG: 120, carbsG: 200, fatG: 60 },
  foodLogs: [],
  savedRecipes: [],
  waterLitres: 0,
  waterGoalLitres: 3,
  waterIntake: "0L",
  supplementSchedule: [],
};

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

  useEffect(() => {
    if (isE2EMode) return () => {};

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      hasLoadedRemote.current = false;

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
      }

      hasLoadedRemote.current = true;
      setReady(true);
    });

    return () => unsub();
  }, [isE2EMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data]);

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
    lastSavedJSON.current = "";
  }, []);

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
