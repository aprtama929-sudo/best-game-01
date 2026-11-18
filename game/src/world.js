// The world: the state machine (title → playing → over), wave spawning,
// movement, collisions, the combo streak, spore blooms and the nova, and
// scoring. It owns no drawing and no DOM — render.js reads this state.
import { ARENA, PLAYER, WEAPONS, MAX_WEAPON_LEVEL, SPORES_PER_BLOOM, SHARDS, COMBO, wavePlan, STORAGE_BEST_KEY } from './config.js';
import { createPlayer, createBullet, spawnShard, createSpore, createHeart } from './entities.js';

export function loadBest() {
  try {
    return Number(window.localStorage.getItem(STORAGE_BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(STORAGE_BEST_KEY, String(score));
  } catch {
    // Private mode or file:// quirks: the best score is a nicety, not a load.
  }
}

export function createWorld(rng, audio, particles) {
  const world = {
    mode: 'title', // 'title' | 'playing' | 'over'
    time: 0,
    wave: 0,
    waveState: 'idle', // 'idle' | 'spawning' | 'fighting' | 'clear'
    spawnQueue: [],
    spawnTimer: 0,
    waveClearTimer: 0,
    player: createPlayer(),
    bullets: [],
    shards: [],
    spores: [],
    hearts: [],
    score: 0,
    best: loadBest(),
    kills: 0,
    comboKills: 0,
    comboTimer: 0,
    multiplier: 1,
    novas: 0,
    shake: 0,
    message: '',
    messageTimer: 0,
    particles,
  };

  function announce(text, seconds = 2) {
    world.message = text;
    world.messageTimer = seconds;
  }

  function startWave(n) {
    world.wave = n;
    const plan = wavePlan(n);
    const queue = [];
    for (let i = 0; i < plan.count; i++) {
      let kind = 'drifter';
      if (n >= 4 && i % 7 === 6) kind = 'bulwark';
      else if (n >= 3 && i % 5 === 4) kind = 'stinger';
      else if (n >= 2 && i % 3 === 2) kind = 'weaver';
      else kind = plan.kinds[rng.int(0, plan.kinds.length - 1)];
      queue.push(kind);
    }
    world.spawnQueue = queue;
    world.spawnTimer = 0;
    world.waveState = 'spawning';
    announce(`WAVE ${n}`, 1.6);
    audio.waveStart();
  }

  function startGame() {
    world.mode = 'playing';
    world.time = 0;
    world.wave = 0;
    world.player = createPlayer();
    world.bullets = [];
    world.shards = [];
    world.spores = [];
    world.hearts = [];
    world.score = 0;
    world.kills = 0;
    world.comboKills = 0;
    world.comboTimer = 0;
    world.multiplier = 1;
    world.novas = 0;
    world.shake = 0;
    particles.clear();
    startWave(1);
  }

  function endGame() {
    world.mode = 'over';
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.score);
    }
    audio.gameOver();
  }

  function bloomNova() {
    world.novas += 1;
    const p = world.player;
    if (p.weaponLevel < MAX_WEAPON_LEVEL) p.weaponLevel += 1;
    particles.ring(p.x, p.y, '#b8ff5e', 420);
    particles.burst(p.x, p.y, '#b8ff5e', 40, 420);
    audio.nova();
    announce(p.weaponLevel >= MAX_WEAPON_LEVEL ? 'NOVA! WEAPON MAXED' : `NOVA! WEAPON LEVEL ${p.weaponLevel}`, 1.8);
    // The nova clears the field: every shard on screen shatters for points.
    for (const shard of [...world.shards]) killShard(shard, true);
    world.shake = Math.max(world.shake, 10);
  }

  function addScore(base, x, y) {
    const gained = base * world.multiplier;
    world.score += gained;
    particles.popup(x, y, `+${gained}`, '#ffe066');
  }

  function killShard(shard, byNova = false) {
    const index = world.shards.indexOf(shard);
    if (index === -1) return;
    world.shards.splice(index, 1);
    world.kills += 1;
    world.comboKills += 1;
    world.comboTimer = COMBO.windowSeconds;
    world.multiplier = Math.min(
      COMBO.maxMultiplier,
      1 + Math.floor(world.comboKills / COMBO.killsPerStep),
    );
    const spec = SHARDS[shard.kind];
    addScore(spec.score, shard.x, shard.y);
    particles.burst(shard.x, shard.y, shard.color, shard.kind === 'bulwark' ? 26 : 14);
    if (!byNova) audio.shardDown();
    for (let i = 0; i < spec.sporeDrops; i++) {
      world.spores.push(createSpore(shard.x, shard.y, rng));
    }
    if (shard.kind === 'bulwark') {
      for (let i = 0; i < 3; i++) {
        const child = spawnShard('drifter', rng);
        child.x = shard.x + Math.cos((i / 3) * Math.PI * 2) * 30;
        child.y = shard.y + Math.sin((i / 3) * Math.PI * 2) * 30;
        world.shards.push(child);
      }
    }
    if (rng.next() < 0.06 && world.player.hearts < PLAYER.maxHearts) {
      world.hearts.push(createHeart(shard.x, shard.y));
    }
  }

  function hurtPlayer() {
    const p = world.player;
    if (world.time < p.invulnerableUntil) return;
    p.hearts -= 1;
    p.invulnerableUntil = world.time + PLAYER.invulnerableSeconds;
    world.comboKills = 0;
    world.comboTimer = 0;
    world.multiplier = 1;
    world.shake = 12;
    particles.burst(p.x, p.y, '#ff5d7a', 22);
    audio.hurt();
    if (p.hearts <= 0) endGame();
  }

  function fireWeapon() {
    const p = world.player;
    const weapon = WEAPONS[p.weaponLevel];
    const base = p.angle;
    for (let i = 0; i < weapon.streams; i++) {
      const offset = (i - (weapon.streams - 1) / 2) * weapon.spread;
      const muzzle = p.radius + 6;
      world.bullets.push(createBullet(
        p.x + Math.cos(base + offset) * muzzle,
        p.y + Math.sin(base + offset) * muzzle,
        base + offset,
      ));
    }
    p.fireCooldown = PLAYER.fireInterval;
    audio.shoot();
  }

  function updatePlaying(dt, input) {
    const p = world.player;
    world.time += dt;

    // Movement: acceleration toward the held direction, drag when idle.
    let ax = 0;
    let ay = 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (input.up) ay -= 1;
    if (input.down) ay += 1;
    if (ax !== 0 || ay !== 0) {
      const len = Math.hypot(ax, ay);
      p.vx += (ax / len) * PLAYER.accel * dt;
      p.vy += (ay / len) * PLAYER.accel * dt;
    }
    p.vx *= Math.pow(PLAYER.drag, dt * 60);
    p.vy *= Math.pow(PLAYER.drag, dt * 60);
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > PLAYER.maxSpeed) {
      p.vx = (p.vx / speed) * PLAYER.maxSpeed;
      p.vy = (p.vy / speed) * PLAYER.maxSpeed;
    }
    p.x = Math.min(ARENA.width - p.radius, Math.max(p.radius, p.x + p.vx * dt));
    p.y = Math.min(ARENA.height - p.radius, Math.max(p.radius, p.y + p.vy * dt));
    p.angle = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
    p.trailTimer -= dt;
    if (speed > 120 && p.trailTimer <= 0) {
      p.trailTimer = 0.05;
      particles.burst(p.x, p.y, '#37f5d6', 1, 40);
    }

    // Firing.
    p.fireCooldown -= dt;
    if (input.firing && p.fireCooldown <= 0) fireWeapon();

    // Combo streak decay.
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) {
        world.comboKills = 0;
        world.multiplier = 1;
      }
    }

    // Wave spawning and clearing.
    if (world.waveState === 'spawning') {
      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0 && world.spawnQueue.length > 0) {
        world.shards.push(spawnShard(world.spawnQueue.shift(), rng));
        world.spawnTimer = 0.45;
      }
      if (world.spawnQueue.length === 0) world.waveState = 'fighting';
    } else if (world.waveState === 'fighting' && world.shards.length === 0) {
      world.waveState = 'clear';
      world.waveClearTimer = 1.4;
      announce('WAVE CLEARED', 1.2);
    } else if (world.waveState === 'clear') {
      world.waveClearTimer -= dt;
      if (world.waveClearTimer <= 0) startWave(world.wave + 1);
    }

    updateShards(dt);
    updateBullets(dt);
    updatePickups(dt);
    particles.update(dt);
    if (world.messageTimer > 0) world.messageTimer -= dt;
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  }

  function updateShards(dt) {
    const p = world.player;
    for (const shard of [...world.shards]) {
      shard.flash = Math.max(0, shard.flash - dt);
      shard.rotation += shard.spin * dt;
      const dx = p.x - shard.x;
      const dy = p.y - shard.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      if (shard.kind === 'drifter') {
        shard.vx += nx * shard.speed * 2.4 * dt;
        shard.vy += ny * shard.speed * 2.4 * dt;
      } else if (shard.kind === 'weaver') {
        shard.phase += dt * 3.2;
        const px = -ny;
        const py = nx;
        const strafe = Math.sin(shard.phase) * 0.9;
        shard.vx += (nx + px * strafe) * shard.speed * 2.2 * dt;
        shard.vy += (ny + py * strafe) * shard.speed * 2.2 * dt;
      } else if (shard.kind === 'stinger') {
        shard.stateTimer -= dt;
        if (shard.state === 'chase') {
          shard.vx += nx * shard.speed * 2.2 * dt;
          shard.vy += ny * shard.speed * 2.2 * dt;
          if (shard.stateTimer <= 0) {
            shard.state = 'aim';
            shard.stateTimer = 0.6;
            shard.flash = 0.6;
          }
        } else if (shard.state === 'aim') {
          shard.vx *= 0.9;
          shard.vy *= 0.9;
          shard.dashX = nx;
          shard.dashY = ny;
          if (shard.stateTimer <= 0) {
            shard.state = 'dash';
            shard.stateTimer = 0.45;
            shard.vx = shard.dashX * SHARDS.stinger.dashSpeed;
            shard.vy = shard.dashY * SHARDS.stinger.dashSpeed;
          }
        } else {
          if (shard.stateTimer <= 0) {
            shard.state = 'chase';
            shard.stateTimer = rng.range(0.8, 1.6);
          }
        }
      } else {
        // Bulwark: slow, relentless, armored.
        shard.vx += nx * shard.speed * 2.2 * dt;
        shard.vy += ny * shard.speed * 2.2 * dt;
      }

      const v = Math.hypot(shard.vx, shard.vy);
      const cap = shard.state === 'dash' ? SHARDS.stinger.dashSpeed : shard.speed;
      if (v > cap) {
        shard.vx = (shard.vx / v) * cap;
        shard.vy = (shard.vy / v) * cap;
      }
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;

      // Touching the player hurts (unless briefly invulnerable).
      if (dist < shard.radius + p.radius - 2) hurtPlayer();
    }
  }

  function updateBullets(dt) {
    for (let i = world.bullets.length - 1; i >= 0; i--) {
      const b = world.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > ARENA.width + 20 || b.y < -20 || b.y > ARENA.height + 20;
      if (!dead) {
        for (const shard of [...world.shards]) {
          const dx = shard.x - b.x;
          const dy = shard.y - b.y;
          if (dx * dx + dy * dy < (shard.radius + b.radius) * (shard.radius + b.radius)) {
            shard.hp -= 1;
            shard.flash = 0.12;
            particles.burst(b.x, b.y, shard.color, 3, 140);
            audio.hit();
            dead = true;
            if (shard.hp <= 0) killShard(shard);
            break;
          }
        }
      }
      if (dead) world.bullets.splice(i, 1);
    }
  }

  function updatePickups(dt) {
    const p = world.player;
    for (let i = world.spores.length - 1; i >= 0; i--) {
      const s = world.spores[i];
      s.life -= dt;
      s.bob += dt * 4;
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 110) {
        s.vx += (dx / dist) * 900 * dt;
        s.vy += (dy / dist) * 900 * dt;
      }
      s.vx *= 0.94;
      s.vy *= 0.94;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (dist < p.radius + s.radius + 4) {
        world.spores.splice(i, 1);
        p.spores += 1;
        audio.spore();
        if (p.spores >= SPORES_PER_BLOOM) {
          p.spores -= SPORES_PER_BLOOM;
          bloomNova();
        }
        continue;
      }
      if (s.life <= 0) world.spores.splice(i, 1);
    }
    for (let i = world.hearts.length - 1; i >= 0; i--) {
      const h = world.hearts[i];
      h.life -= dt;
      h.bob += dt * 3;
      h.y += h.vy * dt;
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      if (dx * dx + dy * dy < (p.radius + h.radius + 4) * (p.radius + h.radius + 4)) {
        world.hearts.splice(i, 1);
        if (p.hearts < PLAYER.maxHearts) {
          p.hearts += 1;
          audio.heart();
          particles.popup(h.x, h.y, '+1 ♥', '#ff5d7a');
        }
        continue;
      }
      if (h.life <= 0) world.hearts.splice(i, 1);
    }
  }

  return {
    world,
    startGame,
    endGame,
    update(dt, input) {
      if (world.mode === 'playing') updatePlaying(dt, input);
      else if (world.mode === 'title' || world.mode === 'over') {
        world.time += dt; // keeps the title pulse and star twinkle alive
        particles.update(dt);
        if (world.messageTimer > 0) world.messageTimer -= dt;
      }
    },
  };
}
