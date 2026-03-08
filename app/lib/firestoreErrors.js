const FIRESTORE_INDEX_HINTS = ["index", "composite", "The query requires"];

export function isLikelyFirestoreIndexError(message = "") {
  const text = String(message || "");
  return FIRESTORE_INDEX_HINTS.some((hint) => text.includes(hint));
}

export function getInsightsLoadErrorMessage(error) {
  const message = error?.message || "";
  if (isLikelyFirestoreIndexError(message)) {
    return "Insights are still syncing. Try again shortly.";
  }
  return "Couldn't load insights. Please refresh.";
}

