// VOIDBLOOM — central tuning. One place holds every number the game plays by,
// so balance changes never scatter through the simulation or the renderer.
export const ARENA = { width: 1280, height: 720 };

export const PLAYER = {
  radius: 16,
  accel: 2400,
  maxSpeed: 340,
  drag: 0.88,
  fireInterval: 0.14,
  bulletSpeed: 640,
  maxHearts: 3,
  invulnerableSeconds: 1.2,
};

export const WEAPONS = [
  null, // level 0: unused
  { streams: 1, spread: 0 }, // level 1: single bolt
  { streams: 2, spread: 0.1 }, // level 2: twin bolts
  { streams: 3, spread: 0.16 }, // level 3: triple fan
  { streams: 4, spread: 0.22 }, // level 4: quad fan
  { streams: 5, spread: 0.3 }, // level 5: five-way bloom
];
export const MAX_WEAPON_LEVEL = 5;
export const SPORES_PER_BLOOM = 12;

export const SHARDS = {
  drifter: { hp: 1, radius: 14, speed: 95, score: 10, color: '#ff4fd8', sporeDrops: 1 },
  weaver: { hp: 1, radius: 13, speed: 105, score: 15, color: '#ffb02e', sporeDrops: 1 },
  stinger: { hp: 2, radius: 13, speed: 70, dashSpeed: 430, score: 25, color: '#ff3b4e', sporeDrops: 1 },
  bulwark: { hp: 6, radius: 26, speed: 46, score: 50, color: '#a78bff', sporeDrops: 3 },
};

// Which kinds may appear in each wave, and how many shards the wave holds.
export function wavePlan(wave) {
  const count = 6 + wave * 4;
  const kinds = ['drifter'];
  if (wave >= 2) kinds.push('weaver');
  if (wave >= 3) kinds.push('stinger');
  if (wave >= 4) kinds.push('bulwark');
  return { count, kinds };
}

export const COMBO = {
  killsPerStep: 8, // every 8 unbroken kills the multiplier climbs one step
  maxMultiplier: 5,
  windowSeconds: 4, // a kill inside this window keeps the streak alive
};

export const COLORS = {
  background: '#05060f',
  grid: 'rgba(90, 120, 255, 0.07)',
  player: '#37f5d6',
  playerCore: '#eafffb',
  bullet: '#9df2ff',
  spore: '#7dff6a',
  heart: '#ff5d7a',
  text: '#dfe6ff',
  dimText: '#8b93b8',
  nova: '#b8ff5e',
};

export const STORAGE_BEST_KEY = 'voidbloom.best.score';
