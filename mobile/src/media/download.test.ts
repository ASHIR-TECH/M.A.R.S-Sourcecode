import { safeFilename } from './download';

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
