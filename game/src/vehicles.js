// BAHÍA ROJA — vehicles: the type table, the arcade physics every driver
// shares (player, traffic, Guardia, Martillos), and the traffic system
// that keeps the avenues alive. Cars run intersection to intersection in
// right-hand lanes, brake for the car ahead, and respawn near the camera
// so the port never feels empty.

import { TILE, MAP_W, WORLD_W } from './config.js';
import { AVENUES_X, STREETS_Y, COAST_Y } from './world.js';
import { clamp, angleDelta, dist } from './rng.js';

export const VEHICLE_TYPES = {
  sedan: { name: 'SEDÁN BRISA', len: 92, wid: 44, top: 335, accel: 210, grip: 2.6, price: 0, colors: ['#c8c2b4', '#7a8894', '#4f5f6e', '#8f3b30', '#3f6d5a'] },
  taxi: { name: 'TAXI DEL FARO', len: 94, wid: 45, top: 330, accel: 215, grip: 2.6, price: 0, colors: ['#e8b23a'] },
  hatch: { name: 'GOLONDRINA', len: 80, wid: 42, top: 300, accel: 225, grip: 2.8, price: 4500, colors: ['#b8577f', '#4f8f7b', '#d8d2c2', '#5a6b7a'] },
  pickup: { name: 'MULA DEL MUELLE', len: 100, wid: 48, top: 295, accel: 195, grip: 2.2, price: 7000, colors: ['#96502c', '#6b7683', '#4f7a3a', '#8a8578'] },
  van: { name: 'FURGÓN SALINERO', len: 108, wid: 50, top: 270, accel: 175, grip: 2.0, price: 9000, colors: ['#e5ddc8', '#97a0a8', '#7a4f9e'] },
  truck: { name: 'CAMIÓN ROJA', len: 138, wid: 54, top: 240, accel: 140, grip: 1.7, price: 16000, colors: ['#b0402f', '#2f6db0', '#5a6b7a'] },
  muscle: { name: 'TIBURÓN V8', len: 102, wid: 48, top: 420, accel: 300, grip: 2.5, price: 24000, colors: ['#23252a', '#7a1f1f', '#274b8f', '#c78a2e'] },
  sport: { name: 'ESCARLATA GT', len: 116, wid: 52, top: 485, accel: 350, grip: 3.0, price: 42000, colors: ['#b03024', '#e8b23a', '#e8e4da', '#1d5f6e'] },
  police: { name: 'PATRULLA GP', len: 96, wid: 46, top: 395, accel: 285, grip: 2.7, price: 0, colors: ['#e8ecf2'] },
  interceptor: { name: 'INTERCEPTOR GP', len: 100, wid: 47, top: 460, accel: 330, grip: 2.9, price: 0, colors: ['#2b3442'] },
};

let nextCarId = 1;

/** Build a car of a type at a place. `driver` tags who owns its behaviour. */
export function makeCar(typeId, x, y, angle, driver, rng) {
  const type = VEHICLE_TYPES[typeId];
  return {
    id: nextCarId++,
    typeId, type,
    x, y, angle: angle || 0,
    speed: 0, steer: 0,
    color: rng ? rng.pick(type.colors) : type.colors[0],
    driver: driver || 'parked',
    hp: 100,
    route: null,
    wait: 0, honk: 0,
    dead: false, exploded: false, tuned: false, cargo: false,
  };
}

/** Collision radius for a car: a little under its half-width, forgiving. */
export function carRadius(car) {
  return car.type.wid * 0.62;
}

/**
 * Advance one car by dt under throttle (-1..1) and steer (-1..1).
 * Returns the impact speed when the car struck the world, else 0.
 */
