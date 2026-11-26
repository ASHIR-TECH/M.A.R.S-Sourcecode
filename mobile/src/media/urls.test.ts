import {
  mediaDownloadUrl,
  mediaOriginalUrl,
  mediaThumbnailUrl,
  normalizeMediaRef,
  isMediaUnavailable,
  mediaThroughDesktop,
} from './urls';
import type { MediaRef } from './types';

const ref: MediaRef = {
  id: 'uuid-123',
  serviceUrl: 'https://relay.example/',
  name: 'holiday photo.png',
  mimeType: 'image/png',
  size: 9000000,
  compressedSize: 450000,
  compressed: true,
  hasThumbnail: true,
  createdAt: '2026-11-20T13:00:00.000Z',
};

describe('media URL helpers', () => {
  it('builds stable original / thumbnail / download URLs', () => {
    expect(mediaOriginalUrl(ref)).toBe(
      'https://relay.example/api/media/file/uuid-123?kind=original'
    );
    expect(mediaThumbnailUrl(ref)).toBe(
      'https://relay.example/api/media/file/uuid-123?kind=thumbnail'
    );
    expect(mediaDownloadUrl(ref)).toContain('download=1');
  });

  it('returns no thumbnail URL when the upload has no thumbnail', () => {
    expect(mediaThumbnailUrl({ ...ref, hasThumbnail: false })).toBeNull();
  });
});

describe('normalizeMediaRef', () => {
  it('accepts a valid wire reference', () => {
    expect(normalizeMediaRef(ref)).toMatchObject({ id: 'uuid-123', name: 'holiday photo.png' });
  });

  it('rejects malformed values instead of throwing', () => {
    expect(normalizeMediaRef(null)).toBeNull();
    expect(normalizeMediaRef({ id: 'x' })).toBeNull();
    expect(normalizeMediaRef({ id: 'x', name: 'f', serviceUrl: 'javascript:alert(1)' })).toBeNull();
  });

  it('falls back to the configured backend when serviceUrl is missing', () => {
    const previous = process.env.EXPO_PUBLIC_BACKEND_URL;
    process.env.EXPO_PUBLIC_BACKEND_URL = 'https://fallback.example';
    const normalized = normalizeMediaRef({ id: 'x', name: 'f' });
    expect(normalized?.serviceUrl).toBe('https://fallback.example');
    process.env.EXPO_PUBLIC_BACKEND_URL = previous;
  });
});

describe('mediaThroughDesktop', () => {
  it('rewrites ADTP loopback services to the paired desktop route', () => {
    const fromDesktop = { ...ref, serviceUrl: 'http://127.0.0.1:40003' };
    expect(mediaThroughDesktop(fromDesktop, 'http://192.168.1.9:40003/')?.serviceUrl).toBe(
      'http://192.168.1.9:40003'
    );
  });

  it('leaves relay URLs untouched', () => {
    expect(mediaThroughDesktop(ref, 'http://192.168.1.9:40003')?.serviceUrl).toBe(
      'https://relay.example/'
    );
  });
});

describe('MediaRef v2 normalization', () => {
  it('reads v2 lifecycle fields and prefers storedSize', () => {
    const media = normalizeMediaRef({
      ...ref,
      schemaVersion: 2,
      storedSize: 400,
      compressedSize: 900,
      recipient: 'phone-1',
      conversationId: 'session-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'ready',
    });
    expect(media).toMatchObject({
      schemaVersion: 2,
      storedSize: 400,
      recipient: 'phone-1',
      conversationId: 'session-1',
      status: 'ready',
    });
  });

  it('upgrades v1 references to an implicit ready state', () => {
    expect(normalizeMediaRef(ref)).toMatchObject({ schemaVersion: 1, status: 'ready' });
  });

  it('clamps negative sizes and rejects unsafe ids', () => {
    expect(normalizeMediaRef({ ...ref, size: -5, compressedSize: -2 })?.size).toBe(0);
    expect(normalizeMediaRef({ ...ref, id: '../secret' })).toBeNull();
  });

  it('enforces an optional media host allowlist', () => {
    const previous = process.env.EXPO_PUBLIC_MEDIA_HOSTS;
    process.env.EXPO_PUBLIC_MEDIA_HOSTS = 'trusted.example';
    expect(normalizeMediaRef(ref)).toBeNull();
    expect(normalizeMediaRef({ ...ref, serviceUrl: 'https://trusted.example' })).not.toBeNull();
    process.env.EXPO_PUBLIC_MEDIA_HOSTS = previous;
  });
});

describe('isMediaUnavailable', () => {
  it('flags expired deadlines and terminal states', () => {
    expect(isMediaUnavailable({ ...ref, expiresAt: '2020-01-01T00:00:00.000Z' })).toBe('expired');
    expect(isMediaUnavailable({ ...ref, status: 'deleted' })).toBe('deleted');
    expect(isMediaUnavailable({ ...ref, expiresAt: '2099-01-01T00:00:00.000Z' })).toBeNull();
  });
});
