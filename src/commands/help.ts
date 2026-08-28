import type { Message } from 'whatsapp-web.js';

const HELP_TEXT = `🤖 *Kei-bot* — bantu koordinasi kelompok tugas kuliah

*Setup grup (admin-only)*
/setup <Matkul> | <Nama Kelompok>
  Contoh: /setup Basis Data | Kelompok 3

*Tugas*
/tugas tambah <deskripsi> | <deadline>
  Deadline opsional, bisa absolut atau relatif.
  Absolut: DD-MM-YYYY HH:mm — contoh: /tugas tambah Kerjain ERD | 30-08-2026 23:59
  Relatif: 1 jam, 2 jam, 1 hari, 2 hari, besok, lusa — contoh: /tugas tambah Kerjain ERD | besok
/tugas list
  Lihat semua tugas, urut deadline terdekat.
/tugas selesai <id>
  Tandai tugas selesai (admin atau pembuat tugas itu sendiri).
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
