import { describe, expect, it } from '@jest/globals';
import { freshState, parseState } from '../state';

describe('per-week paycheck state', () => {
  it('starts with nothing sent and no answers', () => {
    const s = freshState();
    expect(s.sent).toEqual({});
    expect(s.anon).toEqual({});
  });

  it('opens a phone saved with the old single sent flag and answer', () => {
    const old = { ...freshState(), sent: true, anon: 'Paid' };
    const s = parseState(JSON.stringify(old));
    expect(s.sent).toEqual({});
    expect(s.anon).toEqual({});
  });

  it('keeps per-week values as saved', () => {
    const saved = { ...freshState(), sent: { '123': true }, anon: { '123': 'Partly' } };
    const s = parseState(JSON.stringify(saved));
    expect(s.sent).toEqual({ '123': true });
    expect(s.anon).toEqual({ '123': 'Partly' });
  });
});
