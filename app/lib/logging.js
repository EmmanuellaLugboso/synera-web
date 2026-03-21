import { normalizeError } from "./errors.js";

function sanitize(payload = {}) {
  const blocked = ["password", "token", "apikey", "authorization", "secret"];
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      const redacted = blocked.some((x) => key.toLowerCase().includes(x));
      return [key, redacted ? "[REDACTED]" : value];
    }),
  );
}

function getConsoleMethod(level) {
  if (level === "error") return "error";
  if (level === "warn") return "warn";
  return "info";
}

export function emitLogLine(level, line, options = {}) {
  const stderr = Object.hasOwn(options, "stderr")
    ? options.stderr
    : globalThis.process?.stderr;
  if (typeof stderr?.write === "function") {
    stderr.write(`${line}\n`);
    return "stderr";
  }

  const consoleTarget = Object.hasOwn(options, "consoleTarget")
    ? options.consoleTarget
    : globalThis.console;
  const method = getConsoleMethod(level);

  if (typeof consoleTarget?.[method] === "function") {
    consoleTarget[method](line);
    return method;
  }

  return null;
}

export function logEvent(level, event, payload = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitize(payload),
  };

  if (process.env.NODE_ENV !== "production") {
    emitLogLine(level, JSON.stringify(entry));
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
