import { db } from '../db';
import type { GroupRow } from '../types';

export function getGroupByChatId(chatId: string): GroupRow | undefined {
  return db.prepare('SELECT * FROM groups WHERE wa_chat_id = ?').get(chatId) as
    | GroupRow
    | undefined;
}

export function upsertGroup(chatId: string, matkul: string, namaKelompok: string): GroupRow {
  const existing = getGroupByChatId(chatId);
  if (existing) {
    db.prepare('UPDATE groups SET matkul = ?, nama_kelompok = ? WHERE id = ?').run(
      matkul,
      namaKelompok,
      existing.id
    );
  } else {
    db.prepare(
      'INSERT INTO groups (wa_chat_id, matkul, nama_kelompok) VALUES (?, ?, ?)'
    ).run(chatId, matkul, namaKelompok);
  }
  return getGroupByChatId(chatId)!;
}
