/**
 * Formats a YYYY-MM-DD date string (or other standard date formats) to DD/MM/YYYY
 * without local timezone shift/offset conversion issues.
 * If it's a full ISO timestamp or Date object, formats it using standard locale formatting.
 */
export function formatLocalDate(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return "-";

  // If already a Date object
  if (dateVal instanceof Date) {
    return dateVal.toLocaleDateString("pt-BR");
  }

  if (typeof dateVal === "string") {
    // Check if it starts with YYYY-MM-DD (e.g. "2026-04-25" or "2026-04-25T...")
    const match = dateVal.match(/^(\d{4})-(\d{2})-(\d{2})(T|$)/);
    if (match) {
      const [_, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
}

/**
 * Returns a YYYY-MM-DD date string in local timezone (defaults to today)
 * to avoid UTC offset issues when initializing date inputs.
 */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into a local Date object, avoiding UTC conversion.
 */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}
