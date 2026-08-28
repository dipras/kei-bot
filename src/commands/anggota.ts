import type { Chat, Client, GroupChat, Message } from 'whatsapp-web.js';
import { getRegisteredGroupOrReply } from './shared';

export async function handleAnggota(msg: Message, chat: Chat, client: Client): Promise<void> {
  const group = await getRegisteredGroupOrReply(msg, chat);
  if (!group) return;

  const groupChat = chat as GroupChat;
  const participants = groupChat.participants || [];

  if (participants.length === 0) {
    await msg.reply('Tidak ada data anggota untuk grup ini.');
    return;
  }

  const lines = await Promise.all(
    participants.map(async (p, idx) => {
      let label = p.id.user;
      try {
        const contact = await client.getContactById(p.id._serialized);
        label = contact.pushname || contact.name || contact.number || p.id.user;
      } catch {
        // fall back to raw number kalau contact gagal di-resolve
      }
      const badge = p.isSuperAdmin || p.isAdmin ? ' (admin grup)' : '';
      return `${idx + 1}. ${label}${badge}`;
    })
  );

  await msg.reply(`👥 *Anggota Grup* (${participants.length})\n\n${lines.join('\n')}`);
}
