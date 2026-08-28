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
      'Format salah.\nGunakan: /tugas tambah <deskripsi> | <deadline DD-MM-YYYY HH:mm>\nDeadline opsional. Contoh: /tugas tambah Kerjain ERD | 30-08-2026 23:59'
    );
    return;
  }

  let deadlineIso: string | null = null;
  if (deadlineStr) {
    const parsed = parseDeadline(deadlineStr);
    if (!parsed) {
      await msg.reply(
        '⚠️ Format deadline salah. Gunakan format: DD-MM-YYYY HH:mm\nContoh: 30-08-2026 23:59'
      );
      return;
    }
    deadlineIso = parsed.toISOString();
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

async function handleSelesai(msg: Message, groupId: number, argsStr: string): Promise<void> {
  const id = parseInt(argsStr.trim(), 10);
  if (!Number.isFinite(id)) {
    await msg.reply('Gunakan: /tugas selesai <id>');
    return;
  }
  const existing = getTaskById(groupId, id);
  if (!existing) {
    await msg.reply(`⚠️ Tugas #${id} tidak ditemukan.`);
    return;
  }
  const updated = markSelesai(groupId, id);
  await msg.reply(`✅ Tugas #${updated!.id} ditandai selesai: ${updated!.deskripsi}`);
}

async function handleHapus(msg: Message, groupId: number, argsStr: string): Promise<void> {
  const id = parseInt(argsStr.trim(), 10);
  if (!Number.isFinite(id)) {
    await msg.reply('Gunakan: /tugas hapus <id>');
    return;
  }
  const existing = getTaskById(groupId, id);
  if (!existing) {
    await msg.reply(`⚠️ Tugas #${id} tidak ditemukan.`);
    return;
  }

  const senderId = getSenderId(msg);
  const senderIsAdmin = isAdmin(senderId, config.adminNumbers);
  const senderIsCreator = normalizeNumber(senderId) === existing.dibuat_oleh;
  if (!senderIsAdmin && !senderIsCreator) {
    await msg.reply('❌ Hanya admin atau pembuat tugas ini yang boleh menghapusnya.');
    return;
  }

  deleteTask(groupId, id);
  await msg.reply(`🗑️ Tugas #${id} dihapus: ${existing.deskripsi}`);
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
        'Subcommand tidak dikenali.\nGunakan: /tugas tambah | /tugas list | /tugas selesai <id> | /tugas hapus <id>'
      );
  }
}
