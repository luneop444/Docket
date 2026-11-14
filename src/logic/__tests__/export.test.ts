import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { csvField, csvFileName, historyCsv, historyText, stopRows } from '../export';
import type { LoggedStop } from '../history';

const day = (d: number) => new Date(2026, 10, d).getTime();
const stop = (over: Partial<LoggedStop>): LoggedStop => ({
  id: String(over.dayStart ?? day(12)) + (over.arrive ?? 0),
  place: 'Walmart DC 6094',
  load: '77120',
  dayStart: day(12),
  arrive: 13 * 60 + 48,
  appt: 14 * 60,
  leave: 17 * 60 + 8, // 3h 20m: 2h free (from arrival) + 80 min paid = $40
  brk: 0,
  bol: false,
  ...over,
});

const rules = { ...defaultRules, start: 'arrival' as const };

describe('csvField', () => {
  it('quotes only when needed', () => {
    expect(csvField('Harbor Foods DC')).toBe('Harbor Foods DC');
    expect(csvField('Acme, Inc.')).toBe('"Acme, Inc."');
    expect(csvField('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvField(42)).toBe('42');
  });

  it('stops spreadsheets running a name as a formula', () => {
    expect(csvField('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvField('+1 dock')).toBe(`"'+1 dock"`);
  });
});

describe('historyCsv', () => {
  it('writes one row per stop, oldest first, with the money from the rules', () => {
    const csv = historyCsv([stop({}), stop({ dayStart: day(10), place: 'Acme, Inc.', load: '', bolIn: 13 * 60 + 50, bolOut: 15 * 60, leave: 15 * 60 + 2 })], rules);
    expect(csv.startsWith('﻿Date,Facility,Load,')).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-11-10,"Acme, Inc.",,2:00 PM,1:48 PM,3:02 PM,0,74,1:50 PM,3:00 PM,0,0.00');
    expect(lines[2]).toBe('2026-11-12,Walmart DC 6094,77120,2:00 PM,1:48 PM,5:08 PM,0,200,,,80,40.00');
  });

  it('marks times past midnight', () => {
    const csv = historyCsv([stop({ arrive: 23 * 60, appt: 23 * 60, leave: 24 * 60 + 30 })], rules);
    expect(csv).toContain('12:30 AM (+1 day)');
  });
});

describe('historyText', () => {
  it('reads like a record a fleet manager can check', () => {
    const t = historyText([stop({ bolIn: 13 * 60 + 52, bolOut: 17 * 60 + 5 })], rules, 'Swift Transportation');
    expect(t).toContain('My detention record (Swift Transportation)');
    expect(t).toContain('Thu Nov 12 · Walmart DC 6094 · Load 77120');
    expect(t).toContain('Arrived 1:48 PM, left 5:08 PM, waited 3h 20m. BOL: in 1:52 PM, out 5:05 PM. 1h 20m past free time: $40.00.');
    expect(t).toContain('1 stop, $40.00 detention by these rules.');
    expect(t).toContain('and signed BOLs');
  });

  it('says when a stop stayed within free time', () => {
    expect(historyText([stop({ leave: 14 * 60 })], rules, null)).toContain('Within free time.');
  });
});

it('sorts rows and names the file', () => {
  expect(stopRows([stop({}), stop({ dayStart: day(3) })], rules).map((r) => r.h.dayStart)).toEqual([day(3), day(12)]);
  expect(csvFileName(day(14))).toBe('docket-stops-2026-11-14.csv');
});
