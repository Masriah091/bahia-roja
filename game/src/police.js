// BAHÍA ROJA — the Guardia Portuaria: heat, stars, patrol dispatch with
// named callsigns, foot officers, roadblocks, and CÓNDOR-1, the helicopter
// that joins the hunt at four stars. Dispatch is data the HUD prints:
// every unit reports a callsign, a role, a distance in tens of metres and
// whether it holds the suspect IN SIGHT or is SEARCHING the last known
// point. Chatter lines rotate through the dispatch log so the panel feels
// manned, not printed.

import { WANTED, starsForHeat, districtAt, TILE } from './config.js';
import { clamp, dist, angleTurn, angleTo } from './rng.js';
import { makeCar, driveToward } from './vehicles.js';
import { AVENUES_X, STREETS_Y, COAST_Y } from './world.js';

const CALLSIGN_HEADS = ['FARO', 'MUELLE', 'SAL', 'BAHÍA', 'COLINA', 'DIQUE', 'GRÚA', 'LONJA'];
const ROLES = ['PURSUIT', 'PURSUIT', 'INTERCEPTOR', 'BLOCKADE', 'PURSUIT', 'INTERCEPTOR'];

const CHATTER = [
  'Sospechoso en un vehículo rojo, dirección costa.',
  'Aquí Central: mantengan contacto visual.',
  'El Piloto está en mi distrito. Voy a por él.',
  'Refuerzos en camino, no lo pierdan.',
  'Cuidado: el sospechoso va armado.',
  'Corten la avenida del puerto, ¡ahora!',
  'Lo tengo en visual. No lo tengo. ¡Maldita sea!',
  'Central a todas las unidades: prioridad máxima.',
  'Ese coche es de Casa Roja, seguro.',
  'Si llega al Muelle Escarlata lo perdemos.',
  'CÓNDOR-1 en el aire, cámara térmica lista.',
  'Bloqueen el puente del puerto viejo.',
];

/** How many units the Guardia fields at each star count. */
const UNITS_BY_STARS = [0, 1, 2, 3, 4, 5];

