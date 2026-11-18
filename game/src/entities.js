// Entities: the player ship, its bolts, the four shard kinds, and the two
// pickups (spores and hearts). Each factory returns a plain object; update
// functions live in world.js, drawing lives in render.js — this file only
// knows how an entity is born and what it is.
import { ARENA, PLAYER, SHARDS } from './config.js';

export function createPlayer() {
  return {
    x: ARENA.width / 2,
    y: ARENA.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: PLAYER.radius,
    hearts: PLAYER.maxHearts,
    invulnerableUntil: 0,
    fireCooldown: 0,
    weaponLevel: 1,
    spores: 0,
    trailTimer: 0,
  };
}

export function createBullet(x, y, angle) {
  return {
    x, y,
    vx: Math.cos(angle) * PLAYER.bulletSpeed,
    vy: Math.sin(angle) * PLAYER.bulletSpeed,
    radius: 4,
    life: 1.1,
  };
}

// A shard spawns just outside a random arena edge, aimed roughly inward.
export function spawnShard(kind, rng) {
  const spec = SHARDS[kind];
  const edge = rng.int(0, 3);
  const margin = 30;
  let x;
  let y;
  if (edge === 0) { x = rng.range(0, ARENA.width); y = -margin; }
  else if (edge === 1) { x = ARENA.width + margin; y = rng.range(0, ARENA.height); }
  else if (edge === 2) { x = rng.range(0, ARENA.width); y = ARENA.height + margin; }
  else { x = -margin; y = rng.range(0, ARENA.height); }
  return {
    kind,
    x, y,
    vx: 0, vy: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    radius: spec.radius,
    speed: spec.speed * rng.range(0.85, 1.2),
    color: spec.color,
    // Weaver strafe phase, stinger telegraph state, bulwark split flag.
    phase: rng.range(0, Math.PI * 2),
    state: 'chase',
    stateTimer: rng.range(0.4, 1.4),
    dashX: 0,
    dashY: 0,
    flash: 0,
    spin: rng.range(-1.2, 1.2),
    rotation: rng.range(0, Math.PI * 2),
  };
}

export function createSpore(x, y, rng) {
  const angle = rng.angle();
  const speed = rng.range(30, 90);
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 7,
    life: 9,
    bob: rng.range(0, Math.PI * 2),
  };
}

export function createHeart(x, y) {
  return { x, y, vx: 0, vy: -14, radius: 11, life: 10, bob: 0 };
}
