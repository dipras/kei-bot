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
  { name: 'Tebasan Biasa', emoji: '⚔️', minDamage: 10, maxDamage: 18, critChance: 0.15, effectChance: 0 },
  { name: 'Hantaman Berat', emoji: '🔨', minDamage: 16, maxDamage: 26, critChance: 0.2, effectChance: 0 },
  {
    name: 'Gigitan Racun',
    emoji: '🐍',
    minDamage: 6,
    maxDamage: 12,
    critChance: 0.05,
    effect: 'poison',
    effectChance: 0.7,
  },
  {
    name: 'Serangan Tidur',
    emoji: '💤',
    minDamage: 2,
    maxDamage: 6,
    critChance: 0,
    effect: 'sleep',
    effectChance: 0.6,
  },
  {
    name: 'Serangan Bayangan',
    emoji: '🌀',
    minDamage: 8,
    maxDamage: 14,
    critChance: 0.1,
    effect: 'confuse',
    effectChance: 0.6,
  },
];

export function pickRandomSkill(): Skill {
  return SKILLS[Math.floor(Math.random() * SKILLS.length)];
}
