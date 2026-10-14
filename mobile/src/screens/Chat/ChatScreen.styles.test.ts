import { chatBottomInset } from './ChatScreen.styles';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';
import { spacing } from '../../theme/spacing';

describe('chatBottomInset', () => {
  it('clears the tab bar plus breathing room while the keyboard is closed', () => {
    expect(chatBottomInset).toBe(tabBarMetrics.height + spacing.xxl);
  });

  it('is a positive clearance the keyboard height can be added on top of', () => {
    expect(chatBottomInset).toBeGreaterThan(tabBarMetrics.height);
  });
});
