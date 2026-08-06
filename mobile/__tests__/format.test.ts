import { formatBytes, pathLabel, shortPeerId, timeAgo } from '@/lib/format';

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });

  it('handles invalid input', () => {
    expect(formatBytes(NaN)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
  });
});

describe('pathLabel', () => {
  it('maps path types to friendly labels', () => {
    expect(pathLabel('direct_ipv4')).toBe('Direct');
    expect(pathLabel('direct_ipv6')).toBe('Direct');
    expect(pathLabel('lan')).toBe('LAN');
    expect(pathLabel('hole_punch')).toBe('Punched');
    expect(pathLabel('relay')).toBe('Relay');
    expect(pathLabel('qowt')).toBe('QoWT');
    expect(pathLabel(undefined)).toBe('—');
    expect(pathLabel('unknown')).toBe('—');
  });
});

describe('shortPeerId', () => {
  it('truncates long peer ids to an 8-char prefix', () => {
    expect(shortPeerId('a1b2c3d4e5f60708')).toBe('a1b2c3d4…');
  });

  it('leaves short ids unchanged', () => {
    expect(shortPeerId('abc')).toBe('abc');
  });

  it('handles missing ids', () => {
    expect(shortPeerId(undefined)).toBe('—');
  });
});

describe('timeAgo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-06T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('formats relative time', () => {
    const now = Date.now();
    expect(timeAgo(new Date(now - 30_000).toISOString())).toBe('just now');
    expect(timeAgo(new Date(now - 2 * 60_000).toISOString())).toBe('2m ago');
    expect(timeAgo(new Date(now - 5 * 3600_000).toISOString())).toBe('5h ago');
    expect(timeAgo(new Date(now - 3 * 86400_000).toISOString())).toBe('3d ago');
  });
});
