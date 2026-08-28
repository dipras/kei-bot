import type { Chat, Client, Message } from 'whatsapp-web.js';
import { handleSetup } from './setup';
import { handleTugas } from './tugas';
import { handleDeadline } from './deadline';
import { handleAnggota } from './anggota';
import { handleRangkum } from './rangkum';
import { handleHelp } from './help';
import { handleChallenge } from './challenge';
import { handleAttack, handleDefend, handleHeal } from './battleAction';
import { handleMeteor } from './meteor';

export async function routeCommand(msg: Message, chat: Chat, client: Client): Promise<void> {
  const raw = msg.body.trim();
  const spaceIdx = raw.search(/\s/);
  const cmdRaw = spaceIdx === -1 ? raw : raw.slice(0, spaceIdx);
  const argsStr = spaceIdx === -1 ? '' : raw.slice(spaceIdx + 1).trim();
  const cmd = cmdRaw.toLowerCase();

  switch (cmd) {
    case '/setup':
      return handleSetup(msg, chat, argsStr);
    case '/tugas':
      return handleTugas(msg, chat, argsStr);
    case '/deadline':
      return handleDeadline(msg, chat);
    case '/anggota':
      return handleAnggota(msg, chat, client);
    case '/rangkum':
      return handleRangkum(msg, chat, argsStr, client);
    case '/help':
      return handleHelp(msg);
    case '/challenge':
    case '/challange':
      return handleChallenge(msg, chat, client);
    case '/attack':
      return handleAttack(msg, chat);
    case '/defend':
      return handleDefend(msg, chat);
    case '/heal':
      return handleHeal(msg, chat);
    case '/meteor':
      return handleMeteor(msg, chat);
    default:
      await msg.reply(`Command tidak dikenali: ${cmdRaw}\nKetik /help untuk lihat daftar command.`);
  }
}
