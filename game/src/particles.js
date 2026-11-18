// Particles and floating text: sparks when a shard breaks, a shockwave ring
// for the nova, drifting motes behind the player, and score popups. The pool
// is capped so a busy fight never allocates without bound.
export function createParticles() {
  const sparks = [];
  const rings = [];
  const texts = [];
  const MAX_SPARKS = 420;

  return {
    burst(x, y, color, count, speed = 260) {
      for (let i = 0; i < count; i++) {
        if (sparks.length >= MAX_SPARKS) sparks.shift();
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        sparks.push({
          x, y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          life: 0.5 + Math.random() * 0.35,
          age: 0,
          size: 1.5 + Math.random() * 2.5,
          color,
        });
      }
    },
    ring(x, y, color, maxRadius = 260) {
      rings.push({ x, y, age: 0, life: 0.6, maxRadius, color });
    },
    popup(x, y, text, color = '#dfe6ff') {
      texts.push({ x, y, text, color, age: 0, life: 0.9 });
    },
    update(dt) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        if (s.age >= s.life) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.96;
        s.vy *= 0.96;
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].age += dt;
        if (rings[i].age >= rings[i].life) rings.splice(i, 1);
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.age += dt;
        t.y -= 34 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
    },
    draw(ctx) {
      for (const s of sparks) {
        const fade = 1 - s.age / s.life;
        ctx.globalAlpha = fade;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      for (const r of rings) {
        const t = r.age / r.life;
        ctx.globalAlpha = (1 - t) * 0.8;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.maxRadius * t, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.font = '700 15px system-ui, sans-serif';
      for (const t of texts) {
        ctx.globalAlpha = 1 - t.age / t.life;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      sparks.length = 0;
      rings.length = 0;
      texts.length = 0;
    },
  };
}
