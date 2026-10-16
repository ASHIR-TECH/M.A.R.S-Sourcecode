import { fetchSystemInfo, normalizeSystemInfo } from './systemClient';
import { DesktopConnection } from './types';

const conn: DesktopConnection = { baseUrl: 'http://desk.test:40003', token: 'tok' };

describe('normalizeSystemInfo', () => {
  it('maps snake_case gateway fields and the nested agent block', () => {
    const info = normalizeSystemInfo({
      hostname: 'ZEUS',
      os: 'Linux',
      os_version: '6.8.0 arch',
      arch: 'x86_64',
      cpu_count: 8,
      cpu_percent: 12.5,
      ram_total: 17179869184,
      ram_used: 8589934592,
      ram_percent: 50,
      disk_percent: 55.1,
      uptime_seconds: 7200,
      primary_ip: '192.168.1.10',
      intake_dir: '/home/u/.local/share/adtp/intake',
      agent: { active: true, provider: 'ollama', model: 'llama3' },
    });

    expect(info).toMatchObject({
      hostname: 'ZEUS',
      os: 'Linux',
      osVersion: '6.8.0 arch',
      arch: 'x86_64',
      cpuCount: 8,
      cpuPercent: 12.5,
      ramPercent: 50,
      diskPercent: 55.1,
      uptimeSeconds: 7200,
      primaryIp: '192.168.1.10',
      intakeDir: '/home/u/.local/share/adtp/intake',
      agentActive: true,
      agentProvider: 'ollama',
      agentModel: 'llama3',
    });
  });

  it('tolerates camelCase and stringy numbers', () => {
    const info = normalizeSystemInfo({ cpuCount: '4', cpuPercent: '7.5', ramTotal: '1024' });
    expect(info.cpuCount).toBe(4);
    expect(info.cpuPercent).toBe(7.5);
    expect(info.ramTotal).toBe(1024);
  });

  it('leaves absent metrics undefined rather than zero', () => {
    const info = normalizeSystemInfo({ hostname: 'X' });
    expect(info.hostname).toBe('X');
    expect(info.cpuPercent).toBeUndefined();
    expect(info.ramPercent).toBeUndefined();
    expect(info.agentActive).toBeUndefined();
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
