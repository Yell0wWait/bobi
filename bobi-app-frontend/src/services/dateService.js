export function toLocalTimestamp(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 19);
}

export function toLocalDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (value.includes("T")) return value.split("T")[0];
    if (value.includes(" ")) return value.split(" ")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function toLocalDateYYYYMMDD(value) {
  const date = toLocalDateInputValue(value);
  return date ? date.replace(/-/g, "") : "";
}
