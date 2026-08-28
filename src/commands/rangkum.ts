import type { Chat, Client, Message } from 'whatsapp-web.js';
import { config } from '../config';
import { getRegisteredGroupOrReply } from './shared';
import { summarizeDiscussion, type TranscriptLine } from '../services/summaryService';

export async function handleRangkum(
  msg: Message,
  chat: Chat,
  argsStr: string,
  client: Client
): Promise<void> {
  const group = await getRegisteredGroupOrReply(msg, chat);
  if (!group) return;

  if (!config.anthropicApiKey) {
    await msg.reply(
      '❌ Fitur /rangkum belum aktif — ANTHROPIC_API_KEY belum di-set di server bot. Hubungi admin bot.'
    );
    return;
  }

  let limit = config.rangkumDefaultCount;
  if (argsStr.trim()) {
    const n = parseInt(argsStr.trim(), 10);
    if (!Number.isFinite(n) || n <= 0) {
      await msg.reply('Gunakan: /rangkum [jumlah_pesan]\nContoh: /rangkum 100');
      return;
    }
    limit = n;
  }

  await msg.reply(`⏳ Merangkum ${limit} pesan terakhir, tunggu sebentar...`);

  const fetched = await chat.fetchMessages({ limit });

  const contactNameCache = new Map<string, string>();
  const resolveName = async (senderId: string): Promise<string> => {
    if (contactNameCache.has(senderId)) return contactNameCache.get(senderId)!;
    let name = senderId;
    try {
      const contact = await client.getContactById(senderId);
      name = contact.pushname || contact.name || contact.number || senderId;
    } catch {
      // pakai fallback id kalau contact gagal di-resolve
    }
    contactNameCache.set(senderId, name);
    return name;
  };

  const lines: TranscriptLine[] = [];
  for (const m of fetched) {
    if (m.type !== 'chat') continue; // skip media/system, hanya pesan teks
    const body = m.body.trim();
    if (!body || body.startsWith('/')) continue; // skip command bot & pesan kosong
    const senderId = m.author || m.from;
    const name = m.fromMe ? 'Kei-bot' : await resolveName(senderId);
    lines.push({ sender: name, body });
  }

  if (lines.length === 0) {
    await msg.reply('Tidak ada cukup pesan teks untuk dirangkum.');
    return;
  }

  try {
    const summary = await summarizeDiscussion(group.matkul, group.nama_kelompok, lines);
    await msg.reply(`📋 *Rangkuman Diskusi* (${lines.length} pesan)\n\n${summary}`);
  } catch (err) {
    console.error('[rangkum] Gagal memanggil Anthropic API:', err);
    await msg.reply('❌ Gagal membuat rangkuman — ada masalah saat memanggil AI. Coba lagi nanti.');
  }
}
