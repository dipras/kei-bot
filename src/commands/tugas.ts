import type { Chat, Message } from 'whatsapp-web.js';
import { config } from '../config';
import { isAdmin, normalizeNumber } from '../utils/permission';
import { parseDeadline, formatDeadline, formatSisaWaktu } from '../utils/dateFormat';
import {
  addTask,
  deleteTask,
  getTaskById,
  listTasksByGroup,
  markSelesai,
} from '../services/taskService';
import type { TaskRow } from '../types';
import { getRegisteredGroupOrReply, getSenderId } from './shared';

function canModifyTask(senderId: string, task: TaskRow): boolean {
  return isAdmin(senderId, config.adminNumbers) || normalizeNumber(senderId) === task.dibuat_oleh;
}

function formatTaskLine(task: TaskRow, now: Date): string {
  const statusEmoji = task.status === 'selesai' ? '✅' : '🕐';
  let deadlineInfo = '';
  if (task.deadline) {
    const d = new Date(task.deadline);
    deadlineInfo = `\n   Deadline: ${formatDeadline(d)} (${formatSisaWaktu(d, now)})`;
  }
  return `${statusEmoji} #${task.id} ${task.deskripsi}${deadlineInfo}`;
}

async function handleTambah(msg: Message, groupId: number, argsStr: string): Promise<void> {
  const parts = argsStr.split('|').map((s) => s.trim());
  const deskripsi = parts[0];
  const deadlineStr = parts[1];

  if (!deskripsi) {
    await msg.reply(
      'Format salah.\nGunakan: /tugas tambah <deskripsi> | <deadline>\nDeadline opsional, bisa absolut (DD-MM-YYYY HH:mm) atau relatif (1 jam, 2 hari, besok, lusa).\nContoh: /tugas tambah Kerjain ERD | besok'
    );
    return;
  }

  let deadlineIso: string | null = null;
  if (deadlineStr) {
    const parsed = parseDeadline(deadlineStr);
    if (!parsed) {
      await msg.reply(
        '⚠️ Format deadline salah.\nGunakan format absolut: DD-MM-YYYY HH:mm (contoh: 30-08-2026 23:59)\nAtau format relatif: 1 jam, 2 jam, 1 hari, 2 hari, besok, lusa'
      );
      return;
    }
    deadlineIso = parsed.toISOString();

    if(parsed.getTime() < Date.now()) {
      if(isAdmin(getSenderId(msg), config.adminNumbers)) {
        await msg.reply('Master, deadline harus lebih dari waktu sekaran yah. UwU');
      } else {
        await msg.reply('Ngotak goblok, mana bisa deadline lo set kemaren tolol');
      }
      return;
    }
  }

  const senderId = getSenderId(msg);
  const dibuatOleh = normalizeNumber(senderId) || senderId;

  const task = addTask(groupId, deskripsi, deadlineIso, dibuatOleh);
  const deadlineInfo = task.deadline
    ? `\n🕒 Deadline: ${formatDeadline(new Date(task.deadline))}`
    : '\n🕒 Tanpa deadline';

  await msg.reply(`✅ Tugas #${task.id} ditambahkan.\n📌 ${task.deskripsi}${deadlineInfo}`);
}

async function handleList(msg: Message, groupId: number): Promise<void> {
  const tasks = listTasksByGroup(groupId);
  if (tasks.length === 0) {
    await msg.reply('Belum ada tugas tercatat. Tambah dengan /tugas tambah <deskripsi>');
    return;
  }
  const now = new Date();
  const body = tasks.map((t) => formatTaskLine(t, now)).join('\n\n');
  await msg.reply(`📋 *Daftar Tugas*\n\n${body}`);
}

const SELESAI_USAGE =
  'Gunakan: /tugas selesai <id> [id2 id3 ...] | /tugas selesai semua';

async function handleSelesaiSemua(msg: Message, groupId: number, senderId: string): Promise<void> {
  const pending = listTasksByGroup(groupId).filter((t) => t.status === 'pending');
  const eligible = pending.filter((t) => canModifyTask(senderId, t));

  if (eligible.length === 0) {
    await msg.reply('Tidak ada tugas pending yang bisa kamu tandai selesai.');
    return;
  }

  for (const t of eligible) markSelesai(groupId, t.id);

  const skipped = pending.length - eligible.length;
  const skippedNote =
    skipped > 0 ? `\n(${skipped} tugas lain dilewati karena bukan admin/punya kamu)` : '';
  const idList = eligible.map((t) => `#${t.id}`).join(', ');
  await msg.reply(`✅ ${eligible.length} tugas ditandai selesai: ${idList}${skippedNote}`);
}

