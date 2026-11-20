import { describe, expect, it } from '@jest/globals';
import { bouncesNatively } from '../useRubberBand.web';

const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';
const win = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)';
describe('bouncesNatively', () => {
  it('leaves Mac browsers that bounce nested scroll areas to their own bounce', () => {
    expect(bouncesNatively(`${mac} Chrome/150.0.0.0 Safari/537.36`)).toBe(true);
    expect(bouncesNatively('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0')).toBe(true);
    expect(bouncesNatively(`${mac} Version/19.0 Safari/605.1.15`)).toBe(true);
  });
  it('runs on Windows Chrome, which does not bounce them (Chrome 158 checked)', () => {
    expect(bouncesNatively(`${win} Chrome/158.0.0.0 Safari/537.36`)).toBe(false);
    expect(bouncesNatively(`${win} Chrome/158.0.0.0 Safari/537.36 Edg/158.0.0.0`)).toBe(false);
  });
  it('runs in Chromium before 145 on a Mac', () => {
    expect(bouncesNatively(`${mac} Chrome/140.0.0.0 Safari/537.36`)).toBe(false);
  });
});
