// Rendering: one canvas, neon on void. The background is a faint grid over a
// starfield; shards are hollow polygons (their colour tells the kind); the
// player is a small bloom-ship; the HUD shows score, wave, hearts, combo,
// weapon level and spore progress; title and game-over screens are drawn
// here too, so the whole loop is visible in the screenshots.
import { ARENA, COLORS, SPORES_PER_BLOOM, MAX_WEAPON_LEVEL } from './config.js';

function drawBackground(ctx, time, stars) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  const step = 64;
  ctx.beginPath();
  for (let x = step; x < ARENA.width; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
  }
  for (let y = step; y < ARENA.height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
  }
  ctx.stroke();
  for (const s of stars) {
    const twinkle = 0.35 + 0.3 * Math.sin(time * s.twinkle + s.phase);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawPolygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawPlayer(ctx, p, time) {
  const blink = time < p.invulnerableUntil && Math.floor(time * 12) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  // Five petals around a bright core: the bloom the game is named for.
  ctx.fillStyle = COLORS.player;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 9, Math.sin(a) * 9, 8, 4.5, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.playerCore;
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Nose gun.
  ctx.fillStyle = '#9df2ff';
  ctx.fillRect(10, -2, 12, 4);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawShard(ctx, shard) {
  ctx.save();
  ctx.translate(shard.x, shard.y);
  const flashing = shard.flash > 0;
  ctx.strokeStyle = flashing ? '#ffffff' : shard.color;
  ctx.fillStyle = flashing ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';
  ctx.lineWidth = shard.kind === 'bulwark' ? 3.5 : 2.5;
  if (shard.kind === 'drifter') {
    drawPolygon(ctx, 0, 0, shard.radius, 4, shard.rotation);
  } else if (shard.kind === 'weaver') {
    drawPolygon(ctx, 0, 0, shard.radius, 3, shard.rotation);
  } else if (shard.kind === 'stinger') {
    drawPolygon(ctx, 0, 0, shard.radius, 5, shard.rotation);
    // Telegraph: a bright core while aiming.
    if (shard.state === 'aim') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Bulwark: double hex shell, armored.
    drawPolygon(ctx, 0, 0, shard.radius, 6, shard.rotation);
    ctx.stroke();
    drawPolygon(ctx, 0, 0, shard.radius * 0.6, 6, -shard.rotation);
  }
  ctx.fill();
  ctx.stroke();
  // Health pips for the armored kind.
  if (shard.kind === 'bulwark') {
    ctx.fillStyle = shard.color;
    for (let i = 0; i < shard.hp; i++) {
      ctx.fillRect(-15 + i * 6, -shard.radius - 12, 4, 4);
    }
  }
  ctx.restore();
}

function drawHeartShape(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-7, -4, -3, -9, 0, -5);
  ctx.bezierCurveTo(3, -9, 7, -4, 0, 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.text;
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(String(world.score).padStart(6, '0'), 24, 44);
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dimText;
  ctx.fillText(`BEST ${world.best}`, 24, 66);
  ctx.fillText(`WAVE ${world.wave}`, 24, 88);

  // Hearts, top right.
  for (let i = 0; i < 3; i++) {
    drawHeartShape(ctx, ARENA.width - 32 - i * 34, 34, 13, i < p.hearts ? COLORS.heart : 'rgba(255,93,122,0.22)');
  }

  // Combo multiplier.
  if (world.multiplier > 1) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe066';
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillText(`COMBO ×${world.multiplier}`, ARENA.width - 24, 84);
    ctx.fillStyle = COLORS.dimText;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(`${world.comboKills} kill streak`, ARENA.width - 24, 102);
  }

  // Weapon level + spore progress, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText(`WEAPON LV ${p.weaponLevel}/${MAX_WEAPON_LEVEL}`, 24, ARENA.height - 44);
  ctx.fillStyle = 'rgba(125, 255, 106, 0.25)';
  ctx.fillRect(24, ARENA.height - 34, 160, 8);
  ctx.fillStyle = COLORS.spore;
  ctx.fillRect(24, ARENA.height - 34, 160 * (p.spores / SPORES_PER_BLOOM), 8);
  ctx.fillStyle = COLORS.dimText;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`${p.spores}/${SPORES_PER_BLOOM} spores to bloom`, 24, ARENA.height - 16);

  // Nova count, bottom right.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.dimText;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(`NOVAS ${world.novas}   KILLS ${world.kills}   M mute`, ARENA.width - 24, ARENA.height - 16);

  // Center announcement (wave number, nova, cleared).
  if (world.messageTimer > 0 && world.message) {
    const fade = Math.min(1, world.messageTimer);
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillText(world.message, ARENA.width / 2, 150);
    ctx.globalAlpha = 1;
  }
}

