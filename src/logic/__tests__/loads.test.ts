import { describe, expect, it } from '@jest/globals';
import { parseClock } from '../format';
import { placeOf, shortName, type ActiveLoad } from '../state';

describe('parseClock', () => {
  it.each([
    ['7:30 AM', 450],
    ['7:30a', 450],
    ['730pm', 1170],
    ['7 pm', 1140],
    ['12:00 am', 0],
    ['12 pm', 720],
    ['19:30', 1170],
    ['1930', 1170],
    ['0600', 360],
    [' 6:05 p.m. ', 1085],
  ])('%s → %d', (s, m) => expect(parseClock(s)).toBe(m));

  it.each(['', 'noon', '25:00', '13 pm', '7:75', '0 am'])('rejects %p', (s) => expect(parseClock(s)).toBeNull());
});

describe('placeOf', () => {
  const load = (name: string, number = '9911'): ActiveLoad => ({
    number,
    source: 'manual',
    recurring: false,
    stops: [
      { name: 'Somewhere', kind: 'Pickup', at: 360 },
      { name, kind: 'Drop', at: 840 },
    ],
  });

  it('uses the drop the driver typed in', () => {
    expect(placeOf(load('Walmart DC 6094'))).toEqual({ name: 'Walmart DC 6094', short: 'Walmart DC 6094', load: '9911', typical: null });
    expect(placeOf(load('Lehigh Grocery DC')).short).toBe('Lehigh Grocery');
  });

  it('has no made-up wait data, and no made-up facility without a load', () => {
    expect(placeOf(load('Harbor Foods DC')).typical).toBeNull();
    expect(placeOf(null).name).toBe('Your stop');
  });

  it('shortens names', () => {
    expect(shortName('Acme Distribution Center')).toBe('Acme');
    expect(shortName('DC')).toBe('DC');
  });
});