export function stepVehicle(car, throttle, steer, dt, world, handbrake) {
  const t = car.type;
  const before = Math.abs(car.speed);
  if (car.hp <= 0) {
    car.speed *= Math.max(0, 1 - 2.4 * dt); // a wreck only rolls to a stop
  } else if (throttle > 0) {
    car.speed += t.accel * throttle * dt * (car.speed < 0 ? 2.2 : 1);
  } else if (throttle < 0) {
    if (car.speed > 12) car.speed -= t.accel * 1.7 * dt;
    else car.speed = Math.max(car.speed - t.accel * 0.7 * dt, -t.top * 0.32);
  } else {
    car.speed -= car.speed * 0.55 * dt;
    if (Math.abs(car.speed) < 2) car.speed = 0;
  }
  car.speed = clamp(car.speed, -t.top * 0.35, t.top);
  const ratio = clamp(car.speed / 120, -1, 1);
  const turn = steer * t.grip * ratio * (handbrake ? 1.7 : 1);
  if (car.speed !== 0) car.angle += turn * dt * (car.speed < 0 ? -1 : 1);
  car.steer = steer;
  const dx = Math.sin(car.angle) * car.speed * dt;
  const dy = -Math.cos(car.angle) * car.speed * dt;
  const pos = { x: car.x, y: car.y };
  const hit = world.moveCircle(pos, dx, dy, carRadius(car));
  car.x = pos.x;
  car.y = pos.y;
  if (hit && before > 60) {
    const impact = before - Math.abs(car.speed) * 0.4;
    car.speed *= 0.35;
    // AI shrugs off wall taps that would cripple the player; nobody loses
    // more than a quarter of the car to a single impact.
    const scale = car.driver === 'player' ? 0.10 : 0.032;
    car.hp = Math.max(0, car.hp - Math.min(impact * scale, 24));
    return impact;
  }
  return 0;
}

/** Steer a car toward a point. Returns {throttle, steer, dist, impact}. */
export function driveToward(car, tx, ty, dt, world, opts) {
  const o = opts || {};
  const targetAngle = Math.atan2(tx - car.x, -(ty - car.y));
  const delta = angleDelta(car.angle, targetAngle);
  const steer = clamp(delta * 2.4, -1, 1);
  const d = dist(car.x, car.y, tx, ty);
  let throttle = o.throttle !== undefined ? o.throttle : 1;
  if (Math.abs(delta) > 2.2 && car.speed > 40) throttle = -0.6;
  else if (Math.abs(delta) > 1.1) throttle = Math.min(throttle, 0.45);
  if (o.slowNear && d < 130) throttle = Math.min(throttle, 0.35);
  if (o.stopAt && d < 42) throttle = car.speed > 10 ? -0.7 : 0;
  const impact = stepVehicle(car, throttle, steer, dt, world, o.handbrake);
  return { throttle, steer, dist: d, impact };
}