function drawTitle(ctx, world, time) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.55)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#37f5d6';
  ctx.font = '900 84px system-ui, sans-serif';
  ctx.fillText('VOIDBLOOM', ARENA.width / 2, 240);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ff4fd8';
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillText('a neon arena survival shooter', ARENA.width / 2, 282);
  ctx.fillStyle = COLORS.text;
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move      Mouse — aim      Hold click / Space — fire', ARENA.width / 2, 360);
  ctx.fillText('Collect 12 spores to bloom a NOVA and raise your weapon. Chain kills for a combo.', ARENA.width / 2, 392);
  ctx.fillText('Survive the waves. 3 hearts. Stingers telegraph their dash — dodge the flash.', ARENA.width / 2, 424);
  ctx.fillStyle = '#ffe066';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('CLICK TO PLAY', ARENA.width / 2, 500);
  ctx.fillStyle = COLORS.dimText;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(`BEST SCORE ${world.best}`, ARENA.width / 2, 540);
  ctx.fillText('M — mute', ARENA.width / 2, 568);
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.62)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5d7a';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.fillText('THE VOID CLAIMS YOU', ARENA.width / 2, 220);
  ctx.fillStyle = COLORS.text;
  ctx.font = '800 40px system-ui, sans-serif';
  ctx.fillText(`SCORE ${world.score}`, ARENA.width / 2, 300);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = world.score >= world.best && world.score > 0 ? '#ffe066' : COLORS.dimText;
  ctx.fillText(world.score >= world.best && world.score > 0 ? 'NEW BEST!' : `BEST ${world.best}`, ARENA.width / 2, 336);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Reached wave ${world.wave}  •  ${world.kills} shards shattered  •  ${world.novas} novas bloomed`, ARENA.width / 2, 384);
  ctx.fillStyle = '#ffe066';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('PRESS R OR CLICK TO BLOOM AGAIN', ARENA.width / 2, 470);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const stars = [];
  // Fixed starfield, seeded once per page load.
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 110; i++) {
    stars.push({
      x: rand() * ARENA.width,
      y: rand() * ARENA.height,
      size: 1 + rand() * 2,
      color: rand() < 0.7 ? '#aebaff' : '#ffd9f6',
      twinkle: 0.6 + rand() * 2,
      phase: rand() * Math.PI * 2,
    });
  }

  return {
    draw(world) {
      const time = world.time;
      ctx.save();
      if (world.shake > 0) {
        ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
      }
      drawBackground(ctx, time, stars);
      if (world.mode === 'playing' || world.mode === 'over') {
        for (const s of world.spores) {
          ctx.globalAlpha = 0.65 + 0.35 * Math.sin(s.bob);
          ctx.fillStyle = COLORS.spore;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        for (const h of world.hearts) {
          drawHeartShape(ctx, h.x, h.y + Math.sin(h.bob) * 3, 13, COLORS.heart);
        }
        for (const shard of world.shards) drawShard(ctx, shard);
        ctx.fillStyle = COLORS.bullet;
        for (const b of world.bullets) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        if (world.mode === 'playing') drawPlayer(ctx, world.player, time);
      }
      // Particles draw above the field in every mode.
      world.particles.draw(ctx);
      if (world.mode === 'playing') drawHud(ctx, world);
      if (world.mode === 'title') drawTitle(ctx, world, time);
      if (world.mode === 'over') drawGameOver(ctx, world);
      ctx.restore();
    },
  };
}
