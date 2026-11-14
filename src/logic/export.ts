/**
 * The driver's record of logged stops, as a CSV file (for a spreadsheet or a
 * dispute) and as plain text (to paste into a text or email). Amounts use the
 * driver's current rules.
 */
import { calc, rulesLine, type Rules } from './detention';
import { clock, dur, money } from './format';
import { dayLabel, type LoggedStop } from './history';

export interface StopRow {
  h: LoggedStop;
  waited: number;
  paidMin: number;
  owed: number;
}

/** Each stop with its numbers, oldest first. */
export function stopRows(history: LoggedStop[], rules: Rules): StopRow[] {
  return [...history]
    .sort((a, b) => a.dayStart + a.arrive * 60000 - (b.dayStart + b.arrive * 60000))
    .map((h) => {
      const c = calc(h.arrive, h.appt, h.leave, h.brk, rules);
      return { h, waited: c.wait, paidMin: c.paidMin, owed: c.owed };
    });
}

/** "2026-11-12" in local time. */
function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A time, with "(+1 day)" when a stop ran past midnight. */
function timeOf(m: number | null | undefined): string {
  if (m == null) return '';
  return m >= 24 * 60 ? `${clock(m)} (+1 day)` : clock(m);
}

/** Quote a CSV field when it needs it (commas, quotes, newlines, or a leading = + - @ that spreadsheets run as a formula). */
export function csvField(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) || s !== String(v) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = [
  'Date',
  'Facility',
  'Load',
  'Appointment',
  'Arrived',
  'Left',
  'Break (min)',
  'Waited (min)',
  'BOL in',
  'BOL out',
  'Detention (min)',
  'Detention owed ($)',
];

export function historyCsv(history: LoggedStop[], rules: Rules): string {
  const lines = stopRows(history, rules).map(({ h, waited, paidMin, owed }) =>
    [
      isoDay(h.dayStart),
      h.place,
      h.load,
      timeOf(h.appt),
      timeOf(h.arrive),
      timeOf(h.leave),
      h.brk,
      Math.round(waited),
      timeOf(h.bolIn),
      timeOf(h.bolOut),
      Math.round(paidMin),
      owed.toFixed(2),
    ]
      .map(csvField)
      .join(','),
  );
  // CRLF and a byte-order mark so Excel opens it with the right characters.
  return '﻿' + [CSV_HEADER.join(','), ...lines].join('\r\n') + '\r\n';
}

/** Plain-text record, newest stop last, ready to paste into a message. */
export function historyText(history: LoggedStop[], rules: Rules, company: string | null): string {
  const rows = stopRows(history, rules);
  const total = rows.reduce((t, r) => t + r.owed, 0);
  const body = rows.map(({ h, waited, paidMin, owed }) => {
    const bol =
      h.bolIn != null || h.bolOut != null
        ? ` BOL: in ${h.bolIn != null ? clock(h.bolIn) : '?'}, out ${h.bolOut != null ? clock(h.bolOut) : '?'}.`
        : '';
    return (
      `${dayLabel(h.dayStart)} · ${h.place}${h.load ? ` · Load ${h.load}` : ''}\n` +
      `Arrived ${timeOf(h.arrive)}, left ${timeOf(h.leave)}, waited ${dur(waited)}.${bol}` +
      (owed > 0 ? ` ${dur(paidMin)} past free time: ${money(owed)}.` : ' Within free time.')
    );
  });
  return (
    `My detention record${company ? ` (${company})` : ''}\n` +
    `Rules: ${rulesLine(rules)}.\n\n` +
    body.join('\n\n') +
    `\n\n${rows.length} stop${rows.length === 1 ? '' : 's'}, ${money(total)} detention by these rules.\n` +
    `Times from my phone’s clock and location${rows.some((r) => r.h.bolIn != null || r.h.bolOut != null) ? ' and signed BOLs' : ''}.`
  );
}

/** "docket-stops-2026-11-14.csv" */
export const csvFileName = (now: number) => `docket-stops-${isoDay(now)}.csv`;
