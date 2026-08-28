import type { Chat, Message } from 'whatsapp-web.js';
import { config } from '../config';
import { isAdmin } from '../utils/permission';
import { upsertGroup } from '../services/groupService';
import { getSenderId, requireGroupChat } from './shared';

export async function handleSetup(msg: Message, chat: Chat, argsStr: string): Promise<void> {
  if (!(await requireGroupChat(msg, chat))) return;

  const senderId = getSenderId(msg);
  if (!isAdmin(senderId, config.adminNumbers)) {
    await msg.reply('❌ Hanya admin yang boleh menjalankan /setup.');
    return;
  }

  const parts = argsStr
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length !== 2) {
    await msg.reply(
      'Format salah.\nGunakan: /setup <Matkul> | <Nama Kelompok>\nContoh: /setup Basis Data | Kelompok 3'
    );
    return;
  }

  const [matkul, namaKelompok] = parts;
  const group = upsertGroup(chat.id._serialized, matkul, namaKelompok);

  await msg.reply(
    `✅ Grup berhasil di-setup.\n📚 Matkul: ${group.matkul}\n👥 Kelompok: ${group.nama_kelompok}`
  );
}
