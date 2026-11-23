// BAHÍA ROJA — the people of the port: dockers, market-goers, grandmothers
// with shopping bags, all walking the pavements between the districts.
// They stroll between waypoints, chat in pairs, and scatter when a car
// mounts the kerb or a shot rings out near them. Pure ambience — but
// ambience is what makes a screenshot read as a city, not a diorama.

import { DISTRICTS } from './config.js';
import { dist, angleTurn, angleTo } from './rng.js';

const SHIRTS = ['#d8d2c2', '#4f8f7b', '#c74f35', '#2f6db0', '#e3e0d2', '#b8577f', '#7a8894', '#c78a2e'];
const PANTS = ['#3d3a38', '#55534f', '#6b4a35', '#37424e', '#8a8578'];

export function createPeds(world, rng, count) {
  const peds = [];

  function wanderTarget(ped) {
    const spot = world.randomPointIn(rng, ped.district);
    ped.target = spot;
  }

  for (let i = 0; i < count; i += 1) {
    const d = rng.pick(DISTRICTS);
    const spot = world.randomPointIn(rng, d.id);
    const ped = {
      x: spot.x, y: spot.y,
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(52, 86),
      baseSpeed: 0,
      state: 'walk', // walk | flee | chat
      target: null,
      timer: rng.range(0, 4),
      district: d.id,
      shirt: rng.pick(SHIRTS),
      pants: rng.pick(PANTS),
      skin: rng.pick(['#8a5a3b', '#a06a42', '#6e452b', '#c08a5a']),
      seed: rng.int(1, 9999),
    };
    ped.baseSpeed = ped.speed;
    wanderTarget(ped);
    peds.push(ped);
  }

  /** Everyone within r of (x, y) runs from it. Gunfire, explosions, sirens. */
  function scare(x, y, r) {
    for (const ped of peds) {
      if (dist(ped.x, ped.y, x, y) < r) {
        ped.state = 'flee';
        ped.timer = rng.range(1.6, 3.2);
        ped.fleeFrom = { x, y };
      }
    }
  }

  function update(dt, ctx) {
    const focus = ctx.focus;
    for (const ped of peds) {
      // Far from the camera, people simply hold still: the port is big
      // and the frame is small, and nobody misses a frozen docker.
      if (focus && dist(ped.x, ped.y, focus.x, focus.y) > 2400) continue;
      ped.timer -= dt;
      if (ped.state === 'flee') {
        const from = ped.fleeFrom || focus || { x: ped.x, y: ped.y - 1 };
        const away = angleTo(from.x, from.y, ped.x, ped.y);
        ped.angle = angleTurn(ped.angle, away, 6 * dt);
        const pos = { x: ped.x, y: ped.y };
        world.moveCircle(pos, Math.sin(ped.angle) * 168 * dt, -Math.cos(ped.angle) * 168 * dt, 11);
        ped.x = pos.x;
        ped.y = pos.y;
        if (ped.timer <= 0) { ped.state = 'walk'; wanderTarget(ped); }
        continue;
      }
      if (ped.state === 'chat') {
        if (ped.timer <= 0) { ped.state = 'walk'; wanderTarget(ped); }
        continue;
      }
      // Walking: head for the target, then rest, chat, or wander on.
      if (!ped.target) wanderTarget(ped);
      const t = ped.target;
      const d = dist(ped.x, ped.y, t.x, t.y);
      if (d < 26) {
        const roll = rng.next();
        if (roll < 0.3) {
          ped.state = 'chat';
          ped.timer = rng.range(2, 6);
        } else {
          wanderTarget(ped);
        }
        continue;
      }
      const want = angleTo(ped.x, ped.y, t.x, t.y);
      ped.angle = angleTurn(ped.angle, want, 4 * dt);
      const pos = { x: ped.x, y: ped.y };
      const blocked = world.moveCircle(pos, Math.sin(ped.angle) * ped.speed * dt,
        -Math.cos(ped.angle) * ped.speed * dt, 11);
      ped.x = pos.x;
      ped.y = pos.y;
      if (blocked && rng.chance(0.02)) wanderTarget(ped);
      // A fast car close by is reason enough to run, driver unseen.
      if (ctx.nearestFastCar) {
        const near = ctx.nearestFastCar(ped.x, ped.y, 120);
        if (near) {
          ped.state = 'flee';
          ped.timer = 1.8;
          ped.fleeFrom = { x: near.x, y: near.y };
        }
      }
    }
  }

  return { peds, update, scare };
}
