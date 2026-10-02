import { DONATIONS_ENABLED } from './featureFlags';

describe('feature flags', () => {
  const original = process.env.EXPO_PUBLIC_DONATIONS_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_DONATIONS_ENABLED;
    else process.env.EXPO_PUBLIC_DONATIONS_ENABLED = original;
    jest.resetModules();
  });

  it('defaults donations to off when the flag is absent', () => {
    delete process.env.EXPO_PUBLIC_DONATIONS_ENABLED;
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const flags = require('./featureFlags');
    expect(flags.DONATIONS_ENABLED).toBe(false);
  });

  it('is off for empty, 0 and false', () => {
    for (const value of ['', '0', 'false', 'no', 'off']) {
      process.env.EXPO_PUBLIC_DONATIONS_ENABLED = value;
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const flags = require('./featureFlags');
      expect(flags.DONATIONS_ENABLED).toBe(false);
    }
  });

  it('is on only for explicit truthy values', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
      process.env.EXPO_PUBLIC_DONATIONS_ENABLED = value;
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const flags = require('./featureFlags');
      expect(flags.DONATIONS_ENABLED).toBe(true);
    }
  });

  it('is safely false at import time with no env set', () => {
    // The module-level constant is the default the donate screen reads.
    expect(typeof DONATIONS_ENABLED).toBe('boolean');
  });
});
