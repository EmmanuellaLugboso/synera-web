import { sleep } from "../utils/async";
import { NextResponse } from "next/server";

function randomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function getRequestContext() {
  return { requestId: randomId() };
}

export async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000, retries = 1) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status >= 500 && attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }

      return res;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (attempt >= retries) throw error;
      await sleep(250 * (attempt + 1));
    }
  }

  throw lastError || new Error("Request failed");
}

export function mapUpstreamError(res, body) {
  if (res.status === 404) {
    return { code: "UPSTREAM_NOT_FOUND", message: "Upstream resource was not found." };
  }
  if (res.status === 401 || res.status === 403) {
    return { code: "UPSTREAM_UNAUTHORIZED", message: "Upstream authentication failed." };
  }
  if (res.status >= 500) {
    return { code: "UPSTREAM_UNAVAILABLE", message: "Upstream service is temporarily unavailable." };
  }
  return {
    code: "UPSTREAM_ERROR",
    message: typeof body === "string" && body.trim()
      ? `Upstream request failed (${res.status}).`
      : "Upstream request failed.",
  };
}

export function jsonSuccess(data, { status = 200, requestId } = {}) {
  return NextResponse.json({ data, requestId }, { status });
}

export function jsonError({ code, message, status = 500, requestId, details }) {
  return NextResponse.json(
    {
      error: { code, message },
      ...(details ? { details } : {}),
      requestId,
    },
    { status },
  );
}

export function jsonConfigMissing(requestId, key) {
  return jsonError({
    code: "CONFIG_MISSING",
    message: `Missing required environment variable: ${key}`,
    status: 500,
    requestId,
  });
}
