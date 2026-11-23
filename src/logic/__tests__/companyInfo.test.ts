import { describe, expect, it } from '@jest/globals';
import { findCompany, hasEnoughReports, initials, isRealCarrier, noStatsNote, REAL_CARRIERS, recruiterText, rulesRows, showsStats } from '../companyInfo';
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
});
