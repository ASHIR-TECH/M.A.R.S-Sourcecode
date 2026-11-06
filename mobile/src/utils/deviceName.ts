/**
 * Display name for a paired device.
 *
 * Desktop hostnames are often machine-style (`adtp-kali`). The UI should read
 * like a device name, not an install id: strip the `adtp-` prefix and title
 * case the remaining lowercase hostname. Names the user has chosen (mixed
 * case, spaces) are left untouched.
 */
export function displayDeviceName(name?: string | null): string {
  const raw = (name ?? '').trim();
  if (!raw) return 'Device';

  const prefixed = /^adtp[-_ ]+/i.test(raw);
  if (!prefixed) return raw;

  const stripped = raw.replace(/^adtp[-_ ]+/i, '').trim();
  if (!stripped) return raw;

  // `adtp-kali` → `Kali`; `adtp-My Rig` keeps the user's casing.
  if (stripped === stripped.toLowerCase()) {
    return stripped
      .split(/([\s-_]+)/)
      .map((part) => (part.trim() ? part.charAt(0).toUpperCase() + part.slice(1) : part))
      .join('')
      .replace(/[-_]+/g, ' ');
  }
  return stripped;
}
