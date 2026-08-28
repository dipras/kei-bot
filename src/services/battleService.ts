import { pickRandomSkill, type SkillEffect } from './battleSkills';

const MAX_HP = 100;
const TIMEOUT_MS = 5 * 60 * 1000;
const HP_BAR_BLOCKS = 10;
const MISS_CHANCE = 0.05;
const CRIT_MULTIPLIER = 1.8;
const DEFEND_REDUCTION = 0.5;

const POISON_DAMAGE = 8;
const POISON_DURATION = 3; // giliran si korban sendiri
const SLEEP_SKIP_TURNS = 1;
const CONFUSE_DURATION = 2; // giliran si korban sendiri
const CONFUSE_FUMBLE_CHANCE = 0.5;

export type BattleAction = 'attack' | 'defend' | 'heal';

interface Fighter {
  id: string;
  name: string;
  hp: number;
  defending: boolean;
  asleepTurns: number;
  poisonTurns: number;
  confuseTurns: number;
}

interface Battle {
  fighters: [Fighter, Fighter];
  turnIndex: 0 | 1;
  timeout: NodeJS.Timeout;
  onTimeout: () => Promise<void>;
}

export type ActionOutcome =
  | { ok: false; reason: 'no-battle' }
  | { ok: false; reason: 'not-participant' }
  | { ok: false; reason: 'not-your-turn'; currentTurnName: string }
  | { ok: true; log: string; finished: boolean };

const METEOR_DAMAGE = 9999;

export type MeteorOutcome =
  | { ok: false; reason: 'no-battle' }
  | { ok: false; reason: 'not-participant' }
  | { ok: true; log: string };

// State battle cuma hidup selama proses jalan (in-memory) — ini fitur hiburan sesaat,
// bukan data yang perlu tahan restart kayak tugas di SQLite.
const activeBattles = new Map<string, Battle>();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function otherIndex(index: 0 | 1): 0 | 1 {
  return index === 0 ? 1 : 0;
}

function formatHpBar(fighter: Fighter): string {
  const filled = Math.round((Math.max(0, fighter.hp) / MAX_HP) * HP_BAR_BLOCKS);
  const bar = '█'.repeat(filled) + '░'.repeat(HP_BAR_BLOCKS - filled);
  const emoji = fighter.hp <= 0 ? '💀' : '❤️';
  return `${emoji} ${fighter.name}: [${bar}] ${Math.max(0, fighter.hp)}/${MAX_HP}`;
}

function applyEffect(effect: SkillEffect, target: Fighter): string {
  if (effect === 'poison') {
    target.poisonTurns = POISON_DURATION;
    return `\n☠️ ${target.name} keracunan! -${POISON_DAMAGE} HP selama ${POISON_DURATION} giliran ke depan.`;
  }
  if (effect === 'sleep') {
    target.asleepTurns = SLEEP_SKIP_TURNS;
    return `\n💤 ${target.name} tertidur! Bakal skip giliran berikutnya.`;
  }
  target.confuseTurns = CONFUSE_DURATION;
  return `\n🌀 ${target.name} bingung! Aksinya bisa gagal ${CONFUSE_DURATION} giliran ke depan.`;
}

function performSkillAttack(attacker: Fighter, defender: Fighter): string {
  const skill = pickRandomSkill();

  if (Math.random() < MISS_CHANCE) {
    return `💨 ${attacker.name} pakai *${skill.emoji} ${skill.name}* ke ${defender.name}... tapi meleset!`;
  }

  let damage = randomInt(skill.minDamage, skill.maxDamage);
  let critText = '';
  if (Math.random() < skill.critChance) {
    damage = Math.round(damage * CRIT_MULTIPLIER);
    critText = ' 💥 CRITICAL!';
  }

  if (defender.defending) {
    damage = Math.round(damage * DEFEND_REDUCTION);
    defender.defending = false;
  }

  defender.hp = Math.max(0, defender.hp - damage);

  let effectText = '';
  if (skill.effect && defender.hp > 0 && Math.random() < skill.effectChance) {
    effectText = applyEffect(skill.effect, defender);
  }

  return `${skill.emoji} ${attacker.name} pakai *${skill.name}* ke ${defender.name}: ${damage} damage!${critText}${effectText}`;
}

