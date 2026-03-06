const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export function normalizeError(error, fallbackMessage = FALLBACK_MESSAGE) {
  if (!error) {
    return { message: fallbackMessage, code: "UNKNOWN" };
  }

  const message = typeof error?.message === "string" && error.message.trim()
    ? error.message
    : fallbackMessage;

  const code = typeof error?.code === "string" && error.code.trim()
    ? error.code
    : "UNKNOWN";

  return {
    message,
    code,
    stack: typeof error?.stack === "string" ? error.stack : undefined,
  };
}
