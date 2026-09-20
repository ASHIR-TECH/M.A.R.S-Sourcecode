import * as Updates from 'expo-updates';

// Silent over-the-air update check, run on every cold launch.
//
// 1. Ask the configured channel's update server for a newer JS bundle.
// 2. Download it in the background (no UI — the cached bundle keeps rendering).
// 3. If it's genuinely new, reload the app once so this launch already shows
//    the updated build (native changes excluded: those ride on the installed
//    binary and are skipped by the fingerprint gate).
//
// It is intentionally quiet: failures (offline, server down, mismatched
// fingerprint) fall through to the current bundle.
export async function checkForUpdatesOnLaunch(): Promise<void> {
  if (!Updates.isEnabled || Updates.isEmergencyLaunch) return;

  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) {
      await Updates.reloadAsync();
    }
  } catch {
    // The current bundle keeps running until the next launch.
  }
}