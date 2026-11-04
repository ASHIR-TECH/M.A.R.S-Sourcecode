import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useDesktopStore } from '../store/useDesktopStore';
import { TransferFileTile } from './TransferFileTile';

describe('TransferFileTile', () => {
  afterEach(() => {
    act(() => {
      useDesktopStore.setState({ connection: null });
    });
  });

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

  it('offers a download action for AI files staged in the phone inbox', () => {
    act(() => {
      useDesktopStore.setState({
        connection: { baseUrl: 'http://desk.test:40003', token: 'token' },
      });
    });
    const { getByText, getByLabelText } = render(
      <TransferFileTile
        transfer={{
          fileName: 'image.json',
          direction: 'incoming',
          peerName: 'Desktop',
          deviceFileId: 'file-abc',
          mimeType: 'application/json',
          sizeBytes: 2048,
        }}
      />
    );

    expect(getByText('Download')).toBeTruthy();
    expect(getByText(/tap to download/)).toBeTruthy();
    expect(getByLabelText('Download image.json')).toBeTruthy();
  });
});