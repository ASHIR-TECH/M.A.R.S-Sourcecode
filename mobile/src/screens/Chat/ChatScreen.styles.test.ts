import { chatBottomInset } from './ChatScreen.styles';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';

describe('chatBottomInset', () => {
  it('clears the tab bar while the keyboard is closed', () => {
    expect(chatBottomInset(false)).toBe(tabBarMetrics.height + 24);
  });

  it('drops to a small gap so the composer sits directly on the keyboard', () => {
    expect(chatBottomInset(true)).toBeLessThan(tabBarMetrics.height);
  });

  it('always leaves some breathing room under the composer', () => {
    expect(chatBottomInset(true)).toBeGreaterThan(0);
  });
});
