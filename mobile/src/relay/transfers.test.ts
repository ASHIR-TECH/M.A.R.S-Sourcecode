import { transfersFromToolCalls, mediaFromToolCalls } from './transfers';

describe('mediaFromToolCalls', () => {
  it('extracts a blob MediaRef from a completed ADTP tool result', () => {
    const media = mediaFromToolCalls([
      {
        id: 'call-media',
        name: 'generate_image',
        status: 'completed',
        result: JSON.stringify({
          media: {
            id: 'uuid-1',
            serviceUrl: 'https://relay.example',
            name: 'render.png',
            mimeType: 'image/png',
            size: 1000,
            compressedSize: 400,
            compressed: true,
            hasThumbnail: true,
            createdAt: '2026-11-20T00:00:00.000Z',
          },
        }),
      },
    ]);

    expect(media).toMatchObject({ id: 'uuid-1', name: 'render.png', hasThumbnail: true });
  });

  it('ignores failed calls and non-media results', () => {
    expect(
      mediaFromToolCalls([
        { id: 'c', name: 'generate_image', status: 'failed', result: JSON.stringify({ id: 'x', name: 'y' }) },
      ])
    ).toBeUndefined();
  });
});

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
