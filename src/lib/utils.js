import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Returns today's date in IST (UTC+5:30) as YYYY-MM-DD.
// The server runs in UTC so we shift by the IST offset before reading the date parts.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
export function istIsoDate(offsetDays = 0) {
  const ist = new Date(Date.now() + IST_OFFSET_MS)
  if (offsetDays) ist.setUTCDate(ist.getUTCDate() + offsetDays)
  return ist.toISOString().slice(0, 10)
}
