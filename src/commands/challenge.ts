import type { Chat, Client, Message } from 'whatsapp-web.js';
import { hasActiveBattle, startBattle } from '../services/battleService';
import { getSenderId, requireGroupChat } from './shared';

export async function handleChallenge(msg: Message, chat: Chat, client: Client): Promise<void> {
  if (!(await requireGroupChat(msg, chat))) return;

  const groupId = chat.id._serialized;
  if (hasActiveBattle(groupId)) {
    await msg.reply(
      '⚔️ Masih ada battle yang lagi jalan di grup ini. Tunggu sampai selesai atau timeout 5 menit dulu ya.'
    );
    return;
  }

  const mentions = await msg.getMentions();
  if (mentions.length === 0 || msg.mentionedIds.length === 0) {
    await msg.reply('Gunakan: /challenge @target\nMention orang yang mau kamu tantang.');
    return;
  }

  // Pakai ID mentahan dari msg.mentionedIds (bukan mentions[0].id._serialized hasil resolve
  // Contact store) — ini yang satu "ruang ID" sama kayak msg.author di pesan-pesan
  // berikutnya (mis. pas target ngirim /attack). Kalau dua sumber ID ini beda ruang
  // (salah satunya LID, satunya lagi nomor c.us), battle gak akan pernah match ke pengirim.
  const targetId = msg.mentionedIds[0];
  const targetContact = mentions[0];
  const challengerId = getSenderId(msg);

  if (targetId === challengerId) {
    await msg.reply('Gak bisa nantangin diri sendiri woy 😂');
    return;
  }
  if (targetId === client.info.wid._serialized) {
    await msg.reply('Aku cuma wasit di sini, gak ikut battle ya 😅');
    return;
  }

  let challengerName = challengerId;
  try {
    const challengerContact = await msg.getContact();
    challengerName =
      challengerContact.pushname || challengerContact.name || challengerContact.number || challengerId;
  } catch {
    // pakai fallback id kalau contact gagal di-resolve
  }
  const targetName = targetContact.pushname || targetContact.name || targetContact.number || targetId;

  startBattle(
    groupId,
    { id: challengerId, name: challengerName },
    { id: targetId, name: targetName },
    async () => {
      await client.sendMessage(
        groupId,
        `⏱️ Battle *${challengerName}* vs *${targetName}* berakhir — tidak ada aksi selama 5 menit.`
      );
    }
  );

  await msg.reply(
    `⚔️ *Battle dimulai!*\n${challengerName} (100/100 HP) VS ${targetName} (100/100 HP)\n\n` +
      `Aksi: /attack | /defend | /heal\n➡️ Giliran: ${challengerName}\n` +
      '(Battle otomatis berakhir kalau 5 menit gak ada aksi dari siapa pun)'
  );
}
