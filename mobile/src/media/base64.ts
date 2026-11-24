/**
 * Small base64 -> Uint8Array decoder. Hermes does not reliably expose atob(),
 * and signed blob uploads need the exact bytes, not the base64 text.
 */
const TABLE = new Uint8Array(128);
for (let i = 0; i < 64; i += 1) {
  TABLE['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charCodeAt(i)] = i;
}
TABLE['-'.charCodeAt(0)] = 62;
TABLE['_'.charCodeAt(0)] = 63;

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[\r\n\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');
  let length = clean.length;
  while (length > 0 && clean[length - 1] === '=') length -= 1;

  const bytes = new Uint8Array(Math.floor((length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let out = 0;

  for (let i = 0; i < length; i += 1) {
    const code = clean.charCodeAt(i);
    const value = code < 128 ? TABLE[code] : 0;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[out] = (buffer >> bits) & 0xff;
      out += 1;
    }
  }
  return bytes;
}
