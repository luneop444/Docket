/**
 * Formatting helpers. Times are "minutes after midnight" on the simulated day.
 * Money is in dollars (rounded to cents when shown).
 */

/** 13:48 → "1:48 PM" */
export function clock(m: number): string {
  m = Math.round(m);
  let h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
}

/** 13:48 → "1:48" (status bar / lock screen) */
export function clockBare(m: number): string {
  m = Math.floor(m);
  let h = Math.floor(m / 60) % 24;
  h = h % 12 || 12;
  return `${h}:${String(m % 60).padStart(2, '0')}`;
}

/** 153 → "2h 33m", 21 → "21m" */
export function dur(m: number): string {
  m = Math.max(0, Math.round(m));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h ${String(mm).padStart(2, '0')}m` : `${mm}m`;
}

/** 153 → "2:33" (timer style) */
export function hm(m: number): string {
  m = Math.max(0, Math.floor(m));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** 120 → "2h", 90 → "1h 30m" (Figma: "2h free time"). */
export function durShort(m: number): string {
  return m > 0 && m % 60 === 0 ? `${m / 60}h` : dur(m);
}

/** 30 → "$30/hr", 27.5 → "$27.50/hr" */
export function rateShort(rate: number): string {
  return `$${Number.isInteger(rate) ? rate : rate.toFixed(2)}/hr`;
}

/** 10.5 → "$10.50" */
export function money(x: number): string {
  return '$' + (Math.round(x * 100) / 100).toFixed(2);
}

/**
 * Typed time → minutes after midnight, or null if it can't be read.
 * "7:30 AM", "7:30a", "730pm", "19:30", "7 pm", "1930". No AM/PM means 24-hour.
 */
export function parseClock(input: string): number | null {
  const t = input.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '');
  const m = t.match(/^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[3].startsWith('p') ? 12 : 0);
  } else if (h > 23) return null;
  return h * 60 + min;
}

/**
 * Joins the last two words with a no-break space, so text that wraps never leaves one word
 * alone on its last line ("…detention rules" wraps as a pair).
 */
export function keepLast(text: string): string {
  const i = text.lastIndexOf(' ');
  return i > 0 ? text.slice(0, i) + '\u00A0' + text.slice(i + 1) : text;
}
