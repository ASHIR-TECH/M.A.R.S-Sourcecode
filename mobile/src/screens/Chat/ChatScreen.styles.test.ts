import { chatBottomInset } from './ChatScreen.styles';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';
import { spacing } from '../../theme/spacing';

describe('chatBottomInset', () => {
  it('clears the tab bar while the keyboard is closed', () => {
    expect(chatBottomInset(false)).toBe(tabBarMetrics.height + spacing.xxl);
  });

  it('drops to zero so the composer sits flush on the keyboard', () => {
    expect(chatBottomInset(true)).toBe(0);
  });
});