function performDefend(fighter: Fighter): string {
  fighter.defending = true;
  return `🛡️ ${fighter.name} bersiap bertahan — damage serangan berikutnya berkurang 50%.`;
}

function performHeal(fighter: Fighter): string {
  const heal = randomInt(10, 15);
  const before = fighter.hp;
  fighter.hp = Math.min(MAX_HP, fighter.hp + heal);
  return `💚 ${fighter.name} memulihkan ${fighter.hp - before} HP.`;
}

/**
 * Proses efek yang berjalan di awal giliran (racun tick, cek tidur) buat fighter yang
 * SEKARANG gilirannya, sebelum dia sempat kirim command aksi. Kalau dia lagi tidur,
 * giliran otomatis di-skip balik ke lawan (loop sampai ketemu fighter yang bisa beraksi
 * atau battle berakhir karena racun).
 */
function resolveTurnEffects(battle: Battle): { log: string[]; finished: boolean; winnerIndex?: 0 | 1 } {
  const log: string[] = [];

  for (let guard = 0; guard < 10; guard++) {
    const current = battle.fighters[battle.turnIndex];

    if (current.poisonTurns > 0) {
      current.poisonTurns--;
      current.hp = Math.max(0, current.hp - POISON_DAMAGE);
      log.push(`☠️ ${current.name} kena tick racun, -${POISON_DAMAGE} HP.`);
      if (current.hp <= 0) {
        return { log, finished: true, winnerIndex: otherIndex(battle.turnIndex) };
      }
    }

    if (current.asleepTurns > 0) {
      current.asleepTurns--;
      const otherFighter = battle.fighters[otherIndex(battle.turnIndex)];
      log.push(`💤 ${current.name} masih tertidur dan gagal beraksi! Giliran balik ke ${otherFighter.name}.`);
      battle.turnIndex = otherIndex(battle.turnIndex);
      continue;
    }

    break;
  }

  return { log, finished: false };
}

function scheduleTimeout(groupId: string, onTimeout: () => Promise<void>): NodeJS.Timeout {
  return setTimeout(() => {
    activeBattles.delete(groupId);
    onTimeout().catch((err) => console.error('[battle] Gagal kirim pesan timeout:', err));
  }, TIMEOUT_MS);
}

export function hasActiveBattle(groupId: string): boolean {
  return activeBattles.has(groupId);
}

export function startBattle(
  groupId: string,
  challenger: { id: string; name: string },
  target: { id: string; name: string },
  onTimeout: () => Promise<void>
): void {
  const makeFighter = (f: { id: string; name: string }): Fighter => ({
    id: f.id,
    name: f.name,
    hp: MAX_HP,
    defending: false,
    asleepTurns: 0,
    poisonTurns: 0,
    confuseTurns: 0,
  });

  const battle: Battle = {
    fighters: [makeFighter(challenger), makeFighter(target)],
    turnIndex: 0,
    onTimeout,
    timeout: scheduleTimeout(groupId, onTimeout),
  };
  activeBattles.set(groupId, battle);
}

