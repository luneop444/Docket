/**
 * What the Companies tab says about one company: its detention rules in words,
 * and questions a driver can ask a recruiter before signing on.
 */
import { dur, money } from './format';
import { COMPANIES, MIN_REPORTS, SAMPLE_BOARD, type Company } from './sampleData';

/** A company on the board, or any carrier Docket knows. */
export function findCompany(name: string | undefined | null): Company | null {
  if (!name) return null;
  return SAMPLE_BOARD.find((c) => c.name === name) ?? COMPANIES.find((c) => c.name === name) ?? null;
}

/** Stats only show once enough drivers have reported, so no one can be singled out. */
export const hasEnoughReports = (c: Pick<Company, 'reported'>) => c.reported >= MIN_REPORTS;

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
