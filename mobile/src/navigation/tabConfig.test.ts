// ProfileScreen transitively imports the auth store chain, which constructs a
// real Supabase client and runs a module-level makeRedirectUri side effect that
// fails under jest without an expo manifest — mock it (see SignInScreen.test).
jest.mock('../auth/supabaseClient', () => ({
  isSupabaseConfigured: () => false,
  requireSupabase: () => {
    throw new Error('Supabase is not configured in this test.');
  },
}));
jest.mock('../auth/oauthSignIn', () => ({
  signInWithOAuthProvider: jest.fn(),
  oauthRedirectUri: () => 'mars://auth',
  completeOAuthFromUrl: jest.fn(),
}));

import { TAB_CONFIG } from './tabConfig';

describe('TAB_CONFIG', () => {
  it('has exactly 4 tabs', () => {
    expect(TAB_CONFIG).toHaveLength(4);
  });

  it('has unique tab names', () => {
    const names = TAB_CONFIG.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every tab has an icon and a component defined', () => {
    TAB_CONFIG.forEach((tab) => {
      expect(tab.icon).toBeDefined();
      expect(tab.component).toBeDefined();
    });
  });

  it('matches the expected order: Home, Chat, Devices, Settings', () => {
    expect(TAB_CONFIG.map((t) => t.name)).toEqual(['Home', 'Chat', 'Devices', 'Settings']);
  });

  it('uses a unique icon per tab', () => {
    const icons = TAB_CONFIG.map((t) => t.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});