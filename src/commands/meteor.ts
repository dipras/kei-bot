import type { Chat, Message } from 'whatsapp-web.js';
import { config } from '../config';
import { isAdmin } from '../utils/permission';
import { applyMeteor } from '../services/battleService';
import { getSenderId, requireGroupChat } from './shared';

// Hidden command — sengaja gak didaftarkan di /help.
export async function handleMeteor(msg: Message, chat: Chat): Promise<void> {
  if (!(await requireGroupChat(msg, chat))) return;

  const groupId = chat.id._serialized;
  const senderId = getSenderId(msg);
  const result = applyMeteor(groupId, senderId, isAdmin(senderId, config.adminNumbers));

  if (!result.ok) {
    if (result.reason === 'no-battle') {
      await msg.reply('Gak ada battle yang lagi jalan di grup ini.');
    } else {
      await msg.reply('Kamu bukan peserta battle yang lagi jalan di grup ini.');
    }
    return;
  }

  await msg.reply(result.log);
}
