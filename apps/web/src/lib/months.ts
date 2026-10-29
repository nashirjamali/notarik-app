const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Local calendar date as "2026-10-29". */
export function today(now = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

/** This month on the local calendar, as "2026-10". */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-10" moved by whole months, without timezone arithmetic. */
export function shiftMonth(month: string, delta: number): string {
  const [year, value] = month.split("-").map(Number);
  const index = year * 12 + (value - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** "2026-10" as "October 2026". */
export function monthLabel(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return `${MONTHS[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
}

function shiftDay(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "Today", "Yesterday", "20 Oct", or "20 Oct 2025" for another year. */
export function dayHeading(iso: string, now: string): string {
  if (iso === now) return "Today";
  if (iso === shiftDay(now, -1)) return "Yesterday";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const short = `${Number(match[3])} ${SHORT[Number(match[2]) - 1]}`;
  return match[1] === now.slice(0, 4) ? short : `${short} ${match[1]}`;
}

/** "08:15" in the browser's timezone, from an ISO timestamp. */
export function timeOf(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "Today, 22 Oct 2026 · 08:15" for the details screen. */
export function fullDate(iso: string, timestamp: string, today: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const plain = match ? `${Number(match[3])} ${SHORT[Number(match[2]) - 1]} ${match[1]}` : iso;
  const heading = dayHeading(iso, today);
  const lead = heading === "Today" || heading === "Yesterday" ? `${heading}, ${plain}` : plain;
  const time = timeOf(timestamp);
  return time ? `${lead} · ${time}` : lead;
}
