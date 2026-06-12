import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Copy text to the clipboard, with a fallback for non-secure contexts.
 *
 * The async Clipboard API (`navigator.clipboard`) is only available in secure
 * contexts (HTTPS or localhost). When the app is opened over plain HTTP on a
 * LAN IP, `navigator.clipboard` is undefined, so we fall back to a hidden
 * <textarea> + `document.execCommand("copy")`. Returns whether the copy
 * succeeded so callers can show the right toast.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy approach below.
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Format a number as workspace currency (defaults to INR). */
export function formatCurrency(amount: number, currency = "INR"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Round to 2 decimals to avoid floating point drift in money math. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Calendar-relative day label: "Today", "Tomorrow", "Yesterday",
 * "in N days" or "N days ago" — comparison is by date, ignoring time of day.
 */
export function relativeDay(date: Date | number | string): string {
  let d: Date;
  if (date instanceof Date) d = date;
  else if (typeof date === "number") d = new Date(date * 1000);
  else
    d = /^\d+$/.test(date.trim())
      ? new Date(Number(date) * 1000)
      : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(new Date())) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `in ${days} days`;
  return `${-days} days ago`;
}

export function relativeTime(date: Date | number | string): string {
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "number") {
    // Stored timestamps are unix seconds (see schema `unixepoch()`).
    d = new Date(date * 1000);
  } else {
    // A string is either a numeric unix-seconds value or an ISO date string
    // (a Date serialized to JSON over the API).
    d = /^\d+$/.test(date.trim())
      ? new Date(Number(date) * 1000)
      : new Date(date);
  }
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}
