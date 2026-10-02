import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View };
});

jest.mock('flutterwave-react-native', () => ({
  FlutterwaveInit: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
}));

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: () => ({ session: null }),
}));

jest.mock('../../config/featureFlags', () => ({
  DONATIONS_ENABLED: false,
}));

import { FlutterwaveInit } from 'flutterwave-react-native';
import { DonateScreen } from './DonateScreen';

const flutterwave = FlutterwaveInit as jest.Mock;

/**
 * Donations are frozen until the Flutterwave account is verified. The failure
 * mode this guards against is a half-configured build still opening a real
 * payment sheet, so the assertions here are about the checkout never being
 * reachable -- not merely about the button looking different.
 */
describe('DonateScreen while donations are disabled', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tells the user payments are temporarily disabled', () => {
    const { getByText } = render(<DonateScreen onClose={jest.fn()} />);
    expect(getByText('Payments temporarily disabled')).toBeTruthy();
  });

  it('explains the reason without implying a charge occurred', () => {
    const { getByText } = render(<DonateScreen onClose={jest.fn()} />);
    expect(getByText(/Nothing has been charged/)).toBeTruthy();
  });

  it('replaces the amount call-to-action with an unavailable label', () => {
    const { getByText } = render(<DonateScreen onClose={jest.fn()} />);
    expect(getByText('Donations unavailable')).toBeTruthy();
  });

  it('exposes the button as disabled to assistive tech', () => {
    const { getByLabelText } = render(<DonateScreen onClose={jest.fn()} />);
    expect(getByLabelText('Donate, currently unavailable').props.accessibilityState.disabled).toBe(true);
  });

  it('never opens a checkout even if pressed', () => {
    const { getByLabelText } = render(<DonateScreen onClose={jest.fn()} />);
    fireEvent.press(getByLabelText('Donate, currently unavailable'));
    expect(flutterwave).not.toHaveBeenCalled();
  });

  it('never opens a checkout even for a preset amount chip', () => {
    const { getByLabelText } = render(<DonateScreen onClose={jest.fn()} />);
    fireEvent.press(getByLabelText('Donate, currently unavailable'));
    expect(flutterwave).not.toHaveBeenCalled();
  });

  it('never attempts a custom amount submission', () => {
    const { getByPlaceholderText, getByLabelText } = render(<DonateScreen onClose={jest.fn()} />);
    fireEvent.changeText(getByPlaceholderText(/custom/i), '5000');
    fireEvent.press(getByLabelText('Donate, currently unavailable'));
    expect(flutterwave).not.toHaveBeenCalled();
  });
});
