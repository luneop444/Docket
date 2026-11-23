/**
 * What the Companies tab says about one company: its detention rules in words,
 * and questions a driver can ask a recruiter before signing on.
 */
import { dur, durShort, money, rateShort } from './format';
import { COMPANIES, MIN_REPORTS, SAMPLE_BOARD, SUGGESTED, type Company } from './sampleData';
import type { CompanySort } from './state';

/** A company on the board, or any carrier Docket knows. */
export function findCompany(name: string | undefined | null): Company | null {
  if (!name) return null;
  return SAMPLE_BOARD.find((c) => c.name === name) ?? COMPANIES.find((c) => c.name === name) ?? null;
}

/** Stats only show once enough drivers have reported, so no one can be singled out. */
export const hasEnoughReports = (c: Pick<Company, 'reported'>) => c.reported >= MIN_REPORTS;

/** The real carriers with logos in the team's Figma. Shown first on the Companies tab. */
export const REAL_CARRIERS: Company[] = SUGGESTED;
export const isRealCarrier = (name: string) => REAL_CARRIERS.some((c) => c.name === name);

/**
 * Wait stats never show for a real carrier in the prototype: every number here is made up,
 * and a made-up figure next to a real company's logo reads as fact about that company.
 */
export const showsStats = (c: Company) => !isRealCarrier(c.name) && hasEnoughReports(c);

/** Two letters for a company without a logo: "Ridgeline Freight" → "RF", "Small Fleet Co." → "SF". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[a-z]/i.test(w) && !/^(co|inc|llc)\.?$/i.test(w));
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('') || name.slice(0, 1).toUpperCase();
}

/** Why a company's card has no stats. */
export function noStatsNote(c: Company): string {
  return isRealCarrier(c.name)
    ? 'Wait stats show once drivers here report through Docket.'
    : `Not enough reports yet (${c.reported} of ${MIN_REPORTS}). Stats show once ${MIN_REPORTS} drivers have reported, so no one can be singled out.`;
}

export function rulesRows(c: Company): [string, string][] {
  return [
    ['Free time', dur(c.rules.free)],
    ['Clock starts at', c.rules.start === 'appt' ? 'Appointment time' : 'Arrival'],
    ['Pay after free time', `${money(c.rules.rate)} an hour`],
  ];
}

/** Questions to ask before signing on, filled in with what other drivers report. */
export function recruiterQuestions(c: Company): string[] {
  const from = c.rules.start === 'appt' ? 'my appointment time' : 'when I arrive';
  return [
    `Drivers report ${dur(c.rules.free)} of free time, counted from ${from}. Is that right for my fleet?`,
    `Is detention ${money(c.rules.rate)} an hour after that, and is it paid on the next settlement?`,
    'Do I need a signed in and out time on the BOL to get paid?',
  ];
}

export function recruiterText(c: Company): string {
  return [`Questions for ${c.name} about detention pay:`, ...recruiterQuestions(c).map((q, i) => `${i + 1}. ${q}`)].join('\n');
}

/** Pay first, then when it starts: "$20/hr after 2h free". */
export function payLine(c: Company): string {
  return `${rateShort(c.rules.rate)} after ${durShort(c.rules.free)} free`;
}

/** The figure a row leads with, following the sort: the wait, or how often it was paid. */
export function headline(c: Company, sort: CompanySort): { value: string; label: string } {
  return sort === 'paid' ? { value: `${c.paid}%`, label: 'say it was paid' } : { value: c.avg, label: 'average wait' };
}

/** The other two figures, in one quiet line under the pay. */
export function otherStats(c: Company, sort: CompanySort): string {
  const past = `${c.past}% past free time`;
  return sort === 'paid' ? `${c.avg} wait · ${past}` : `${c.paid}% paid · ${past}`;
}

/** "1h 44m" → 104, so the list sorts by the real wait. */
export function avgMinutes(avg: string): number {
  const h = /(\d+)\s*h/.exec(avg), m = /(\d+)\s*m/.exec(avg);
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
}

/** Companies with stats first; then shortest wait, or most often paid. */
export function sortBoard(list: Company[], sort: CompanySort): Company[] {
  return [...list].sort(
    (x, y) =>
      Number(showsStats(y)) - Number(showsStats(x)) ||
      (sort === 'wait' ? avgMinutes(x.avg) - avgMinutes(y.avg) || x.past - y.past : y.paid - x.paid),
  );
}
