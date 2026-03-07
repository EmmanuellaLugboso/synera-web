async function parseApiResponse(res, fallbackMessage) {
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || fallbackMessage);
  return json;
}

export async function requestSyra({ message, mode = "general", history, context } = {}) {
  const res = await fetch("/api/syra", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode, history, context }),
  });
  return parseApiResponse(res, "Syra is unavailable right now.");
}

export async function rewriteTaskWithSyra(message) {
  return requestSyra({ message, mode: "task_rewrite" });
}
