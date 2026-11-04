/** MIME fallbacks for picked files.
 *
 * Android's document picker often reports `application/octet-stream` (or
 * nothing at all) for perfectly ordinary files. The desktop gateway also has a
 * server-side fallback, but filling it in on the phone keeps the transfer
 * list, AI prompt and chat tile accurate before the bytes leave the device.
 */

const EXTENSION_TYPES: Record<string, string> = {
  txt: 'text/plain',
  log: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  toml: 'application/toml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  ts: 'text/typescript',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  tar: 'application/x-tar',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  apk: 'application/vnd.android.package-archive',
};

const GENERIC = new Set(['', 'application/octet-stream', 'binary/octet-stream']);

/** Return a specific MIME type, preferring declared metadata over the suffix. */
export function mimeTypeForName(name: string, declared?: string): string {
  const normalized = (declared ?? '').split(';', 1)[0].trim().toLowerCase();
  if (!GENERIC.has(normalized)) return normalized;

  const suffix = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return EXTENSION_TYPES[suffix] ?? 'application/octet-stream';
}

/** True for text formats the desktop AI can actually read inline. */
export function isTextMime(mime: string): boolean {
  const normalized = (mime ?? '').split(';', 1)[0].trim().toLowerCase();
  return (
    normalized.startsWith('text/') ||
    normalized === 'application/json' ||
    normalized === 'application/xml' ||
    normalized === 'application/yaml' ||
    normalized === 'application/toml'
  );
}
