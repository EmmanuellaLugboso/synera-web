function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function sanitizeForFirestore(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [key, sanitizeForFirestore(val)])
        .filter(([, val]) => val !== undefined),
    );
  }
  return value;
}
