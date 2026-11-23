import { describe, expect, it } from '@jest/globals';
import { avgMinutes, findCompany, sortBoard, hasEnoughReports, headline, initials, otherStats, payLine, isRealCarrier, noStatsNote, REAL_CARRIERS, recruiterText, rulesRows, showsStats } from '../companyInfo';
import { COMPANIES, MIN_REPORTS, SAMPLE_BOARD } from '../sampleData';

describe('companyInfo', () => {
  it('finds board companies and real carriers, and nothing for unknown names', () => {
    expect(findCompany(SAMPLE_BOARD[0].name)).toBe(SAMPLE_BOARD[0]);
    expect(findCompany(COMPANIES[0].name)?.name).toBe(COMPANIES[0].name);
    expect(findCompany('Nobody Freight')).toBeNull();
    expect(findCompany(undefined)).toBeNull();
  });
  it('hides stats below the report threshold', () => {
    expect(hasEnoughReports({ reported: MIN_REPORTS })).toBe(true);
    expect(hasEnoughReports({ reported: MIN_REPORTS - 1 })).toBe(false);
  });
  it('puts the reported rules into words and questions', () => {
    const c = { ...SAMPLE_BOARD[0], name: 'Test Co', rules: { free: 120, start: 'appt' as const, rate: 20, breaksCount: false } };
    expect(rulesRows(c)).toEqual([
      ['Free time', '2h 00m'],
      ['Clock starts at', 'Appointment time'],
      ['Pay after free time', '$20.00 an hour'],
    ]);
    const text = recruiterText(c);
    expect(text.split('\n')[0]).toBe('Questions for Test Co about detention pay:');
    expect(text).toContain('2h 00m of free time, counted from my appointment time');
    expect(text).toContain('$20.00 an hour');
  });
  it('never shows made-up stats on a real carrier', () => {
    expect(REAL_CARRIERS.map((c) => c.name)).toContain('Swift Transportation');
    expect(REAL_CARRIERS.length).toBe(6);
    for (const c of REAL_CARRIERS) {
      expect(isRealCarrier(c.name)).toBe(true);
      expect(showsStats({ ...c, reported: 10_000 })).toBe(false);
      expect(noStatsNote(c)).toContain('report through Docket');
    }
    const board = SAMPLE_BOARD.find(hasEnoughReports)!;
    expect(isRealCarrier(board.name)).toBe(false);
    expect(showsStats(board)).toBe(true);
    const few = SAMPLE_BOARD.find((c) => !hasEnoughReports(c))!;
    expect(showsStats(few)).toBe(false);
    expect(noStatsNote(few)).toContain(`of ${MIN_REPORTS}`);
  });
  it('makes two-letter tiles', () => {
    expect(initials('Ridgeline Freight')).toBe('RF');
    expect(initials('Small Fleet Co.')).toBe('SF');
    expect(initials('Prairie Line Logistics')).toBe('PL');
    expect(initials('Acme')).toBe('A');
  });
  it('leads each row with the figure the list is sorted by', () => {
    const c = { ...SAMPLE_BOARD[0], avg: '1h 44m', past: 21, paid: 64, rules: { free: 120, start: 'appt' as const, rate: 20, breaksCount: false } };
    expect(payLine(c)).toBe('$20/hr after 2h free');
    expect(headline(c, 'wait')).toEqual({ value: '1h 44m', label: 'average wait' });
    expect(headline(c, 'paid')).toEqual({ value: '64%', label: 'say it was paid' });
    expect(otherStats(c, 'wait')).toBe('64% paid · 21% past free time');
    expect(otherStats(c, 'paid')).toBe('1h 44m wait · 21% past free time');
  });
  it('sorts by the real wait, not just the hours', () => {
    expect(avgMinutes('1h 44m')).toBe(104);
    expect(avgMinutes('2h 05m')).toBe(125);
    expect(avgMinutes('45m')).toBe(45);
    const waits = sortBoard(SAMPLE_BOARD, 'wait').filter(showsStats).map((c) => avgMinutes(c.avg));
    expect(waits).toEqual([...waits].sort((a, b) => a - b));
    const paid = sortBoard(SAMPLE_BOARD, 'paid').filter(showsStats).map((c) => c.paid);
    expect(paid).toEqual([...paid].sort((a, b) => b - a));
    expect(showsStats(sortBoard(SAMPLE_BOARD, 'wait').at(-1)!)).toBe(false);
  });
});
