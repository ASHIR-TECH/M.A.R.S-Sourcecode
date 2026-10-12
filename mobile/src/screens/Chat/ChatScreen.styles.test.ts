import { chatBottomInset } from './ChatScreen.styles';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';

describe('chatBottomInset', () => {
  it('clears the tab bar so the composer is never covered by the bar', () => {
    expect(chatBottomInset).toBe(tabBarMetrics.height + 24);
  });

  it('leaves breathing room under the composer', () => {
    expect(chatBottomInset).toBeGreaterThan(tabBarMetrics.height);
  });
});
