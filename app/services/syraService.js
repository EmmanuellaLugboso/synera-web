import { requestJson } from "./apiClient";

export async function requestSyra({ message, mode = "general", history, context } = {}) {
  return requestJson("/api/syra", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode, history, context }),
    retries: 1,
    fallbackError: "Syra is unavailable right now.",
  });
}

export async function rewriteTaskWithSyra(message) {
  return requestSyra({ message, mode: "task_rewrite" });
}
