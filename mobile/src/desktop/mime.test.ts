import { isTextMime, mimeTypeForName } from './mime';

describe('mimeTypeForName', () => {
  it('keeps a specific declared type', () => {
    expect(mimeTypeForName('photo.png', 'image/png')).toBe('image/png');
    expect(mimeTypeForName('notes.txt', 'text/plain; charset=utf-8')).toBe('text/plain');
  });

  it('falls back to the extension for generic picker metadata', () => {
    expect(mimeTypeForName('image.json', 'application/octet-stream')).toBe('application/json');
    expect(mimeTypeForName('report.pdf')).toBe('application/pdf');
    expect(mimeTypeForName('photo.JPG', 'binary/octet-stream')).toBe('image/jpeg');
    expect(mimeTypeForName('archive.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(mimeTypeForName('clip.mp4')).toBe('video/mp4');
  });

  it('returns octet-stream when nothing identifies the file', () => {
    expect(mimeTypeForName('mystery', 'application/octet-stream')).toBe(
      'application/octet-stream'
    );
  });
});

describe('isTextMime', () => {
  it('recognises text formats the desktop can read inline', () => {
    expect(isTextMime('text/plain')).toBe(true);
    expect(isTextMime('application/json')).toBe(true);
    expect(isTextMime('image/png')).toBe(false);
    expect(isTextMime('application/pdf')).toBe(false);
  });
});
