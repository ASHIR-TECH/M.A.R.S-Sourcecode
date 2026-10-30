import { fetchSystemInfo, normalizeSystemInfo } from './systemClient';
import { DesktopConnection } from './types';

const conn: DesktopConnection = { baseUrl: 'http://desk.test:40003', token: 'tok' };

describe('normalizeSystemInfo', () => {
  it('maps snake_case gateway fields (simplified)', () => {
    const info = normalizeSystemInfo({
      hostname: 'ZEUS',
      os: 'Linux',
      cpu_percent: 12.5,
      ram_percent: 50,
    });

    expect(info).toMatchObject({
      hostname: 'ZEUS',
      os: 'Linux',
      cpuPercent: 12.5,
      ramPercent: 50,
    });
  });

  it('tolerates camelCase and stringy numbers', () => {
    const info = normalizeSystemInfo({ cpuPercent: '7.5', ramPercent: '50' });
    expect(info.cpuPercent).toBe(7.5);
    expect(info.ramPercent).toBe(50);
  });

  it('maps optional battery telemetry without assuming every desktop has one', () => {
    const info = normalizeSystemInfo({ battery: { present: true, percent: '87.5', charging: true } });
    expect(info).toMatchObject({ batteryPresent: true, batteryPercent: 87.5, batteryCharging: true });
  });

  it('leaves absent metrics undefined rather than zero', () => {
    const info = normalizeSystemInfo({ hostname: 'X' });
    expect(info.hostname).toBe('X');
    expect(info.cpuPercent).toBeUndefined();
    expect(info.ramPercent).toBeUndefined();
  });
});

describe('fetchSystemInfo', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => jest.clearAllMocks());

  it('GETs the system endpoint with the bearer token', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ hostname: 'ZEUS', os: 'Linux' }),
    });

    const info = await fetchSystemInfo(conn);
    expect(info.hostname).toBe('ZEUS');

    const [url, init] = (fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://desk.test:40003/api/v1/system/info');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('maps 401 to an auth error', async () => {
    (fetch as jest.Mock).mockResolvedValue({ status: 401, ok: false, json: async () => ({}) });
    await expect(fetchSystemInfo(conn)).rejects.toMatchObject({ kind: 'auth', status: 401 });
  });
});
