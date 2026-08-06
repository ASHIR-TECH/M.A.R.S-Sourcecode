import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TransferRow } from '@/components/TransferRow';
import type { Transfer } from '@/api/types';

const baseTransfer: Transfer = {
  id: 'tr-1',
  filename: 'report.xlsx',
  direction: 'sent',
  peer: 'a1b2c3d4e5f60708',
  size: 2048,
  status: 'Delivered',
  timestamp: new Date().toISOString(),
};

describe('TransferRow', () => {
  it('renders filename, peer, size and status', () => {
    const { getByText } = render(<TransferRow transfer={baseTransfer} />);
    expect(getByText('report.xlsx')).toBeTruthy();
    expect(getByText('Delivered')).toBeTruthy();
    expect(getByText(/2\.0 KB/)).toBeTruthy();
    expect(getByText(/Sent to a1b2c3d4/)).toBeTruthy();
  });

  it('renders "Received from" for incoming transfers', () => {
    const incoming: Transfer = { ...baseTransfer, direction: 'received' };
    const { getByText } = render(<TransferRow transfer={incoming} />);
    expect(getByText(/Received from a1b2c3d4/)).toBeTruthy();
  });

  it('invokes onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <TransferRow transfer={baseTransfer} onPress={onPress} />
    );
    fireEvent(getByTestId('transfer-row'), 'touchEnd');
    expect(onPress).toHaveBeenCalledWith(baseTransfer);
  });

  it('renders the correct direction badge label for the status', () => {
    const pending: Transfer = { ...baseTransfer, status: 'Pending' };
    const { getByText } = render(<TransferRow transfer={pending} />);
    expect(getByText('Pending')).toBeTruthy();
  });
});
