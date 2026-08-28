export type SkillEffect = 'poison' | 'sleep' | 'confuse';

export interface Skill {
  name: string;
  emoji: string;
  minDamage: number;
  maxDamage: number;
  critChance: number;
  effect?: SkillEffect;
  effectChance: number;
}

// Damage lebih rendah dari skill normal itu wajar buat skill yang bawa efek —
// trade-off: kurang damage instan, tapi ganggu lawan beberapa giliran ke depan.
export const SKILLS: Skill[] = [
  { name: 'Tebasan Biasa', emoji: '⚔️', minDamage: 18, maxDamage: 30, critChance: 0.2, effectChance: 0 },
  { name: 'Hantaman Berat', emoji: '🔨', minDamage: 28, maxDamage: 45, critChance: 0.25, effectChance: 0 },
  {
    name: 'Gigitan Racun',
    emoji: '🐍',
    minDamage: 12,
    maxDamage: 22,
    critChance: 0.1,
    effect: 'poison',
    effectChance: 0.7,
  },
  {
    name: 'Serangan Tidur',
    emoji: '💤',
    minDamage: 5,
    maxDamage: 12,
    critChance: 0,
    effect: 'sleep',
    effectChance: 0.6,
  },
  {
    name: 'Serangan Bayangan',
    emoji: '🌀',
    minDamage: 16,
    maxDamage: 26,
    critChance: 0.15,
    effect: 'confuse',
    effectChance: 0.6,
  },
];

export function pickRandomSkill(): Skill {
  return SKILLS[Math.floor(Math.random() * SKILLS.length)];
}
