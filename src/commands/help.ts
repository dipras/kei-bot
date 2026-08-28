import type { Message } from 'whatsapp-web.js';

const HELP_TEXT = `🤖 *Kei-bot* — bantu koordinasi kelompok tugas kuliah

*Setup grup (admin-only)*
/setup <Matkul> | <Nama Kelompok>
  Contoh: /setup Basis Data | Kelompok 3

*Tugas*
/tugas tambah <deskripsi> | <deadline DD-MM-YYYY HH:mm>
  Deadline opsional. Contoh: /tugas tambah Kerjain ERD | 30-08-2026 23:59
/tugas list
  Lihat semua tugas, urut deadline terdekat.
/tugas selesai <id>
  Tandai tugas selesai.
/tugas hapus <id>
  Hapus tugas (admin atau pembuat tugas itu sendiri).

*Deadline*
/deadline
  Daftar tugas pending yang punya deadline, urut paling mendekat.

*Anggota*
/anggota
  Daftar member grup WA ini.

*Rangkuman diskusi (AI)*
/rangkum [jumlah_pesan]
  Rangkum N pesan terakhir (default 50) pakai AI.

*Lainnya*
/help
  Tampilkan pesan ini.`;

export async function handleHelp(msg: Message): Promise<void> {
  await msg.reply(HELP_TEXT);
}
