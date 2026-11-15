import { describe, expect, it } from '@jest/globals';

import { noWidow } from '../text';

const NB = '\u00A0';

describe('noWidow', () => {
  it('joins the last two words of a sentence', () => {
    expect(noWidow('Schneider National’s detention rules')).toBe(`Schneider National’s detention${NB}rules`);
  });

  it('leaves two-word text free to wrap', () => {
    expect(noWidow('Swift Transportation')).toBe('Swift Transportation');
  });

  it('works across pieces, ending on an interpolated value', () => {
    expect(noWidow(['Stop logged for load ', 48262])).toEqual([`Stop logged for load${NB}`, 48262]);
  });

  it('ignores trailing spaces and keeps punctuation with its word', () => {
    expect(noWidow('Start the clock? ')).toBe(`Start the${NB}clock? `);
  });

  it('treats an element as a word', () => {
    const el = { type: 'b' };
    expect(noWidow(['Tap ', el])).toEqual(['Tap ', el]);
    expect(noWidow(['Now tap ', el])).toEqual([`Now tap${NB}`, el]);
  });
});
