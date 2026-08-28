import type { Chat, Message } from 'whatsapp-web.js';
import { getGroupByChatId } from '../services/groupService';
import type { GroupRow } from '../types';

export function getSenderId(msg: Message): string {
  return msg.author || msg.from;
}

export async function requireGroupChat(msg: Message, chat: Chat): Promise<boolean> {
  if (!chat.isGroup) {
    await msg.reply('Command ini cuma bisa dipakai di dalam grup WA yang sudah di-setup.');
    return false;
  }
  return true;
}

export async function getRegisteredGroupOrReply(
  msg: Message,
  chat: Chat
): Promise<GroupRow | undefined> {
  if (!(await requireGroupChat(msg, chat))) return undefined;

  const group = getGroupByChatId(chat.id._serialized);
  if (!group) {
    await msg.reply(
      '⚠️ Grup ini belum di-setup. Minta admin jalankan:\n/setup <Matkul> | <Nama Kelompok>'
    );
    return undefined;
  }
  return group;
}
