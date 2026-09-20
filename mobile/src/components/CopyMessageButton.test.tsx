import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { CopyMessageButton } from './CopyMessageButton';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
}));

describe('CopyMessageButton', () => {
  it('copies the reply text and shows feedback', async () => {
    const { getByTestId, getByText } = render(<CopyMessageButton text="hello world" />);

    await act(async () => {
      fireEvent.press(getByTestId('copy-message-button'));
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('hello world');
    expect(getByText('Copied')).toBeTruthy();
  });
});
