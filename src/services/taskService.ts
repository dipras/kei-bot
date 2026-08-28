import { db } from '../db';
import type { TaskRow, TaskWithGroup } from '../types';

export function addTask(
  groupId: number,
  deskripsi: string,
  deadlineIso: string | null,
  dibuatOleh: string
): TaskRow {
  const info = db
    .prepare(
      'INSERT INTO tasks (group_id, deskripsi, deadline, dibuat_oleh) VALUES (?, ?, ?, ?)'
    )
    .run(groupId, deskripsi, deadlineIso, dibuatOleh);
  return getTaskById(groupId, Number(info.lastInsertRowid))!;
}

export function getTaskById(groupId: number, id: number): TaskRow | undefined {
  return db
    .prepare('SELECT * FROM tasks WHERE id = ? AND group_id = ?')
    .get(id, groupId) as TaskRow | undefined;
}

export function listTasksByGroup(groupId: number): TaskRow[] {
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE group_id = ?
       ORDER BY
         CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,
         deadline ASC,
         created_at ASC`
    )
    .all(groupId) as TaskRow[];
}

export function listPendingWithDeadline(groupId: number): TaskRow[] {
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE group_id = ? AND status = 'pending' AND deadline IS NOT NULL
       ORDER BY deadline ASC`
    )
    .all(groupId) as TaskRow[];
}

export function markSelesai(groupId: number, id: number): TaskRow | undefined {
  const task = getTaskById(groupId, id);
  if (!task) return undefined;
  db.prepare("UPDATE tasks SET status = 'selesai' WHERE id = ?").run(id);
  return getTaskById(groupId, id);
}

export function deleteTask(groupId: number, id: number): boolean {
  const info = db.prepare('DELETE FROM tasks WHERE id = ? AND group_id = ?').run(id, groupId);
  return info.changes > 0;
}

export function listAllPendingWithDeadlineDue(): TaskWithGroup[] {
  return db
    .prepare(
      `SELECT tasks.*, groups.wa_chat_id AS wa_chat_id
       FROM tasks
       JOIN groups ON groups.id = tasks.group_id
       WHERE tasks.status = 'pending' AND tasks.deadline IS NOT NULL
         AND (tasks.reminded_1d = 0 OR tasks.reminded_3h = 0)`
    )
    .all() as TaskWithGroup[];
}

export function markReminded(id: number, field: 'reminded_1d' | 'reminded_3h'): void {
  db.prepare(`UPDATE tasks SET ${field} = 1 WHERE id = ?`).run(id);
}
