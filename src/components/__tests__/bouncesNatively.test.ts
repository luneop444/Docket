import { describe, expect, it } from '@jest/globals';
import { bouncesNatively } from '../useRubberBand.web';

const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';
describe('bouncesNatively', () => {
  it('leaves current browsers to their own bounce', () => {
    expect(bouncesNatively(`${mac} Chrome/150.0.0.0 Safari/537.36`)).toBe(true);
    expect(bouncesNatively(`${mac} Chrome/150.0.0.0 Safari/537.36 Edg/150.0.0.0`)).toBe(true);
    expect(bouncesNatively('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0')).toBe(true);
    expect(bouncesNatively(`${mac} Version/19.0 Safari/605.1.15`)).toBe(true);
  });
  it('fakes it only in Chromium before 145', () => {
    expect(bouncesNatively(`${mac} Chrome/140.0.0.0 Safari/537.36`)).toBe(false);
  });
});
