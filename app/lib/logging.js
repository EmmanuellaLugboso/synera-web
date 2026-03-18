import { normalizeError } from "./errors";

function sanitize(payload = {}) {
  const blocked = ["password", "token", "apiKey", "authorization", "secret"];
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      const redacted = blocked.some((x) => key.toLowerCase().includes(x));
      return [key, redacted ? "[REDACTED]" : value];
    }),
  );
}

export function logEvent(level, event, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitize(payload),
  };

  if (process.env.NODE_ENV !== "production") {
    process.stderr.write(`${JSON.stringify(entry)}\n`);
  }
}

export function logError(event, error, payload = {}) {
  const normalized = normalizeError(error);
  logEvent("error", event, {
    ...payload,
    code: normalized.code,
    message: normalized.message,
  });
  return normalized;
}
