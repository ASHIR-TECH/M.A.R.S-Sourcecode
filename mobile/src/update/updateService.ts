export interface UpdateInfo {
  latestVersion: string;
  minVersion: string;
  message?: string;
  url?: string;
  force?: boolean;
}

export async function fetchUpdateInfo(url: string): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.latestVersion !== 'string') return null;
    return {
      latestVersion: data.latestVersion,
      minVersion: data.minVersion || data.latestVersion,
      message: data.message,
      url: data.url,
      force: !!data.force,
    };
  } catch {
    return null;
  }
}

export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/[^0-9.]/g, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.replace(/[^0-9.]/g, '').split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}
