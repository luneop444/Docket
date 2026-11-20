/**
 * Claims: every load that's owed detention, from the stop to the money.
 *
 * A claim is sent from the dock with its proof (the claim sheet). Each settlement then
 * shows what it paid, or that it isn't on it yet (detention is often a settlement late),
 * and the claim carries over until it's paid. If it stays short, the driver asks the
 * fleet manager, then puts it to payroll in writing. Every step is kept with its date.
 */
import { calc, rulesLine, type DetentionResult, type Rules } from './detention';
import { clock, dur, money } from './format';
import { SAMPLE_WEEK, type LoggedStop, toWeekLoad } from './history';
import { loadNo, type WeekLoad } from './sampleData';

export type ClaimEvent =
  /** The claim sheet went to dispatch. */
  | { k: 'sent'; at: number }
  /** A settlement was checked: what it paid for this load (0 = not on it). `whole`: only
   *  the settlement's detention total was known, and it came up short. */
  | { k: 'check'; at: number; label: string; got: number; whole?: boolean }
  /** Asked the fleet manager about it. */
  | { k: 'asked'; at: number }
  /** Put it to payroll in writing. */
  | { k: 'payroll'; at: number }
  /** The driver marked it paid. */
  | { k: 'paid'; at: number };

export type ClaimLogs = Record<string, ClaimEvent[]>;

/** Where a claim is, which decides its next step. */
export type Stage = 'unsent' | 'waiting' | 'short' | 'asked' | 'askedShort' | 'payroll' | 'paid';

