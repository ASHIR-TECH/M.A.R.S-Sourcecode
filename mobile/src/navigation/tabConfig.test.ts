// SettingsNow-hosted ProfileScreen transitively imports the auth store chain,
// whose provider modules run a module-level makeRedirectUri side effect that
// fails under jest without an expo manifest — mock them (see SignInScreen.test).
jest.mock('../auth/googleAuthProvider', () => ({
  googleAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../auth/githubAuthProvider', () => ({
  githubAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../auth/sessionStorage', () => ({
  sessionStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
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