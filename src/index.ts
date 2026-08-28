import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import './db'; // memastikan skema DB ter-inisialisasi sebelum client siap
import { routeCommand } from './commands';
import { startReminderService } from './services/reminderService';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('Scan QR code berikut dengan WhatsApp di HP kamu (WhatsApp > Linked Devices):');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('[Kei-bot] Siap! Bot sudah terhubung ke WhatsApp.');
  startReminderService(client);
});

client.on('auth_failure', (msg) => {
  console.error('[Kei-bot] Autentikasi gagal:', msg);
});

client.on('disconnected', (reason) => {
  console.error('[Kei-bot] Terputus dari WhatsApp:', reason);
});

client.on('message', async (msg) => {
  try {
    if (!msg.body || !msg.body.trim().startsWith('/')) return;

    const chat = await msg.getChat();
    await routeCommand(msg, chat, client);
  } catch (err) {
    console.error('[Kei-bot] Error saat memproses pesan:', err);
    try {
      await msg.reply('❌ Terjadi error saat memproses command.');
    } catch {
      // abaikan kalau reply pun gagal
    }
  }
});

client.initialize();

process.on('unhandledRejection', (reason) => {
  console.error('[Kei-bot] Unhandled rejection:', reason);
});
