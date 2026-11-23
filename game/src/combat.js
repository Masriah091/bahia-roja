// BAHÍA ROJA — combat: the weapon table, bullets in flight, the sicarios
// of Los Martillos, and the effects that sell a hit — tracers, muzzle
// flashes, hit puffs, floating damage numbers, explosions. Enemies hold
// a distance band around the player, strafe between bursts, and only
// fire with a clear line of sight, so cover genuinely works.

import { clamp, dist, angleTurn, angleTo } from './rng.js';

export const WEAPONS = {
  pistol: {
    name: 'PISTOLA PUERTO', damage: 17, mag: 12, rate: 0.27, spread: 0.035,
    range: 520, speed: 980, price: 0, ammoPrice: 40, auto: false, pellets: 1,
  },
  smg: {
    name: 'METRALLETA SALINA', damage: 12, mag: 32, rate: 0.085, spread: 0.075,
    range: 480, speed: 1020, price: 1800, ammoPrice: 70, auto: true, pellets: 1,
  },
  shotgun: {
    name: 'ESCOPETA DE MUELLE', damage: 11, mag: 6, rate: 0.85, spread: 0.16,
    range: 300, speed: 880, price: 2600, ammoPrice: 90, auto: false, pellets: 7,
  },
  rifle: {
    name: 'FUSIL DEL FARO', damage: 30, mag: 24, rate: 0.16, spread: 0.02,
    range: 720, speed: 1280, price: 4200, ammoPrice: 120, auto: true, pellets: 1,
  },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun', 'rifle'];

/** Line of sight between two points: buildings and containers block it. */
export function lineClear(world, x1, y1, x2, y2) {
  const d = dist(x1, y1, x2, y2);
  const steps = Math.max(1, Math.floor(d / 26));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (world.circleHitsSolid(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 4)) return false;
  }
  return true;
}

