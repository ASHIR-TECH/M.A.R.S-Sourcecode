/**
 * Feature flags.
 *
 * These are read from Expo public env vars, which are inlined into the JS
 * bundle at build time. That means they are *not* secrets, and flipping one
 * requires a rebuild — which is exactly what we want for something like
 * donations, where a half-enabled payment path is worse than a disabled one.
 */

function flag(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

/**
 * Donations require a verified Flutterwave account. Until then the donate
 * screen stays visible for layout purposes but the checkout cannot be opened,
 * so nobody can reach a payment sheet that is guaranteed to fail.
 *
 * Set EXPO_PUBLIC_DONATIONS_ENABLED=true in mobile/.env *and* add the real
 * Flutterwave public key before flipping this on.
 */
export const DONATIONS_ENABLED = flag(process.env.EXPO_PUBLIC_DONATIONS_ENABLED);
