/**
 * Paycheck check: compare what the rules say you're owed with what the
 * settlement shows, and draft the message to the fleet manager.
 */
import { calc, rulesLine, type DetentionResult, type Rules } from './detention';
import { clock, dur, money } from './format';
import { loadNo, type Marks, type WeekLoad } from './sampleData';

export interface FlaggedLoad {
  l: WeekLoad;
  c: DetentionResult;
  /** What the settlement shows (0 if not there). */
  got: number;
}

export interface WeekTotals {
  expected: number;
  wait: number;
  short: number;
  flagged: FlaggedLoad[];
  /** True once every load that's owed detention has been marked. */
  checked: boolean;
  /** Loads that are owed detention. */
  eligible: number;
}

export function weekTotals(week: WeekLoad[], rules: Rules, marks: Marks): WeekTotals {
  let expected = 0, wait = 0, short = 0, eligible = 0, checked = true;
  const flagged: FlaggedLoad[] = [];
  for (const l of week) {
    const c = calc(l.arrive, l.appt, l.leave, l.brk, rules);
    wait += c.wait;
    if (c.owed <= 0) continue;
    eligible++;
    expected += c.owed;
    const m = marks[l.id];
    if (!m) { checked = false; continue; }
    if (m.m === 'none') { short += c.owed; flagged.push({ l, c, got: 0 }); }
    if (m.m === 'less') {
      const got = parseFloat(m.amt ?? '') || 0;
      if (got < c.owed) { short += c.owed - got; flagged.push({ l, c, got }); }
    }
  }
  return { expected, wait, short: Math.round(short * 100) / 100, flagged, checked, eligible };
}

export function isFlagged(owed: number, mark: Marks[string] | undefined): boolean {
  if (!mark) return false;
  return mark.m === 'none' || (mark.m === 'less' && (parseFloat(mark.amt ?? '') || 0) < owed);
}

/** Keep only digits and a decimal point. */
export function cleanAmount(v: string): string {
  return typeAmount(v).value;
}

/** The most a typed detention amount can be: five dollar digits ($99,999.99). */
const MAX_DOLLAR_DIGITS = 5;

/**
 * Checks an amount as it's typed and says what was wrong, so the field can show it in red
 * instead of silently dropping the key. Spaces, "$" and thousands commas are fine and dropped
 * quietly (people paste "$1,234.50"). Anything else that isn't a digit or one decimal point is
 * refused with "Enter a number". Cents stop at two places; dollars at five digits.
 */
export function typeAmount(raw: string): { value: string; error: string | null } {
  let s = raw.replace(/[\s$,]/g, '');
  let error: string | null = null;
  if (/[^0-9.]/.test(s)) {
    error = 'Enter a number, like 22.65';
    s = s.replace(/[^0-9.]/g, '');
  }
  const dot = s.indexOf('.');
  let whole = dot < 0 ? s : s.slice(0, dot);
  let cents = dot < 0 ? '' : s.slice(dot + 1);
  if (cents.includes('.')) {
    error ??= 'Use one decimal point, like 22.65';
    cents = cents.replace(/\./g, '');
  }
  if (cents.length > 2) {
    error ??= 'Cents only go two places, like 22.65';
    cents = cents.slice(0, 2);
  }
  whole = whole.replace(/^0+(?=\d)/, '');
  if (whole.length > MAX_DOLLAR_DIGITS) {
    error ??= 'That’s over $99,999. Check the number';
    whole = whole.slice(0, MAX_DOLLAR_DIGITS);
  }
  if (dot >= 0 && whole === '') whole = '0';
  return { value: dot < 0 ? whole : `${whole}.${cents}`, error };
}

/** Shows a finished amount with its cents: "22" → "22.00", "22.5" → "22.50". Empty stays empty. */
export function formatAmount(value: string): string {
  if (value === '' || value === '.') return '';
  const n = parseFloat(value);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

export function claimText(totals: WeekTotals, rules: Rules, weekLabel: string): string {
  const lines = totals.flagged.map(({ l, c, got }) =>
    `${loadNo(l) ? `Load ${loadNo(l)}, ` : ''}${l.name} (${l.day}): arrived ${clock(l.arrive)}, left ${clock(l.leave)}. ` +
    `That’s ${dur(c.paidMin)} past free time, so ${money(c.owed)} by our policy. ` +
    (got > 0 ? `My settlement shows ${money(got)}.` : 'It’s not on my settlement.'),
  );
  const many = lines.length > 1;
  return (
    `Hi, my settlement for the ${weekLabel.replace(/^Week/, 'week')} doesn’t show the detention I expected for ${many ? 'these loads' : 'this load'}:\n\n` +
    `${lines.join('\n\n')}\n\n` +
    `Our policy: ${rulesLine(rules)}. I have the location and BOL times if you need them. ` +
    `Can you check ${many ? 'these' : 'this'}? Thanks.`
  );
}
