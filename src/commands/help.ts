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
/tugas selesai <id> [id2 id3 ...]
  Tandai satu atau beberapa tugas selesai (admin atau pembuat tugas itu sendiri).
  Contoh: /tugas selesai 3 5 7
/tugas selesai semua
  Tandai semua tugas pending yang boleh kamu ubah jadi selesai sekaligus.
/tugas hapus <id> [id2 id3 ...]
  Hapus satu atau beberapa tugas (admin atau pembuat tugas itu sendiri).
  Contoh: /tugas hapus 3 5 7
/tugas hapus semua
  Hapus semua tugas (pending & selesai) yang boleh kamu hapus sekaligus.

*Deadline*
/deadline
  Daftar tugas pending yang punya deadline, urut paling mendekat.

*Anggota*
/anggota
  Daftar member grup WA ini.

*Rangkuman diskusi (AI)*
/rangkum [jumlah_pesan]
  Rangkum N pesan terakhir (default 50) pakai AI.

*Minigame RPG*
/challenge @target
  Tantang member lain buat battle 1v1. Cuma satu battle aktif per grup.
/attack | /defend | /heal
  Aksi giliran kamu di battle yang lagi jalan.
  attack: pakai skill random (damage beda-beda, ada yang bawa efek: ☠️ racun, 💤 tidur, 🌀 bingung)
  defend: kurangi 50% damage serangan berikutnya | heal: pulihkan HP.
  Battle otomatis berakhir kalau 5 menit gak ada aksi dari siapa pun.

*Lainnya*
/help
  Tampilkan pesan ini.`;

export async function handleHelp(msg: Message): Promise<void> {
  await msg.reply(HELP_TEXT);
}