export function applyAction(
  groupId: string,
  senderId: string,
  action: BattleAction
): ActionOutcome {
  const battle = activeBattles.get(groupId);
  if (!battle) return { ok: false, reason: 'no-battle' };

  const fighterIndex = battle.fighters.findIndex((f) => f.id === senderId) as 0 | 1 | -1;
  if (fighterIndex === -1) return { ok: false, reason: 'not-participant' };

  if (fighterIndex !== battle.turnIndex) {
    return {
      ok: false,
      reason: 'not-your-turn',
      currentTurnName: battle.fighters[battle.turnIndex].name,
    };
  }

  const self = battle.fighters[fighterIndex];
  const opponent = battle.fighters[otherIndex(fighterIndex)];
  const logParts: string[] = [];

  let fumbled = false;
  if (self.confuseTurns > 0) {
    self.confuseTurns--;
    if (Math.random() < CONFUSE_FUMBLE_CHANCE) {
      fumbled = true;
      logParts.push(`😵 ${self.name} lagi bingung dan gagal ngelakuin aksinya!`);
    }
  }

  if (!fumbled) {
    if (action === 'attack') logParts.push(performSkillAttack(self, opponent));
    else if (action === 'defend') logParts.push(performDefend(self));
    else logParts.push(performHeal(self));
  }

  clearTimeout(battle.timeout);

  if (opponent.hp <= 0) {
    activeBattles.delete(groupId);
    logParts.push(`\n🏆 *${self.name} menang!* ${opponent.name} kehabisan HP.`);
    return { ok: true, log: logParts.join(''), finished: true };
  }

  battle.turnIndex = otherIndex(fighterIndex);
  const effects = resolveTurnEffects(battle);
  logParts.push(...effects.log.map((l) => `\n${l}`));

  if (effects.finished) {
    const winner = battle.fighters[effects.winnerIndex!];
    const loser = battle.fighters[otherIndex(effects.winnerIndex!)];
    activeBattles.delete(groupId);
    logParts.push(`\n\n🏆 *${winner.name} menang!* ${loser.name} kehabisan HP.`);
    return { ok: true, log: logParts.join(''), finished: true };
  }

  battle.timeout = scheduleTimeout(groupId, battle.onTimeout);

  const hpLines = `${formatHpBar(battle.fighters[0])}\n${formatHpBar(battle.fighters[1])}`;
  const nextTurnName = battle.fighters[battle.turnIndex].name;
  logParts.push(`\n\n${hpLines}\n➡️ Giliran: ${nextTurnName}`);

  return { ok: true, log: logParts.join(''), finished: false };
}

/**
 * Hidden command /meteor — gak didaftarkan di /help. Admin dapet insta-kill ke lawan
 * (cheat code), non-admin ke-backfire ke diri sendiri. Sengaja gak peduli giliran siapa
 * sekarang — ini "cheat", bukan aksi battle biasa.
 */
export function applyMeteor(groupId: string, senderId: string, isAdmin: boolean): MeteorOutcome {
  const battle = activeBattles.get(groupId);
  if (!battle) return { ok: false, reason: 'no-battle' };

  const fighterIndex = battle.fighters.findIndex((f) => f.id === senderId) as 0 | 1 | -1;
  if (fighterIndex === -1) return { ok: false, reason: 'not-participant' };

  const self = battle.fighters[fighterIndex];
  const opponent = battle.fighters[otherIndex(fighterIndex)];

  clearTimeout(battle.timeout);
  activeBattles.delete(groupId);

  if (isAdmin) {
    opponent.hp = Math.max(0, opponent.hp - METEOR_DAMAGE);
    const log =
      `☄️☄️☄️ *METEOR!* ☄️☄️☄️\n${self.name} manggil hujan meteor ke ${opponent.name}: -${METEOR_DAMAGE} HP!\n\n` +
      `🏆 *${self.name} menang!* ${opponent.name} hancur lebur.`;
    return { ok: true, log };
  }

  self.hp = Math.max(0, self.hp - METEOR_DAMAGE);
  const log =
    `☄️☄️☄️ *METEOR!* ☄️☄️☄️\n${self.name} mencoba memanggil meteor, tapi tololnya dia ikut terledakan jadi berkeping keping! -${METEOR_DAMAGE} HP!\n\n` +
    `Gak ada yang menang, karena ada orang tolol manggil meteor gak mikir-mikir`;
  return { ok: true, log };
}
