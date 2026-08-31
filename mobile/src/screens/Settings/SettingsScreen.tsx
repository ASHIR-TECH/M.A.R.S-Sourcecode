import React from 'react';
import { ProfileScreen } from '../Profile/ProfileScreen';

/**
 * Settings tab currently hosts the Profile screen (Phase 7). The full
 * Settings surface is Phase 10 and will reuse ProfileScreen's primitives
 * (SettingsRow / SettingsSection).
 */
export function SettingsScreen() {
  return <ProfileScreen />;
}