async function handleSelesai(msg: Message, groupId: number, argsStr: string): Promise<void> {
  const trimmed = argsStr.trim();
  if (!trimmed) {
    await msg.reply(SELESAI_USAGE);
    return;
  }

  const senderId = getSenderId(msg);

  if (trimmed.toLowerCase() === 'semua') {
    return handleSelesaiSemua(msg, groupId, senderId);
  }

  const ids = trimmed
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((s) => parseInt(s, 10));

  if (ids.length === 0 || ids.some((id) => !Number.isFinite(id))) {
    await msg.reply(SELESAI_USAGE);
    return;
  }

  const done: number[] = [];
  const notFound: number[] = [];
  const forbidden: number[] = [];

  for (const id of ids) {
    const existing = getTaskById(groupId, id);
    if (!existing) {
      notFound.push(id);
      continue;
    }
    if (!canModifyTask(senderId, existing)) {
      forbidden.push(id);
      continue;
    }
    markSelesai(groupId, id);
    done.push(id);
  }

  const lines: string[] = [];
  if (done.length) lines.push(`✅ Ditandai selesai: ${done.map((i) => `#${i}`).join(', ')}`);
  if (notFound.length)
    lines.push(`⚠️ Tidak ditemukan: ${notFound.map((i) => `#${i}`).join(', ')}`);
  if (forbidden.length)
    lines.push(`❌ Bukan admin/pembuat tugas: ${forbidden.map((i) => `#${i}`).join(', ')}`);

  await msg.reply(lines.join('\n'));
}

const HAPUS_USAGE = 'Gunakan: /tugas hapus <id> [id2 id3 ...] | /tugas hapus semua';

async function handleHapusSemua(msg: Message, groupId: number, senderId: string): Promise<void> {
  // Beda dengan /tugas selesai semua: hapus menyasar semua status (pending & selesai),
  // bukan cuma yang pending, karena tujuannya bersih-bersih daftar tugas.
  const all = listTasksByGroup(groupId);
  const eligible = all.filter((t) => canModifyTask(senderId, t));

  if (eligible.length === 0) {
    await msg.reply('Tidak ada tugas yang bisa kamu hapus.');
    return;
  }

  for (const t of eligible) deleteTask(groupId, t.id);

  const skipped = all.length - eligible.length;
  const skippedNote =
    skipped > 0 ? `\n(${skipped} tugas lain dilewati karena bukan admin/punya kamu)` : '';
  const idList = eligible.map((t) => `#${t.id}`).join(', ');
  await msg.reply(`🗑️ ${eligible.length} tugas dihapus: ${idList}${skippedNote}`);
}

async function handleHapus(msg: Message, groupId: number, argsStr: string): Promise<void> {
  const trimmed = argsStr.trim();
  if (!trimmed) {
    await msg.reply(HAPUS_USAGE);
    return;
  }

  const senderId = getSenderId(msg);

  if (trimmed.toLowerCase() === 'semua') {
    return handleHapusSemua(msg, groupId, senderId);
  }

  const ids = trimmed
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((s) => parseInt(s, 10));

  if (ids.length === 0 || ids.some((id) => !Number.isFinite(id))) {
    await msg.reply(HAPUS_USAGE);
    return;
  }

  const done: number[] = [];
  const notFound: number[] = [];
  const forbidden: number[] = [];

  for (const id of ids) {
    const existing = getTaskById(groupId, id);
    if (!existing) {
      notFound.push(id);
      continue;
    }
    if (!canModifyTask(senderId, existing)) {
      forbidden.push(id);
      continue;
    }
    deleteTask(groupId, id);
    done.push(id);
  }

  const lines: string[] = [];
  if (done.length) lines.push(`🗑️ Dihapus: ${done.map((i) => `#${i}`).join(', ')}`);
  if (notFound.length)
    lines.push(`⚠️ Tidak ditemukan: ${notFound.map((i) => `#${i}`).join(', ')}`);
  if (forbidden.length)
    lines.push(`❌ Bukan admin/pembuat tugas: ${forbidden.map((i) => `#${i}`).join(', ')}`);

  await msg.reply(lines.join('\n'));
}

export async function handleTugas(msg: Message, chat: Chat, argsStr: string): Promise<void> {
  const group = await getRegisteredGroupOrReply(msg, chat);
  if (!group) return;

  const subRaw = argsStr.split(/\s+/)[0];
  const sub = (subRaw || '').toLowerCase();
  const subArgsStr = argsStr.slice(subRaw?.length || 0).trim();

  switch (sub) {
    case 'tambah':
      return handleTambah(msg, group.id, subArgsStr);
    case 'list':
      return handleList(msg, group.id);
    case 'selesai':
      return handleSelesai(msg, group.id, subArgsStr);
    case 'hapus':
      return handleHapus(msg, group.id, subArgsStr);
    default:
      await msg.reply(
        'Subcommand tidak dikenali.\nGunakan: /tugas tambah | /tugas list | /tugas selesai <id...|semua> | /tugas hapus <id...|semua>'
      );
  }
}