export function createCombat(world, rng) {
  const enemies = [];
  const bullets = [];
  const particles = [];
  const numbers = [];
  const flashes = [];

  const fx = {
    damageNumber(x, y, value, color) {
      numbers.push({ x, y, value: Math.round(value), color: color || '#ffe9a8', life: 0.85, vy: -46 });
      if (numbers.length > 40) numbers.shift();
    },
    hitPuff(x, y, color) {
      for (let i = 0; i < 7; i += 1) {
        const a = rng.range(0, Math.PI * 2);
        const s = rng.range(24, 110);
        particles.push({
          x, y, vx: Math.sin(a) * s, vy: -Math.cos(a) * s,
          life: rng.range(0.2, 0.5), max: 0.5, size: rng.range(2, 5),
          color: color || '#c8b9a0', gravity: 0,
        });
      }
    },
    muzzle(x, y, angle) {
      flashes.push({ x, y, angle, life: 0.05 });
    },
    explosion(x, y) {
      for (let i = 0; i < 42; i += 1) {
        const a = rng.range(0, Math.PI * 2);
        const s = rng.range(30, 330);
        particles.push({
          x, y, vx: Math.sin(a) * s, vy: -Math.cos(a) * s,
          life: rng.range(0.3, 1.1), max: 1.1, size: rng.range(3, 10),
          color: rng.pick(['#e8b23a', '#c74f35', '#8a4a34', '#3d3a38', '#f2e8d5']),
          gravity: -30,
        });
      }
      flashes.push({ x, y, angle: 0, life: 0.14, big: true });
    },
    sparks(x, y) {
      for (let i = 0; i < 5; i += 1) {
        const a = rng.range(0, Math.PI * 2);
        const s = rng.range(60, 190);
        particles.push({
          x, y, vx: Math.sin(a) * s, vy: -Math.cos(a) * s,
          life: rng.range(0.1, 0.3), max: 0.3, size: 2, color: '#ffd977', gravity: 140,
        });
      }
    },
    smoke(x, y) {
      for (let i = 0; i < 3; i += 1) {
        particles.push({
          x: x + rng.range(-8, 8), y: y + rng.range(-8, 8),
          vx: rng.range(-12, 12), vy: rng.range(-34, -18),
          life: rng.range(0.6, 1.2), max: 1.2, size: rng.range(5, 9),
          color: '#4a4642', gravity: -12,
        });
      }
    },
  };

  /** Spawn one Martillo sicario. opts: weapon, hp, accuracy, cash. */
  function spawnGang(x, y, opts) {
    const o = opts || {};
    const e = {
      x, y, angle: rng.range(0, Math.PI * 2),
      hp: o.hp || 90, maxHp: o.hp || 90,
      weaponId: o.weapon || 'pistol',
      accuracy: o.accuracy || 0.38,
      speed: rng.range(118, 148),
      band: [150, 300],
      cooldown: rng.range(0.4, 1.4), burstLeft: 0, burstGap: 0, think: rng.range(0, 0.3),
      strafe: rng.sign(), strafeT: rng.range(1, 3),
      state: 'alert', dead: false, corpseT: 0,
      faction: 'gang', cash: o.cash || 120, seesPlayer: false,
      shirt: rng.pick(['#b03024', '#c78a2e', '#7a4f9e', '#a83a5e', '#8f2f26', '#d9a441']),
    };
    enemies.push(e);
    return e;
  }

  /** Fire one trigger pull (every pellet) from a muzzle point. */
  function fireBullet(x, y, angle, weapon, faction, rng2) {
    const r = rng2 || rng;
    for (let p = 0; p < weapon.pellets; p += 1) {
      const a = angle + r.range(-weapon.spread, weapon.spread);
      bullets.push({
        x, y, angle: a,
        vx: Math.sin(a) * weapon.speed, vy: -Math.cos(a) * weapon.speed,
        life: weapon.range / weapon.speed,
        damage: weapon.damage, faction,
      });
    }
    fx.muzzle(x + Math.sin(angle) * 16, y - Math.cos(angle) * 16, angle);
  }

  function hurtEnemy(e, dmg, ctx) {
    if (e.dead) return;
    e.hp -= dmg;
    fx.damageNumber(e.x, e.y - 18, dmg, '#ffe9a8');
    fx.hitPuff(e.x, e.y, '#8f2f26');
    if (e.hp <= 0) {
      e.dead = true;
      e.corpseT = 14;
      ctx.onEnemyDown(e);
    }
  }

  function hurtOfficer(o, dmg, ctx) {
    if (o.dead) return;
    o.hp -= dmg;
    fx.damageNumber(o.x, o.y - 18, dmg, '#bcd4ff');
    fx.hitPuff(o.x, o.y, '#274b8f');
    if (o.hp <= 0) {
      o.dead = true;
      o.corpseT = 14;
      ctx.onOfficerDown(o);
    }
  }

  function updateBullets(dt, ctx) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let gone = b.life <= 0;
      if (!gone && (world.circleHitsSolid(b.x, b.y, 3) || !world.passable(b.x, b.y))) {
        fx.sparks(b.x, b.y);
        gone = true;
      }
      if (!gone) {
        // Cars soak bullets from every faction, and burn when they die.
        for (const car of ctx.cars) {
          if (car.dead || car.hp <= 0) continue;
          if (dist(b.x, b.y, car.x, car.y) < car.type.wid * 0.72) {
            car.hp = Math.max(0, car.hp - b.damage * 0.55);
            fx.sparks(b.x, b.y);
            if (car.hp <= 0 && !car.exploded) {
              car.exploded = true;
              car.dead = true;
              fx.explosion(car.x, car.y);
              ctx.audio.crash(true);
              ctx.scare(car.x, car.y, 320);
            }
            gone = true;
            break;
          }
        }
      }
      if (!gone && b.faction !== 'player') {
        const p = ctx.player;
        if (!p.car && !p.dead && dist(b.x, b.y, p.x, p.y) < 15) {
          ctx.hurtPlayer(b.damage);
          gone = true;
        } else if (p.car && dist(b.x, b.y, p.car.x, p.car.y) < p.car.type.wid * 0.7) {
          p.car.hp = Math.max(0, p.car.hp - b.damage * 0.4);
          fx.sparks(b.x, b.y);
          gone = true;
        }
      }
      if (!gone && b.faction !== 'gang') {
        for (const e of enemies) {
          if (e.dead) continue;
          if (dist(b.x, b.y, e.x, e.y) < 15) { hurtEnemy(e, b.damage, ctx); gone = true; break; }
        }
      }
      if (!gone && b.faction !== 'police') {
        for (const o of ctx.officers) {
          if (o.dead) continue;
          if (dist(b.x, b.y, o.x, o.y) < 15) { hurtOfficer(o, b.damage, ctx); gone = true; break; }
        }
      }
      if (gone) bullets.splice(i, 1);
    }
  }

  // Shared foot-soldier brain: hold the band, strafe, burst-fire with a
  // clear line. Gang sicarios and Guardia officers differ only in data.
  function updateSoldier(s, dt, ctx, target) {
    const tx = target.car ? target.car.x : target.x;
    const ty = target.car ? target.car.y : target.y;
    const d = dist(s.x, s.y, tx, ty);
    s.seesPlayer = d < 640 && lineClear(world, s.x, s.y, tx, ty);
    const toT = angleTo(s.x, s.y, tx, ty);
    s.angle = angleTurn(s.angle, toT, 5.2 * dt);
    s.strafeT -= dt;
    if (s.strafeT <= 0) { s.strafe = rng.sign(); s.strafeT = rng.range(1, 3); }
    let mx = 0;
    let my = 0;
    if (d > s.band[1]) { mx = Math.sin(toT); my = -Math.cos(toT); }
    else if (d < s.band[0]) { mx = -Math.sin(toT); my = Math.cos(toT); }
    mx += Math.sin(toT + Math.PI / 2) * s.strafe * 0.45;
    my += -Math.cos(toT + Math.PI / 2) * s.strafe * 0.45;
    const ml = Math.hypot(mx, my) || 1;
    const pos = { x: s.x, y: s.y };
    world.moveCircle(pos, (mx / ml) * s.speed * dt, (my / ml) * s.speed * dt, 12);
    s.x = pos.x;
    s.y = pos.y;
    s.cooldown -= dt;
    if (s.burstGap > 0) s.burstGap -= dt;
    if (s.seesPlayer && !target.dead) {
      const w = WEAPONS[s.weaponId];
      if (s.burstLeft > 0 && s.burstGap <= 0) {
        const miss = rng.range(-1, 1) * (1 - s.accuracy) * 0.22;
        fireBullet(s.x, s.y, toT + miss, w, s.faction, rng);
        ctx.audio.shot(0.22);
        s.burstLeft -= 1;
        s.burstGap = w.rate;
        if (s.burstLeft <= 0) s.cooldown = rng.range(0.9, 2.0);
      } else if (s.burstLeft <= 0 && s.cooldown <= 0 && d < w.range) {
        s.burstLeft = s.weaponId === 'smg' ? 6 : s.weaponId === 'rifle' ? 4 : 2;
      }
    }
  }

  function update(dt, ctx) {
    updateBullets(dt, ctx);
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const e = enemies[i];
      if (e.dead) {
        e.corpseT -= dt;
        if (e.corpseT <= 0) enemies.splice(i, 1);
        continue;
      }
      updateSoldier(e, dt, ctx, ctx.player);
    }
    // Effects always tick, even in a quiet frame.
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
    }
    for (let i = numbers.length - 1; i >= 0; i -= 1) {
      const n = numbers[i];
      n.life -= dt;
      n.y += n.vy * dt;
      if (n.life <= 0) numbers.splice(i, 1);
    }
    for (let i = flashes.length - 1; i >= 0; i -= 1) {
      flashes[i].life -= dt;
      if (flashes[i].life <= 0) flashes.splice(i, 1);
    }
  }

  return {
    enemies, bullets, particles, numbers, flashes, fx,
    spawnGang, fireBullet, update,
    alive() {
      let n = 0;
      for (const e of enemies) if (!e.dead) n += 1;
      return n;
    },
    clear() {
      enemies.length = 0;
    },
    updateSoldier,
  };
}
