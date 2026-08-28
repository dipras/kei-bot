export interface GroupRow {
  id: number;
  wa_chat_id: string;
  matkul: string;
  nama_kelompok: string;
  created_at: string;
}

export type TaskStatus = 'pending' | 'selesai';

export interface TaskRow {
  id: number;
  group_id: number;
  deskripsi: string;
  deadline: string | null;
  status: TaskStatus;
  dibuat_oleh: string;
  reminded_1d: number;
  reminded_3h: number;
  created_at: string;
}

export interface TaskWithGroup extends TaskRow {
  wa_chat_id: string;
}
