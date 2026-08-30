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