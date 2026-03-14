import { sleep } from "../utils/async";

async function safeParseJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function requestJson(url, options = {}) {
  const {
    method = "GET",
    headers,
    body,
    cache,
    timeoutMs = 12000,
    retries = 0,
    retryDelayMs = 350,
    fallbackError = "Request failed.",
  } = options;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        cache,
        signal: controller.signal,
      });
      const payload = await safeParseJson(res);

      if (!res.ok) {
        const message = payload?.error?.message || payload?.error || fallbackError;
        const err = new Error(message);
        err.status = res.status;
        if (attempt < retries && res.status >= 500) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw err;
      }

      return payload;
    } catch (error) {
      const isAbort = error?.name === "AbortError";
      const canRetry = attempt < retries && (isAbort || !error?.status || error?.status >= 500);
      if (canRetry) {
        await sleep(retryDelayMs * (attempt + 1));
        continue;
      }
      if (isAbort) throw new Error("Request timed out. Please try again.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(fallbackError);
}
