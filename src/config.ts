import 'dotenv/config';

function parseAdminNumbers(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

function parseIntEnv(raw: string | undefined, fallback: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  adminNumbers: parseAdminNumbers(process.env.ADMIN_NUMBERS),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  reminderIntervalMinutes: parseIntEnv(process.env.REMINDER_INTERVAL_MINUTES, 10),
  rangkumDefaultCount: parseIntEnv(process.env.RANGKUM_DEFAULT_COUNT, 50),
  dbPath: process.env.DB_PATH || './data/kei-bot.sqlite3',
};

if (config.adminNumbers.length === 0) {
  console.warn(
    '[config] ADMIN_NUMBERS kosong — tidak ada satupun nomor yang bisa jalankan command admin (/setup).'
  );
}
