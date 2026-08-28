const DEADLINE_RE = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/;
const RELATIVE_HOUR_RE = /^(\d+)\s*jam$/i;
const RELATIVE_DAY_RE = /^(\d+)\s*hari$/i;

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Parse deadline dalam format absolut "DD-MM-YYYY HH:mm" atau format relatif
 * ("1 jam", "2 hari", "besok", "lusa"). Format relatif dihitung dari `now`.
 */
export function parseDeadline(raw: string, now: Date = new Date()): Date | null {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'besok') return addHours(now, 24);
  if (lower === 'lusa') return addHours(now, 48);

  const hourMatch = RELATIVE_HOUR_RE.exec(lower);
  if (hourMatch) {
    const n = Number(hourMatch[1]);
    if (n > 0) return addHours(now, n);
  }

  const dayMatch = RELATIVE_DAY_RE.exec(lower);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    if (n > 0) return addHours(now, n * 24);
  }

  const match = DEADLINE_RE.exec(trimmed);
  if (!match) return null;

  const [, dd, mm, yyyy, hh, min] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const hour = Number(hh);
  const minute = Number(min);

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  // Reject overflowed dates such as 31-02-2026 which JS Date silently rolls forward.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function formatDeadline(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

/**
 * Format sisa waktu menuju deadline dalam bahasa Indonesia, dibulatkan ke satuan
 * terbesar berikutnya yang masuk akal (hari+jam, atau jam+menit).
 */
export function formatSisaWaktu(deadline: Date, now: Date = new Date()): string {
  const diffMs = deadline.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  const totalMinutes = Math.round(absMs / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  let text: string;
  if (days > 0) {
    text = hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
  } else if (hours > 0) {
    text = minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  } else {
    text = `${minutes} menit`;
  }

  return diffMs >= 0 ? `${text} lagi` : `Terlambat ${text}`;
}
