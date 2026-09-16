export function generateTxRef(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `mars-donate-${Date.now()}-${random}`;
}