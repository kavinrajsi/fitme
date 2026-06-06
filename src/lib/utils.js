/**
 * Tailwind className helper. The standard shadcn `cn` utility used across the UI.
 */
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

// Merge conditional class names (clsx) then de-conflict overlapping Tailwind
// utilities (twMerge), so later classes win over earlier ones.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
