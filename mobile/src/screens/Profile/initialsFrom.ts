export function initialsFrom(name?: string, email?: string): string {
  const source = name ?? email ?? '?';
  return source
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
