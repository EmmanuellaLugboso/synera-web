function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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
