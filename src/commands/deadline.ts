import type { Chat, Message } from 'whatsapp-web.js';
import { listPendingWithDeadline } from '../services/taskService';
import { formatDeadline, formatSisaWaktu } from '../utils/dateFormat';
import { getRegisteredGroupOrReply } from './shared';

export async function handleDeadline(msg: Message, chat: Chat): Promise<void> {
  const group = await getRegisteredGroupOrReply(msg, chat);
  if (!group) return;

  const tasks = listPendingWithDeadline(group.id);
  if (tasks.length === 0) {
    await msg.reply('Tidak ada tugas pending dengan deadline. 🎉');
    return;
  }

  const now = new Date();
  const body = tasks
    .map((t) => {
      const d = new Date(t.deadline!);
      return `🕐 #${t.id} ${t.deskripsi}\n   ${formatDeadline(d)} (${formatSisaWaktu(d, now)})`;
    })
    .join('\n\n');

  await msg.reply(`⏰ *Deadline Mendekat*\n\n${body}`);
}