export interface Claim {
  id: string;
  load: WeekLoad;
  c: DetentionResult;
  owed: number;
  /** Paid so far, across settlements. */
  paid: number;
  /** Still owed. */
  left: number;
  /** Epoch ms of the stop's day. */
  day: number;
  events: ClaimEvent[];
  stage: Stage;
  /** Settlements checked with this load still short. */
  missed: number;
  /** From the made-up sample week. */
  sample: boolean;
  /** Today's simulated stop: not on the sample week's settlements. */
  demo: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The sample week's days (Oct 26–29, 2026), so the made-up claims have real dates. */
const SAMPLE_DAYS: Record<string, number> = {
  '48213': new Date(2026, 9, 26).getTime(),
  '48227': new Date(2026, 9, 27).getTime(),
  '48240': new Date(2026, 9, 28).getTime(),
  '48251': new Date(2026, 9, 29).getTime(),
};

/** The made-up claims were sent from the dock, an hour after leaving, like a real one would be. */
function sampleSent(l: WeekLoad, day: number): ClaimEvent[] {
  return [{ k: 'sent', at: day + (l.leave + 60) * 60000 }];
}

export function stageOf(events: ClaimEvent[], owed: number): { stage: Stage; paid: number; missed: number } {
  let paid = 0, missed = 0, sent = false, asked = false, payroll = false, shortSinceAsk = false, short = false;
  for (const e of events) {
    if (e.k === 'sent') sent = true;
    if (e.k === 'paid') return { stage: 'paid', paid: owed, missed };
    if (e.k === 'check') {
      paid = round(paid + (e.whole ? 0 : e.got));
      if (paid < owed - 0.005) {
        missed++;
        short = true;
        if (asked) shortSinceAsk = true;
      }
    }
    if (e.k === 'asked') { asked = true; shortSinceAsk = false; }
    if (e.k === 'payroll') payroll = true;
  }
  if (paid >= owed - 0.005) return { stage: 'paid', paid: owed, missed };
  const stage: Stage = payroll
    ? 'payroll'
    : asked
      ? shortSinceAsk ? 'askedShort' : 'asked'
      : short ? 'short' : sent ? 'waiting' : 'unsent';
  return { stage, paid, missed };
}

/** A stop that isn't in the history (the prototype's simulated one), as a claim's load. */
export interface ExtraLoad {
  l: WeekLoad;
  day: number;
}

/**
 * Every load owed detention, as a claim: logged stops, or the sample week before any.
 * `extra`: today's simulated stop once it's done, so a claim sent from it shows up too.
 */
export function claimsOf(history: LoggedStop[], rules: Rules, logs: ClaimLogs, extra?: ExtraLoad | null): Claim[] {
  const sample = !history.length;
  const loads = sample
    ? SAMPLE_WEEK.loads.map((l) => ({ l, day: SAMPLE_DAYS[l.id] ?? 0, demo: false }))
    : history.map((h) => ({ l: toWeekLoad(h), day: h.dayStart, demo: false }));
  if (extra && !loads.some((x) => x.l.id === extra.l.id)) loads.push({ ...extra, demo: true });
  const out: Claim[] = [];
  for (const { l, day, demo } of loads) {
    const c = calc(l.arrive, l.appt, l.leave, l.brk, rules);
    if (c.owed <= 0) continue;
    const owed = round(c.owed);
    const events = logs[l.id] ?? (sample && !demo ? sampleSent(l, day) : []);
    const { stage, paid, missed } = stageOf(events, owed);
    out.push({ id: l.id, load: l, c, owed, paid, left: round(owed - paid), day, events, stage, missed, sample, demo });
  }
  return out;
}

/** Open first, the ones needing the driver at the top, then oldest first. */
const ORDER: Record<Stage, number> = { unsent: 0, askedShort: 1, short: 2, payroll: 3, asked: 4, waiting: 5, paid: 6 };
export const sortClaims = (cs: Claim[]) => [...cs].sort((a, b) => ORDER[a.stage] - ORDER[b.stage] || a.day - b.day);

export const isOpen = (c: Claim) => c.stage !== 'paid';

/** Open claims a settlement should be checked for: sent or not, still owed. */
export const toCheck = (cs: Claim[]) => cs.filter(isOpen);

const lastCheck = (c: Claim) => c.events.filter((e) => e.k === 'check').at(-1)?.at ?? 0;

/**
 * The settlement Today asks about. Real claims: due once there's an open one that no
 * settlement has been checked for in 5 days (settlements come weekly). The sample: every
 * open claim is due, and the made-up settlements run Friday Oct 30, Nov 6, Nov 13…
 */
export function settlementDue(cs: Claim[], now: number): { label: string; claims: Claim[] } | null {
  const open = toCheck(cs).filter((c) => !c.demo);
  if (!open.length) return null;
  if (open[0].sample) {
    // Each made-up settlement is a week after the last one checked.
    const done = new Set(cs.flatMap((c) => c.events.filter((e) => e.k === 'check').map((e) => (e as { label: string }).label)));
    const d = new Date(2026, 9, 30 + 7 * done.size);
    return { label: `${MONTHS[d.getMonth()]} ${d.getDate()}`, claims: open };
  }
  const due = open.filter((c) => now - Math.max(lastCheck(c), c.day) > 5 * 864e5 || !lastCheck(c));
  if (!due.length) return null;
  // A stop from today can't be on today's settlement.
  const ready = due.filter((c) => now - c.day > 864e5);
  if (!ready.length) return null;
  const d = new Date(now);
  return { label: `${MONTHS[d.getMonth()]} ${d.getDate()}`, claims: ready };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Oct 27" */
export const shortDate = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};

/** When a sample settlement is checked: on its own made-up date, not today's. */
export function checkTime(cs: Claim[], label: string, now: number): number {
  if (!cs[0]?.sample || cs[0].demo) return now;
  const [m, d] = label.split(' ');
  return new Date(2026, MONTHS.indexOf(m), Number(d), 12).getTime();
}

/** When the driver acts on a sample claim: a little after its last step, in the sample's dates. */
export function actTime(c: Claim | undefined, now: number): number {
  if (!c?.sample || c.demo) return now;
  const last = c.events.at(-1)?.at ?? c.day;
  return last + 3 * 3600000;
}

/** What a settlement showed for each claim checked. `got` per claim id; missing ids = not on it. */
export function checkEvents(cs: Claim[], label: string, at: number, got: Record<string, number>): Record<string, ClaimEvent> {
  const out: Record<string, ClaimEvent> = {};
  for (const c of cs) out[c.id] = { k: 'check', at, label, got: round(got[c.id] ?? 0) };
  return out;
}

/**
 * Only the settlement's detention total is known. Enough for all of them: each is paid.
 * Short: it can't say which loads, so each is marked as short on a whole-settlement check.
 */
export function totalEvents(cs: Claim[], label: string, at: number, total: number): Record<string, ClaimEvent> {
  const want = round(cs.reduce((t, c) => t + c.left, 0));
  const out: Record<string, ClaimEvent> = {};
  // One load: the total can only be that load's.
  if (cs.length === 1) {
    out[cs[0].id] = { k: 'check', at, label, got: round(Math.min(total, cs[0].left)) };
    return out;
  }
  for (const c of cs) {
    out[c.id] = total >= want - 0.005 ? { k: 'check', at, label, got: c.left } : { k: 'check', at, label, got: 0, whole: true };
  }
  return out;
}

/** Text of a claim, for the claim sheet and the messages. */
function loadLines(c: Claim, rules: Rules) {
  const l = c.load;
  const no = loadNo(l);
  return [
    `${no ? `Load ${no}, ` : ''}${l.name}, ${l.day}`,
    `Arrived ${clock(l.arrive)}, left ${clock(l.leave)} (times from my phone's location at the facility).`,
    `${dur(c.c.paidMin)} past free time${c.c.minus ? `, after a ${dur(c.c.minus)} break` : ''}. Policy: ${rulesLine(rules)}.`,
    `Detention owed: ${money(c.owed)}.`,
  ];
}

/** The claim sheet sent from the dock. */
export function claimSheetText(c: Claim, rules: Rules, bol: boolean): string {
  return [
    'Detention claim',
    '',
    ...loadLines(c, rules),
    bol ? 'Signed BOL photo: on file, can send.' : 'No BOL photo.',
    '',
    'Please add this detention to my settlement. Thanks.',
  ].join('\n');
}

/** Asking the fleet manager, or writing to payroll, about claims still short. */
export function followUpText(cs: Claim[], rules: Rules, to: 'asked' | 'payroll'): string {
  const many = cs.length > 1;
  const blocks = cs.map((c) => {
    const checks = c.events.filter((e): e is Extract<ClaimEvent, { k: 'check' }> => e.k === 'check');
    const seen = checks.length
      ? checks.map((e) => (e.whole ? `the ${e.label} settlement was short overall` : e.got > 0 ? `the ${e.label} settlement paid ${money(e.got)}` : `not on the ${e.label} settlement`)).join('; ')
      : 'not on a settlement yet';
    const sent = c.events.find((e) => e.k === 'sent');
    return [
      ...loadLines(c, rules),
      sent ? `Claim sent ${shortDate(sent.at)}.` : '',
      `So far: ${seen}. Still owed: ${money(c.left)}.`,
    ].filter(Boolean).join('\n');
  });
  const total = money(round(cs.reduce((t, c) => t + c.left, 0)));
  if (to === 'payroll') {
    return (
      `To payroll: detention claim${many ? 's' : ''} still unpaid\n\n` +
      `I'm putting ${many ? 'these claims' : 'this claim'} in writing. ${many ? 'They were' : 'It was'} sent from the dock with the times recorded there, and I've asked my fleet manager. ${total} is still owed.\n\n` +
      `${blocks.join('\n\n')}\n\n` +
      `Please confirm when ${many ? 'they' : 'it'} will be paid, or tell me in writing why not. Thanks.`
    );
  }
  return (
    `Hi, my settlement doesn't show the detention I claimed for ${many ? 'these loads' : 'this load'}:\n\n` +
    `${blocks.join('\n\n')}\n\n` +
    `I have the claim sheet and BOL if you need them. Can you check ${many ? 'these' : 'this'}? Thanks.`
  );
}

/** Words for each stage, for the list and the detail. */
export function stageWords(c: Claim): { chip: string; tone: 'flag' | 'plain' | 'lime'; note: string } {
  const last = <K extends ClaimEvent['k']>(k: K) => c.events.filter((e) => e.k === k).at(-1);
  switch (c.stage) {
    case 'unsent':
      return { chip: 'Not sent', tone: 'flag', note: 'Send the claim sheet to dispatch' };
    case 'waiting':
      return { chip: `Sent ${shortDate(last('sent')!.at)}`, tone: 'plain', note: 'Waiting on a settlement' };
    case 'short':
      return { chip: c.paid > 0 ? `Paid ${money(c.paid)}` : 'Not on settlement', tone: 'flag', note: c.paid > 0 ? 'Paid less than owed' : c.missed > 1 ? `Missing from ${c.missed} settlements` : 'Often a settlement late' };
    case 'asked':
      return { chip: `Asked ${shortDate(last('asked')!.at)}`, tone: 'plain', note: 'Waiting on the next settlement' };
    case 'askedShort':
      return { chip: 'Still short', tone: 'flag', note: 'Asked, and the next settlement didn’t pay it' };
    case 'payroll':
      return { chip: `Payroll ${shortDate(last('payroll')!.at)}`, tone: 'plain', note: 'In writing, waiting on payroll' };
    case 'paid':
      return { chip: 'Paid', tone: 'lime', note: '' };
  }
}

/**
 * What a read settlement paid each claim, by load number. Claims without a load number
 * can't be matched; they come back in `unmatched` for the driver to look up.
 */
export function gotFromSettlement(
  cs: Claim[],
  lines: { number: string; detention: number | null }[],
  same: (a: string, b: string) => boolean,
): { got: Record<string, number>; unmatched: string[] } {
  const got: Record<string, number> = {};
  const unmatched: string[] = [];
  for (const c of cs) {
    const no = loadNo(c.load);
    if (!no) {
      unmatched.push(c.id);
      continue;
    }
    got[c.id] = round(lines.filter((x) => same(x.number, no)).reduce((t, x) => t + (x.detention ?? 0), 0));
  }
  return { got, unmatched };
}

/**
 * What the made-up settlements pay, so the sample can be walked from claim to payroll:
 * 'all' is what's still owed (whatever the rules make it), a number is dollars.
 */
const SAMPLE_SCANS: Record<string, Record<string, number | 'all'>> = {
  'Oct 30': { '48213': 'all', '48240': 25 },
  'Nov 6': {},
  'Nov 13': { '48227': 'all' },
};

export function sampleScan(cs: Claim[], label: string): Record<string, number> {
  const pay = SAMPLE_SCANS[label] ?? {};
  return Object.fromEntries(cs.map((c) => [c.id, pay[c.id] === 'all' ? c.left : Math.min(c.left, (pay[c.id] as number | undefined) ?? 0)]));
}
