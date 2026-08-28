export function normalizeNumber(id: string): string {
  return id.replace(/\D/g, '');
}

export function isAdmin(senderId: string, adminNumbers: string[]): boolean {
  const num = normalizeNumber(senderId);
  if (!num) return false;
  return adminNumbers.some((a) => normalizeNumber(a) === num);
}
