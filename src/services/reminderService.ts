import cron from 'node-cron';
import type { Client } from 'whatsapp-web.js';
import { config } from '../config';
import { listAllPendingWithDeadlineDue, markReminded } from './taskService';
import { formatDeadline, formatSisaWaktu } from '../utils/dateFormat';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THREE_HOUR_MS = 3 * 60 * 60 * 1000;

async function checkAndSendReminders(client: Client): Promise<void> {
  const now = new Date();
  const dueTasks = listAllPendingWithDeadlineDue();

  for (const task of dueTasks) {
    if (!task.deadline) continue;
    const deadline = new Date(task.deadline);
    const remainingMs = deadline.getTime() - now.getTime();

    const windows: Array<{ field: 'reminded_1d' | 'reminded_3h'; thresholdMs: number; label: string }> = [
      { field: 'reminded_1d', thresholdMs: ONE_DAY_MS, label: 'H-1 hari' },
      { field: 'reminded_3h', thresholdMs: THREE_HOUR_MS, label: 'H-3 jam' },
    ];

    for (const w of windows) {
      const alreadyReminded = task[w.field] === 1;
      if (alreadyReminded) continue;
      if (remainingMs > w.thresholdMs) continue;

      const text =
        `⏰ Reminder deadline (${w.label})\n` +
        `📌 ${task.deskripsi}\n` +
        `🕒 Deadline: ${formatDeadline(deadline)} (${formatSisaWaktu(deadline, now)})\n` +
        `#${task.id}`;

      try {
        await client.sendMessage(task.wa_chat_id, text);
      } catch (err) {
        console.error(`[reminder] Gagal kirim reminder task #${task.id}:`, err);
        continue;
      }
      markReminded(task.id, w.field);
    }
  }
}

export function startReminderService(client: Client): void {
  const expression = `*/${config.reminderIntervalMinutes} * * * *`;
  cron.schedule(expression, () => {
    checkAndSendReminders(client).catch((err) => {
      console.error('[reminder] Error saat cek reminder:', err);
    });
  });
  console.log(`[reminder] Cron reminder aktif, cek tiap ${config.reminderIntervalMinutes} menit.`);
}
