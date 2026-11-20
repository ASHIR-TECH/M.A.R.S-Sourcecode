import {
  mediaDownloadUrl,
  mediaOriginalUrl,
  mediaThumbnailUrl,
  normalizeMediaRef,
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
