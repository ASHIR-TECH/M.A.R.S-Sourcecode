const {
  DEFAULT_RETENTION_SECONDS,
  retentionExpiry,
  isExpired,
  wireStatus,
  buildMediaRef,
} = require('./mediaContract');

describe('mediaContract (shared with ADTP)', () => {
  const record = {
    id: 'media-1',
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    size: 9000,
    compressedSize: 3000,
    storedSize: 3000,
    sha256: 'abc123',
    sender: 'adtp-desktop',
    recipient: 'phone-1',
    conversationId: 'default-session',
    sessionId: 'default-session',
    paths: { original: 'media/a', thumbnail: 'media/b' },
    compressed: true,
    status: 'complete',
    createdAt: '2026-11-26T10:00:00.000Z',
    expiresAt: '2026-11-27T10:00:00.000Z',
  };

  it('emits the same v2 shape as the ADTP gateway', () => {
    const ref = buildMediaRef(record, 'https://relay.example/');
    expect(ref.schemaVersion).toBe(2);
    expect(ref.serviceUrl).toBe('https://relay.example');
    expect(ref.storedSize).toBe(3000);
    expect(ref.compressedSize).toBe(3000);
    expect(ref.status).toBe('ready');
    expect(ref.expiresAt).toBe(record.expiresAt);
    expect(ref.recipient).toBe('phone-1');
    expect(ref.conversationId).toBe('default-session');
    expect(ref.hasThumbnail).toBe(true);
  });

  it('falls back to compressedSize for legacy records', () => {
    const legacy = { ...record, storedSize: undefined, status: 'pending', expiresAt: undefined };
    const ref = buildMediaRef(legacy, 'https://relay.example');
    expect(ref.storedSize).toBe(3000);
    expect(ref.status).toBe('created');
    expect(Date.parse(ref.expiresAt) - Date.parse(legacy.createdAt)).toBe(
      DEFAULT_RETENTION_SECONDS * 1000
    );
  });

  it('uses the configured retention window', () => {
    expect(
      Date.parse(retentionExpiry(record.createdAt, 60)) - Date.parse(record.createdAt)
    ).toBe(60_000);
  });

  it('reports expired media and preserves terminal states', () => {
    const now = Date.parse('2026-11-28T00:00:00.000Z');
    expect(isExpired(record, now)).toBe(true);
    expect(wireStatus(record, now)).toBe('expired');
    expect(isExpired({ ...record, status: 'deleted' }, 0)).toBe(true);
    expect(isExpired({ ...record, expiresAt: '2999-01-01T00:00:00Z' }, now)).toBe(false);
  });
});
