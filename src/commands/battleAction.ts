import type { Chat, Message } from 'whatsapp-web.js';
import { applyAction, type BattleAction } from '../services/battleService';
import { getSenderId, requireGroupChat } from './shared';

async function handleBattleAction(msg: Message, chat: Chat, action: BattleAction): Promise<void> {
  if (!(await requireGroupChat(msg, chat))) return;

  const groupId = chat.id._serialized;
  const senderId = getSenderId(msg);
  const result = applyAction(groupId, senderId, action);

  if (!result.ok) {
    switch (result.reason) {
      case 'no-battle':
        await msg.reply('Gak ada battle yang lagi jalan di grup ini. Mulai dengan /challenge @target');
        return;
      case 'not-participant':
        await msg.reply('Kamu bukan peserta battle yang lagi jalan di grup ini.');
        return;
      case 'not-your-turn':
        await msg.reply(`⏳ Bukan giliran kamu. Giliran: ${result.currentTurnName}`);
        return;
    }
  }

  await msg.reply(result.log);
}

export const handleAttack = (msg: Message, chat: Chat) => handleBattleAction(msg, chat, 'attack');
export const handleDefend = (msg: Message, chat: Chat) => handleBattleAction(msg, chat, 'defend');
export const handleHeal = (msg: Message, chat: Chat) => handleBattleAction(msg, chat, 'heal');
