const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function normalizeTemplateName(input) {
  if (!input) return "";

  return input
    .toString()
    .trim()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTemplateLookupKeys(templateName) {
  const raw = (templateName || "").toString().trim();
  if (!raw) return [];

  // Normalize legacy variants like:
  // - "Both - Rugăciune pentru misionari"
  // - "Both - Info Donații APME"
  let cleaned = raw.replace(/^both\s*-\s*/i, "").trim();

  const candidates = new Set();

  const direct = normalizeTemplateName(cleaned);
  if (direct) candidates.add(direct);

  const lower = cleaned.toLowerCase();
  if (!lower.startsWith("info ")) {
    const withInfo = normalizeTemplateName(`Info ${cleaned}`);
    if (withInfo) candidates.add(withInfo);
  } else {
    const withoutInfo = normalizeTemplateName(cleaned.replace(/^info\s+/i, ""));
    if (withoutInfo) candidates.add(withoutInfo);
  }

  return [...candidates];
}

/**
 * Parses legacy sent date strings like:
 * - "29/11/2023, 18:17"
 * - "12/6/2025"
 *
 * Interprets date components as day/month/year (Romanian format).
 * Interprets the optional time as local time.
 */
function parseLegacySentDate(input) {
  if (!input) return null;

  const raw = input.toString().trim();
  if (!raw) return null;

  const [datePartRaw, timePartRaw] = raw.split(",").map((s) => s.trim());
  const dateParts = datePartRaw
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  if (dateParts.length !== 3) return null;

  const day = Number.parseInt(dateParts[0], 10);
  const month = Number.parseInt(dateParts[1], 10);
  const year = Number.parseInt(dateParts[2], 10);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year)
  )
    return null;
  if (day < 1 || day > 31) return null;
  if (month < 1 || month > 12) return null;
  if (year < 1970 || year > 2100) return null;

  let hour = 0;
  let minute = 0;

  if (timePartRaw) {
    const timeParts = timePartRaw
      .split(":")
      .map((s) => s.trim())
      .filter(Boolean);
    if (timeParts.length >= 2) {
      hour = Number.parseInt(timeParts[0], 10);
      minute = Number.parseInt(timeParts[1], 10);
    }
  }

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;

  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(d.getTime())) return null;

  return d;
}

function chunkArray(items, chunkSize) {
  if (!Array.isArray(items)) throw new Error("items must be an array");
  if (!Number.isFinite(chunkSize) || chunkSize <= 0)
    throw new Error("chunkSize must be > 0");

  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

module.exports = {
  normalizeTemplateName,
  getTemplateLookupKeys,
  parseLegacySentDate,
  chunkArray,
};