export function createPolice(world, rng) {
  const police = {
    heat: 0,
    units: [],
    officers: [],
    heli: null,
    bustTimer: 0,
    lastSeen: null,
    unseenT: 0,
    log: [],
    chatterT: 4,
    spawnT: 0,
    callsignSeq: 1,
    chatterIdx: 0,
  };

  function stars() {
    return starsForHeat(police.heat);
  }
  police.stars = stars;

  function say(callsign, text) {
    police.log.push({ callsign, text, t: 0 });
    if (police.log.length > 4) police.log.shift();
  }
  police.say = say;

  function nextCallsign() {
    const head = CALLSIGN_HEADS[(police.callsignSeq - 1) % CALLSIGN_HEADS.length];
    const cs = head + '-' + police.callsignSeq;
    police.callsignSeq += 1;
    return cs;
  }
  police.nextCallsign = nextCallsign;

  /** A road point roughly `d` px from (x, y), for spawning out of sight. */
  function spawnPoint(x, y, d) {
    let best = null;
    let bestErr = Infinity;
    for (const ax of AVENUES_X) {
      for (const sy of STREETS_Y.concat([COAST_Y])) {
        const px = ax * TILE;
        const py = sy * TILE;
        const err = Math.abs(dist(px, py, x, y) - d);
        if (err < bestErr) { bestErr = err; best = { x: px, y: py }; }
      }
    }
    return best;
  }

  function spawnUnit(ctx, px, py) {
    const s = stars();
    const spot = spawnPoint(px, py, rng.range(640, 860));
    if (!spot) return;
    const type = s >= 3 && rng.chance(0.45) ? 'interceptor' : 'police';
    const car = makeCar(type, spot.x, spot.y, 0, 'police', rng);
    ctx.addCar(car);
    const role = type === 'interceptor' ? 'INTERCEPTOR' : rng.pick(ROLES);
    const unit = {
      car, callsign: nextCallsign(), role,
      sees: false, officersOut: false, state: 'SEARCHING',
      distToPlayer: Math.round(dist(car.x, car.y, px, py) / 10),
      officerCd: rng.range(0.5, 1.5),
    };
    police.units.push(unit);
    say(unit.callsign, 'En ruta. ' + districtAt(px, py).short + ', allá voy.');
  }

  function spawnOfficers(unit, ctx) {
    unit.officersOut = true;
    for (let i = 0; i < 2; i += 1) {
      const a = unit.car.angle + (i === 0 ? 0.7 : -0.7);
      police.officers.push({
        x: unit.car.x + Math.sin(a) * 34, y: unit.car.y - Math.cos(a) * 34,
        hp: 55, maxHp: 55, angle: unit.car.angle,
        weaponId: i === 0 ? 'pistol' : 'smg',
        accuracy: 0.4, speed: 136,
        band: [140, 260], cooldown: rng.range(0.4, 1.2),
        burstLeft: 0, burstGap: 0, think: 0, strafe: rng.sign(), strafeT: 2,
        unit, dead: false, corpseT: 0, faction: 'police', seesPlayer: false,
      });
    }
    void ctx;
  }

  function reportCrime(x, y, kind) {
    const gain = kind === 'kill' ? 26 : kind === 'shot' ? 9 : kind === 'crash' ? 7 : kind === 'jack' ? 12 : 5;
    police.heat = clamp(police.heat + gain, 0, 320);
    police.lastSeen = { x, y };
    police.unseenT = 0;
  }
  police.reportCrime = reportCrime;

  /** Cool the hunt down (resprays, new clothes, a paid fine). */
  function clear(amount) {
    police.heat = Math.max(0, police.heat - amount);
    if (police.heat < WANTED.thresholds[1]) {
      police.units.length = 0;
      police.officers.length = 0;
      police.heli = null;
    }
  }
  police.clear = clear;

  function updateOfficers(dt, ctx) {
    for (let i = police.officers.length - 1; i >= 0; i -= 1) {
      const o = police.officers[i];
      if (o.dead) {
        o.corpseT -= dt;
        if (o.corpseT <= 0) police.officers.splice(i, 1);
        continue;
      }
      ctx.combat.updateSoldier(o, dt, ctx, ctx.player);
    }
  }

  function updateHeli(dt, ctx) {
    const s = stars();
    if (s >= WANTED.heliStars) {
      if (!police.heli) {
        const p = ctx.player;
        police.heli = {
          x: p.x - 300, y: p.y - 300, angle: 0.8, sees: false, orbit: 0,
        };
        say('CÓNDOR-1', 'En el aire. Térmica sobre el sospechoso.');
      }
      const h = police.heli;
      const p = ctx.player;
      const px = p.car ? p.car.x : p.x;
      const py = p.car ? p.car.y : p.y;
      h.orbit += dt * 0.35;
      // The heli holds a station ahead-left of the suspect's run, close
      // enough that its searchlight pool stays in frame.
      const txp = px + Math.sin(h.orbit) * 130 - 10;
      const typ = py - Math.cos(h.orbit) * 130 - 30;
      h.x += (txp - h.x) * Math.min(1, dt * 1.6);
      h.y += (typ - h.y) * Math.min(1, dt * 1.6);
      h.angle = angleTurn(h.angle, angleTo(h.x, h.y, px, py), 2.4 * dt);
      h.sees = dist(h.x, h.y, px, py) < 560;
      if (h.sees) {
        police.lastSeen = { x: px, y: py };
        police.unseenT = 0;
      }
    } else if (police.heli && s < 3) {
      police.heli = null;
    }
  }

  function update(dt, ctx) {
    const p = ctx.player;
    const px = p.car ? p.car.x : p.x;
    const py = p.car ? p.car.y : p.y;
    const s = stars();

    // -- Who can see the suspect right now? -------------------------------
    let anySees = false;
    for (const u of police.units) {
      const d = dist(u.car.x, u.car.y, px, py);
      u.distToPlayer = Math.max(1, Math.round(d / 10));
      u.sees = !p.dead && d < 700;
      if (u.sees) anySees = true;
    }
    if (police.heli && police.heli.sees) anySees = true;
    for (const o of police.officers) if (o.seesPlayer) anySees = true;

    if (anySees) {
      police.lastSeen = { x: px, y: py };
      police.unseenT = 0;
    } else {
      police.unseenT += dt;
    }
    const searching = police.unseenT > WANTED.searchAfter;

    // -- Heat bookkeeping ---------------------------------------------------
    if (s > 0) {
      police.heat = Math.max(0, police.heat
        - (anySees ? WANTED.decaySeen : WANTED.decayHidden) * dt);
      if (stars() === 0) {
        police.units.length = 0;
        police.officers.length = 0;
        police.heli = null;
        police.bustTimer = 0;
      }
    }

    // -- Reinforcements ------------------------------------------------------
    police.spawnT -= dt;
    const wanted = UNITS_BY_STARS[stars()];
    if (stars() > 0 && police.units.length < wanted && police.spawnT <= 0) {
      spawnUnit(ctx, px, py);
      police.spawnT = 2.6;
    }
    // Units that fall too far behind are reassigned off-screen.
    for (let i = police.units.length - 1; i >= 0; i -= 1) {
      const u = police.units[i];
      if (u.car.dead || dist(u.car.x, u.car.y, px, py) > 2600) {
        const ci = ctx.cars.indexOf(u.car);
        if (ci >= 0) ctx.removeCar(u.car);
        police.units.splice(i, 1);
      }
    }

    // -- Driving the hunt ------------------------------------------------------
    for (const u of police.units) {
      const car = u.car;
      u.state = u.sees ? 'IN SIGHT' : 'SEARCHING';
      if (car.hp <= 0) continue;
      const goal = u.sees || !searching || !police.lastSeen
        ? { x: px, y: py }
        : police.lastSeen;
      if (u.role === 'BLOCKADE' && u.sees) {
        // Blockades stop across the suspect's line, doors open, guns out.
        const ahead = {
          x: px + Math.sin(p.car ? p.car.angle : p.angle) * 190,
          y: py - Math.cos(p.car ? p.car.angle : p.angle) * 190,
        };
        const res = driveToward(car, ahead.x, ahead.y, dt, world, { slowNear: true, stopAt: true });
        if (res.dist < 60 && !u.officersOut) spawnOfficers(u, ctx);
      } else if (!p.car && u.sees && dist(car.x, car.y, px, py) < 130) {
        // On foot and cornered: officers pile out instead of running him down.
        driveToward(car, px, py, dt, world, { stopAt: true, slowNear: true });
        if (!u.officersOut) spawnOfficers(u, ctx);
      } else {
        driveToward(car, goal.x, goal.y, dt, world, { throttle: 0.98 });
      }
    }

    updateOfficers(dt, ctx);
    updateHeli(dt, ctx);

    // -- The bust: stand still in sight of the Guardia and you are taken. -----
    const nearOfficer = police.officers.some((o) => !o.dead && o.seesPlayer
      && dist(o.x, o.y, px, py) < 60);
    const still = !p.car && Math.hypot(p.vx || 0, p.vy || 0) < 12;
    if (stars() > 0 && nearOfficer && still && !p.dead) {
      police.bustTimer += dt;
      if (police.bustTimer > 2.4) {
        police.bustTimer = 0;
        ctx.onBusted();
      }
    } else {
      police.bustTimer = Math.max(0, police.bustTimer - dt * 2);
    }

    // -- Dispatch chatter -------------------------------------------------------
    for (const line of police.log) line.t += dt;
    police.chatterT -= dt;
    if (stars() > 0 && police.chatterT <= 0) {
      police.chatterT = rng.range(5, 9);
      const line = CHATTER[police.chatterIdx % CHATTER.length];
      police.chatterIdx += 1;
      const from = police.units.length
        ? rng.pick(police.units).callsign
        : 'CENTRAL';
      say(from, line);
    }
  }
  police.update = update;

  return police;
}
