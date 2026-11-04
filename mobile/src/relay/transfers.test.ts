import { transfersFromToolCalls } from './transfers';

describe('transfersFromToolCalls', () => {
  it('renders a completed send_file as an outgoing tile', () => {
    const transfers = transfersFromToolCalls([
      {
        id: 'call-1',
        name: 'send_file',
        status: 'completed',
        params: { file_path: '/home/me/report.pdf', peer_id: 'peer-42', size_bytes: 1024 },
        result: 'Sent report.pdf',
      },
    ]);

    expect(transfers).toEqual([
      {
        fileName: 'report.pdf',
        direction: 'outgoing',
        peerName: 'peer-42',
        sizeBytes: 1024,
        result: 'Sent report.pdf',
      },
    ]);
  });

  it('lifts send_file_to_device JSON into a downloadable incoming tile', () => {
    const transfers = transfersFromToolCalls([
      {
        id: 'call-2',
        name: 'send_file_to_device',
        status: 'completed',
        params: { file_path: '/home/me/image.json' },
        result: JSON.stringify({
          status: 'queued',
          device_file_id: 'file-abc',
          device_id: 'phone-1',
          filename: 'image.json',
          size_bytes: 2048,
          mime_type: 'application/json',
          message: 'Queued image.json',
        }),
      },
    ]);

    expect(transfers).toEqual([
      {
        fileName: 'image.json',
        direction: 'incoming',
        peerName: 'Desktop',
        sizeBytes: 2048,
        deviceFileId: 'file-abc',
        deviceId: 'phone-1',
        mimeType: 'application/json',
      },
    ]);
  });

  it('still names the file when a device send has no structured result', () => {
    const transfers = transfersFromToolCalls([
      {
        name: 'send_file_to_device',
        status: 'completed',
        params: { file_path: '/home/me/Pictures/photo.png' },
        result: 'Queued photo.png',
      },
    ]);

    expect(transfers[0]).toMatchObject({
      fileName: 'photo.png',
      direction: 'incoming',
      peerName: 'Desktop',
    });
  });

  it('ignores failed and unrelated tool calls', () => {
    const transfers = transfersFromToolCalls([
      { name: 'send_file', status: 'failed', params: { file_path: '/a.txt' } },
      { name: 'list_peers', status: 'completed', result: '...' },
    ]);

    expect(transfers).toEqual([]);
  });
});
