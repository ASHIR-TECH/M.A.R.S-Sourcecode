const mockDownloadAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockMakeDirectoryAsync = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  makeDirectoryAsync: (...args: unknown[]) => mockMakeDirectoryAsync(...args),
  downloadAsync: (...args: unknown[]) => mockDownloadAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock('../auth/supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import { safeFilename, downloadMedia } from './download';
import type { MediaRef } from './types';

const media: MediaRef = {
  schemaVersion: 2,
  id: 'media-1',
  serviceUrl: 'https://relay.example',
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  size: 9000,
  storedSize: 3000,
  compressedSize: 3000,
  compressed: true,
  hasThumbnail: true,
  createdAt: '2026-11-26T10:00:00.000Z',
  status: 'ready',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetInfoAsync.mockResolvedValue({ exists: true });
  mockDownloadAsync.mockResolvedValue({
    status: 200,
    uri: 'file:///docs/mars-inbox/1-photo.jpg',
  });
  mockDeleteAsync.mockResolvedValue(undefined);
});

describe('safeFilename', () => {
  it('keeps ordinary names intact', () => {
    expect(safeFilename('design-review.jpg')).toBe('design-review.jpg');
  });

  it('strips path separators, control characters and leading dots', () => {
    expect(safeFilename('../etc/passwd')).toBe('_etc_passwd');
    expect(safeFilename('C:\\secret\\file.txt')).toBe('C__secret_file.txt');
  });

  it('falls back for empty names', () => {
    expect(safeFilename('')).toBe('download.bin');
    expect(safeFilename('...')).toBe('download.bin');
  });

  it('bounds the length', () => {
    expect(safeFilename('a'.repeat(300))).toHaveLength(120);
  });
});

describe('downloadMedia', () => {
  it('saves the original into the app inbox through the stable media route', async () => {
    const result = await downloadMedia(media);

    expect(mockGetInfoAsync).toHaveBeenCalledWith('file:///docs/mars-inbox/');
    expect(mockDownloadAsync).toHaveBeenCalledWith(
      expect.stringContaining('/api/media/file/media-1?kind=original'),
      expect.stringContaining('mars-inbox/'),
      { headers: {} }
    );
    expect(result).toEqual({
      uri: 'file:///docs/mars-inbox/1-photo.jpg',
      name: 'photo.jpg',
    });
  });

  it('creates the inbox directory when missing', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false });
    await downloadMedia(media);
    expect(mockMakeDirectoryAsync).toHaveBeenCalledWith('file:///docs/mars-inbox/', {
      intermediates: true,
    });
  });

  it('removes a partial file when the server rejects the download', async () => {
    mockDownloadAsync.mockResolvedValue({ status: 404, uri: 'file:///docs/mars-inbox/1-photo.jpg' });
    await expect(downloadMedia(media)).rejects.toThrow('Download failed (404)');
    expect(mockDeleteAsync).toHaveBeenCalled();
  });
});
