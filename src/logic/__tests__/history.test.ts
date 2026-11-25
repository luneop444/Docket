import { describe, expect, it } from '@jest/globals';
import { defaultRules } from '../detention';
import { dayLabel, payWeeks, toLogged, upsert, weekLabel, weekStart, type LoggedStop } from '../history';
import { loadNo } from '../sampleData';
import { claimText, weekTotals } from '../settlement';
import { freshStop, startLiveStop } from '../stop';

const at = (month: number, day: number, h = 9, m = 0) => new Date(2026, month, day, h, m).getTime();

function logged(ms: number, waitMin: number, place = 'Walmart DC 6094', load = '77120'): LoggedStop {
  const st = startLiveStop(ms, 0);
  return toLogged({ ...st, phase: 'logged', appt: st.arrive!, leave: st.arrive! + waitMin }, place, load)!;
}

describe('weeks', () => {
  it('start on Monday', () => {
    // Thu Nov 12 2026 → Mon Nov 9; Sun Nov 15 still belongs to Nov 9; Mon Nov 16 starts a new week.
    expect(weekStart(at(10, 12))).toBe(at(10, 9, 0));
    expect(weekStart(at(10, 15, 23))).toBe(at(10, 9, 0));
    expect(weekStart(at(10, 16, 1))).toBe(at(10, 16, 0));
    expect(weekLabel(at(10, 9, 0))).toBe('Week of Nov 9');
    expect(dayLabel(at(10, 12))).toBe('Thu Nov 12');
  });
});

describe('toLogged', () => {
  it('keeps only finished live stops', () => {
    expect(toLogged(freshStop(), 'X', '')).toBeNull();
    const st = startLiveStop(at(10, 12, 14), 14 * 60);
    expect(toLogged(st, 'X', '')).toBeNull(); // still at the dock
    const e = toLogged({ ...st, leave: 17 * 60, phase: 'logged' }, 'Walmart', '9')!;
    expect(e).toMatchObject({ id: String(at(10, 12, 14)), place: 'Walmart', load: '9', arrive: 14 * 60, leave: 17 * 60 });
  });

  it('upserts by id, newest first', () => {
    const a = logged(at(10, 10), 60);
    const b = logged(at(10, 12), 60);
    const h = upsert(upsert([], a), b);
    expect(h.map((x) => x.id)).toEqual([b.id, a.id]);
    const fixed = { ...a, leave: a.leave + 30 };
    expect(upsert(h, fixed)).toEqual([b, fixed]);
  });
});

describe('payWeeks', () => {
  it('has no weeks until something is logged (no made-up week)', () => {
    expect(payWeeks([])).toEqual([]);
  });

  it('groups logged stops into weeks, newest week first, oldest stop first', () => {
    const h = [logged(at(10, 12), 200), logged(at(10, 10), 90), logged(at(10, 3), 300)].reduce(upsert, [] as LoggedStop[]);
    const weeks = payWeeks(h);
    expect(weeks.map((w) => w.label)).toEqual(['Week of Nov 9', 'Week of Nov 2']);
    expect(weeks[0].loads.map((l) => l.day)).toEqual(['Tue Nov 10', 'Thu Nov 12']);
  });

  it('feeds the settlement check and the message', () => {
    const e = logged(at(10, 12), 200); // 2h free, 80m paid at $30/hr = $40
    const [w] = payWeeks([e]);
    const t = weekTotals(w.loads, defaultRules, { [e.id]: { m: 'none' } });
    expect(t.expected).toBeCloseTo(40);
    expect(t.short).toBeCloseTo(40);
    const msg = claimText(t, defaultRules, w.label);
    expect(msg).toContain('week of Nov 9');
    expect(msg).toContain('Load 77120, Walmart DC 6094 (Thu Nov 12)');
  });

  it('leaves out the load number when none was entered', () => {
    const [w] = payWeeks([logged(at(10, 12), 200, 'Acme', '')]);
    expect(loadNo(w.loads[0])).toBe('');
    const t = weekTotals(w.loads, defaultRules, { [w.loads[0].id]: { m: 'none' } });
    expect(claimText(t, defaultRules, w.label)).toContain(':\n\nAcme (Thu Nov 12)');
  });
});
