// Staged screenshots: ?shot= poses the game into a readable scene and steps
// the simulation a fixed number of frames, so every capture is a real render
// of the game's own code in a deterministic state. main.js calls poseShot
// once at boot, then raises window.__shotReady after the next painted frame.
//   ?shot=title  — title screen with controls
//   ?shot=play   — wave-2 fight (seed 3)
//   ?shot=war    — wave-4 bulwark fight (seed 7)
//   ?shot=over   — game-over results after wave 3
import { ARENA } from './config.js';
import { makeRng } from './random.js';
import { spawnShard, createSpore } from './entities.js';

function scriptedInput(game, aimAt, firing = true) {
  return {
    left: false, right: false, up: false, down: false,
    firing,
    mouseX: aimAt ? aimAt.x : game.world.player.x + 200,
    mouseY: aimAt ? aimAt.y : game.world.player.y - 100,
  };
}

function centroid(shards) {
  if (shards.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const s of shards) {
    x += s.x;
    y += s.y;
  }
  return { x: x / shards.length, y: y / shards.length };
}

function placeShard(game, rng, kind, x, y) {
  const shard = spawnShard(kind, rng);
  shard.x = x;
  shard.y = y;
  shard.vx = rng.range(-30, 30);
  shard.vy = rng.range(-30, 30);
  game.world.shards.push(shard);
  return shard;
}

// A few bolts already in flight along the player's aim, so the capture reads
// as a fight in progress rather than a posed still life.
function seedBullets(game) {
  const p = game.world.player;
  const aim = centroid(game.world.shards) ?? { x: p.x + 200, y: p.y - 100 };
  const angle = Math.atan2(aim.y - p.y, aim.x - p.x);
  p.angle = angle;
  for (const dist of [70, 150, 240]) {
    game.world.bullets.push({
      x: p.x + Math.cos(angle) * dist,
      y: p.y + Math.sin(angle) * dist,
      vx: Math.cos(angle) * 640,
      vy: Math.sin(angle) * 640,
      radius: 4,
      life: 1.1,
    });
  }
}

function stepFight(game, seconds, fire = true) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    game.api.update(1 / 60, scriptedInput(game, centroid(game.world.shards), fire));
  }
  seedBullets(game);
  game.renderer.draw(game.world);
}

export function poseShot(game, kind, seed) {
  const rng = makeRng(seed);
  const world = game.world;

  if (kind === 'title') {
    // Title as booted; a few frames of star twinkle and the pulse.
    for (let i = 0; i < 30; i++) game.api.update(1 / 60, scriptedInput(game, null));
    game.renderer.draw(world);
    return;
  }

  game.api.startGame();
  // startGame replaces the player object: re-read it after the call.
  const player = world.player;

  if (kind === 'play') {
    world.wave = 2;
    world.waveState = 'fighting';
    player.x = 400;
    player.y = 430;
    player.weaponLevel = 2;
    player.spores = 5;
    world.score = 240;
    world.kills = 19;
    world.comboKills = 9;
    world.comboTimer = 3;
    world.multiplier = 2;
    // Shards spread across the right two-thirds, far enough that the short
    // warm-up never lets one touch the player (a hit would reset the combo).
    placeShard(game, rng, 'drifter', 760, 180);
    placeShard(game, rng, 'weaver', 900, 300);
    placeShard(game, rng, 'drifter', 1050, 150);
    placeShard(game, rng, 'weaver', 980, 470);
    placeShard(game, rng, 'drifter', 1150, 330);
    placeShard(game, rng, 'weaver', 830, 560);
    placeShard(game, rng, 'drifter', 1120, 590);
    placeShard(game, rng, 'drifter', 700, 620);
    for (let i = 0; i < 4; i++) world.spores.push(createSpore(520 + i * 40, 300 + i * 26, rng));
    stepFight(game, 0.7);
    return;
  }

  if (kind === 'war') {
    world.wave = 4;
    world.waveState = 'fighting';
    player.x = 360;
    player.y = 500;
    player.weaponLevel = 3;
    player.spores = 9;
    world.score = 860;
    world.kills = 61;
    world.comboKills = 17;
    world.comboTimer = 3.5;
    world.multiplier = 3;
    world.novas = 1;
    // Both bulwarks placed where they read clearly, flanked by escorts.
    placeShard(game, rng, 'bulwark', 880, 280);
    placeShard(game, rng, 'bulwark', 1040, 470);
    placeShard(game, rng, 'drifter', 760, 180);
    placeShard(game, rng, 'weaver', 950, 170);
    placeShard(game, rng, 'stinger', 1150, 300);
    placeShard(game, rng, 'weaver', 830, 580);
    placeShard(game, rng, 'drifter', 1140, 600);
    for (let i = 0; i < 3; i++) world.spores.push(createSpore(520 + i * 36, 340 + i * 30, rng));
    // Warm up WITHOUT firing: the triple fan would shred both bulwarks in
    // under a second, and the shot is about the bulwark fight.
    stepFight(game, 0.9, false);
    return;
  }

  if (kind === 'over') {
    world.wave = 3;
    world.score = 1240;
    world.kills = 87;
    world.novas = 2;
    player.weaponLevel = 3;
    player.hearts = 0;
    placeShard(game, rng, 'drifter', 880, 500);
    placeShard(game, rng, 'weaver', 1080, 430);
    placeShard(game, rng, 'drifter', 980, 560);
    game.api.endGame();
    game.renderer.draw(world);
    return;
  }

  // Unknown ?shot= value: fall back to the title.
  game.renderer.draw(world);
}
