import { listSessions, listTransfers, listWatchers, uploadFile } from './transferClient';
import { DesktopConnection } from './types';

const conn: DesktopConnection = { baseUrl: 'https://desk.test', token: 'tok' };

describe('transferClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  it('normalizes snake_case transfers wrapped under a key', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        transfers: [
          {
            id: 'tr-1',
            file_name: 'report.pdf',
            size_bytes: 2516582,
            direction: 'outgoing',
            status: 'completed',
            peer_id: 'MARS-DEVICE',
            peer_name: 'MARS-DEVICE',
            completed_at: '2026-09-18T10:00:00Z',
            progress: 1,
          },
        ],
      }),
    });

    const transfers = await listTransfers(conn);
    expect(transfers).toEqual([
      {
        id: 'tr-1',
        fileName: 'report.pdf',
        sizeBytes: 2516582,
        direction: 'outgoing',
        status: 'completed',
        peerId: 'MARS-DEVICE',
        peerName: 'MARS-DEVICE',
        startedAt: undefined,
        completedAt: '2026-09-18T10:00:00Z',
        progress: 1,
      },
    ]);
    expect((fetch as jest.Mock).mock.calls[0][0]).toBe('https://desk.test/api/v1/transfers');
  });

  it('accepts a bare top-level array and clamps progress', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => [
        { id: 'a', fileName: 'x.bin', direction: 'incoming', status: 'transferring', progress: 7 },
      ],
    });

    const transfers = await listTransfers(conn);
    expect(transfers[0].direction).toBe('incoming');
    expect(transfers[0].status).toBe('transferring');
    expect(transfers[0].progress).toBe(1);
  });

  it('normalizes camelCase sessions', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        sessions: [
          {
            id: 's1',
            peerId: 'WORK-LAPTOP',
            peerName: 'WORK-LAPTOP',
            connectedAt: '2026-09-18T09:00:00Z',
            transferCount: 3,
            bytesTransferred: 7340032,
          },
        ],
      }),
    });

    const sessions = await listSessions(conn);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      peerId: 'WORK-LAPTOP',
      peerName: 'WORK-LAPTOP',
      transferCount: 3,
      bytesTransferred: 7340032,
    });
    expect((fetch as jest.Mock).mock.calls[0][0]).toBe('https://desk.test/api/v1/sessions');
  });

  it('maps 401 to an auth error', async () => {
    (fetch as jest.Mock).mockResolvedValue({ status: 401, ok: false, json: async () => ({}) });

    await expect(listWatchers(conn)).rejects.toMatchObject({ kind: 'auth', status: 401 });
  });

  it('drops records without a path from watchers', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ watchers: [{ path: '/inbox', enabled: true }, { peer_id: 'X' }] }),
    });

    const watchers = await listWatchers(conn);
    expect(watchers).toEqual([{ path: '/inbox', peerId: undefined, peerName: undefined, active: true }]);
  });

  describe('uploadFile', () => {
    it('POSTs multipart and returns the desktop path the agent can use', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        status: 201,
        ok: true,
        json: async () => ({
          id: 'up-1',
          filename: 'briefing.txt',
          path: '/home/u/.local/share/adtp/intake/briefing.txt',
          size: 42,
          sha256: 'abc',
        }),
      });

      const uploaded = await uploadFile(conn, {
        uri: 'file:///tmp/briefing.txt',
        name: 'briefing.txt',
        mimeType: 'text/plain',
      });

      expect(uploaded).toEqual({
        id: 'up-1',
        filename: 'briefing.txt',
        path: '/home/u/.local/share/adtp/intake/briefing.txt',
        size: 42,
        sha256: 'abc',
      });

      const [url, init] = (fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://desk.test/api/v1/transfers/upload');
      expect(init.method).toBe('POST');
      // Multipart must NOT set a Content-Type — fetch adds the boundary itself.
      expect(init.headers).toEqual({ Authorization: 'Bearer tok' });
      expect(init.body).toBeInstanceOf(FormData);
    });

    it('maps 401 to an auth error', async () => {
      (fetch as jest.Mock).mockResolvedValue({ status: 401, ok: false, json: async () => ({}) });

      await expect(
        uploadFile(conn, { uri: 'file:///tmp/a.txt', name: 'a.txt' })
      ).rejects.toMatchObject({ kind: 'auth', status: 401 });
    });

    it('fails when the desktop does not report a path', async () => {
      (fetch as jest.Mock).mockResolvedValue({ status: 201, ok: true, json: async () => ({}) });

      await expect(
        uploadFile(conn, { uri: 'file:///tmp/a.txt', name: 'a.txt' })
      ).rejects.toMatchObject({ kind: 'server' });
    });
  });
});