/** Car-to-car shove: push two overlapping cars apart and trade momentum. */
export function collideCars(a, b) {
  const minD = (carRadius(a) + carRadius(b)) * 1.55;
  const d = dist(a.x, a.y, b.x, b.y);
  if (d === 0 || d >= minD) return 0;
  const nx = (b.x - a.x) / d;
  const ny = (b.y - a.y) / d;
  const push = (minD - d) / 2;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const rel = Math.abs(a.speed - b.speed);
  if (rel > 50) {
    const dmg = Math.min((rel - 40) * 0.06, 18);
    if (a.driver !== 'player') a.hp = Math.max(0, a.hp - dmg * 0.4);
    else a.hp = Math.max(0, a.hp - dmg);
    if (b.driver !== 'player') b.hp = Math.max(0, b.hp - dmg * 0.4);
    else b.hp = Math.max(0, b.hp - dmg);
    const swap = (a.speed + b.speed) / 2;
    a.speed = swap * 0.7;
    b.speed = swap * 0.7;
    return rel;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Traffic. Nodes are the intersections; cars pick a far node, run to it in
// the right-hand lane, then pick another. The port stays busy everywhere
// the camera might look, without simulating the whole map at full cost.
// ---------------------------------------------------------------------------
const LANE = 27;

function buildNodes() {
  const pts = [];
  for (const x of AVENUES_X) {
    for (const y of STREETS_Y) pts.push({ x: x * TILE, y: y * TILE });
    pts.push({ x: x * TILE, y: COAST_Y * TILE });
  }
  return pts;
}
const NODES = buildNodes();

function nextTarget(car, rng) {
  let bestAvenue = AVENUES_X[0];
  let bestStreet = STREETS_Y[0];
  for (const x of AVENUES_X) {
    if (Math.abs(x * TILE - car.x) < Math.abs(bestAvenue * TILE - car.x)) bestAvenue = x;
  }
  const streets = STREETS_Y.concat([COAST_Y]);
  for (const y of streets) {
    if (Math.abs(y * TILE - car.y) < Math.abs(bestStreet * TILE - car.y)) bestStreet = y;
  }
  let node;
  if (Math.abs(car.x / TILE - bestAvenue) > Math.abs(car.y / TILE - bestStreet) || rng.chance(0.7)) {
    node = { x: bestAvenue * TILE, y: rng.pick(streets) * TILE };
    if (Math.abs(node.y - car.y) < TILE) node.y = rng.pick(STREETS_Y) * TILE;
  } else {
    node = { x: rng.pick(AVENUES_X) * TILE, y: bestStreet * TILE };
    if (Math.abs(node.x - car.x) < TILE) node.x = rng.pick(AVENUES_X) * TILE;
  }
  const dirX = Math.sign(node.x - car.x);
  const dirY = Math.sign(node.y - car.y);
  // Right-hand traffic: aim right of the road centre for the direction run.
  car.route = { x: node.x + dirY * LANE, y: node.y - dirX * LANE };
}

export function createTraffic(world, rng, count) {
  const cars = [];
  const typeIds = ['sedan', 'sedan', 'taxi', 'hatch', 'pickup', 'van', 'sedan', 'hatch', 'muscle'];
  function spawnNear(cx, cy, minD, maxD) {
    for (let tries = 0; tries < 20; tries += 1) {
      const node = rng.pick(NODES);
      const d = dist(node.x, node.y, cx, cy);
      if (d < minD || d > maxD) continue;
      const car = makeCar(rng.pick(typeIds), node.x + rng.range(-8, 8), node.y + rng.range(-8, 8), 0, 'traffic', rng);
      nextTarget(car, rng);
      car.angle = Math.atan2(car.route.x - car.x, -(car.route.y - car.y));
      cars.push(car);
      return car;
    }
    return null;
  }
  for (let i = 0; i < count; i += 1) spawnNear(WORLD_W / 2, WORLD_W / 2, 0, WORLD_W);

  // Parked cars line the streets: colour and cover for the screenshots.
  const parked = [];
  for (const y of STREETS_Y.concat([COAST_Y])) {
    for (let tx = 6; tx < MAP_W - 4; tx += rng.int(5, 11)) {
      const spots = [{ x: tx * TILE, y: (y - 1.55) * TILE, angle: Math.PI / 2 }];
      if (rng.chance(0.6)) spots.push({ x: (tx + 2) * TILE, y: (y + 1.55) * TILE, angle: -Math.PI / 2 });
      for (const s of spots) {
        if (world.circleHitsSolid(s.x, s.y, 24)) continue;
        parked.push(makeCar(rng.pick(typeIds), s.x, s.y, s.angle, 'parked', rng));
      }
    }
  }

  return {
    cars, parked,
    update(dt, focus) {
      for (const car of cars) {
        if (car.dead) continue;
        const dFocus = dist(car.x, car.y, focus.x, focus.y);
        if (dFocus > 3000) {
          // Too far to matter: quietly re-seed near the action.
          const node = rng.pick(NODES);
          if (dist(node.x, node.y, focus.x, focus.y) > 1300) {
            car.x = node.x;
            car.y = node.y;
            car.hp = 100;
            nextTarget(car, rng);
          }
          continue;
        }
        if (!car.route) nextTarget(car, rng);
        // Brake for the car ahead, judged at a point in front of the nose.
        let throttleMul = 1;
        const noseX = car.x + Math.sin(car.angle) * 66;
        const noseY = car.y - Math.cos(car.angle) * 66;
        for (const other of cars) {
          if (other === car || other.dead) continue;
          const ahead = dist(noseX, noseY, other.x, other.y);
          if (ahead < 34) { throttleMul = 0; break; }
          if (ahead < 60) throttleMul = Math.min(throttleMul, 0.3);
        }
        const res = driveToward(car, car.route.x, car.route.y, dt, world, { throttle: throttleMul });
        if (res.dist < 60) nextTarget(car, rng);
      }
    },
  };
}
