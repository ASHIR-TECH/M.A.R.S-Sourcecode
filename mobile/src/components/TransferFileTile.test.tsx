import React from 'react';
import { render } from '@testing-library/react-native';
import { TransferFileTile } from './TransferFileTile';

describe('TransferFileTile', () => {
  it('renders an outgoing tile with peer and size', () => {
    const { getByText } = render(
      <TransferFileTile
        transfer={{
          fileName: 'report.pdf',
          direction: 'outgoing',
          peerName: 'MARS-DEVICE',
          sizeBytes: 2516582,
        }}
      />
    );
    expect(getByText('report.pdf')).toBeTruthy();
    expect(getByText(/to \u00B7 MARS-DEVICE/)).toBeTruthy();
    expect(getByText(/2.4 MB/)).toBeTruthy();
  });

  it('renders an incoming tile', () => {
    const { getByText } = render(
      <TransferFileTile transfer={{ fileName: 'photos.zip', direction: 'incoming', peerName: 'WORK-LAPTOP' }} />
    );
    expect(getByText(/from \u00B7 WORK-LAPTOP/)).toBeTruthy();
  });
});