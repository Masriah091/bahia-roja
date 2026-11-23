// BAHÍA ROJA — Adrián himself: on foot and behind the wheel. The player
// controller owns the body state (health, armour, the weapon belt), reads
// input each step, drives the current car through the shared vehicle
// physics, fires the current weapon, and reports crimes to the Guardia
// the moment they happen. Interaction prompts (enter car, shop, mission)
// are resolved by main.js; this module only moves and shoots.

import { PLAYER, RADIO } from './config.js';
import { clamp, dist, angleTo } from './rng.js';
import { WEAPONS, WEAPON_ORDER } from './combat.js';
import { stepVehicle, carRadius } from './vehicles.js';

export function createPlayer(world, rng) {
  const state = {
    x: 0, y: 0, angle: 0,
    vx: 0, vy: 0,
    hp: PLAYER.maxHealth,
    armor: 0,
    car: null,
    weapons: [{ id: 'pistol', mag: WEAPONS.pistol.mag, reserve: 90 }],
    weaponIdx: 0,
    fireCd: 0,
    reloadT: 0,
    radioIdx: 1,
    dead: false,
    walkCycle: 0,
  };

  function hasWeapon(id) {
    return state.weapons.some((w) => w.id === id);
  }

  function giveWeapon(id) {
    if (hasWeapon(id)) return;
    state.weapons.push({ id, mag: WEAPONS[id].mag, reserve: WEAPONS[id].mag * 3 });
    // Keep the belt in canonical order so the HUD strip never shuffles.
    state.weapons.sort((a, b) => WEAPON_ORDER.indexOf(a.id) - WEAPON_ORDER.indexOf(b.id));
  }

  function heal(amount) {
    state.hp = clamp(state.hp + amount, 0, PLAYER.maxHealth);
  }

  function currentWeapon() {
    return state.weapons[state.weaponIdx] || state.weapons[0];
  }

  function hurt(dmg, ctx) {
    if (state.dead) return;
    let left = dmg;
    if (state.armor > 0) {
      const soaked = Math.min(state.armor, left * 0.7);
      state.armor -= soaked;
      left -= soaked;
    }
    state.hp -= left;
    ctx.onHurt();
    if (state.hp <= 0) {
      state.hp = 0;
      state.dead = true;
      ctx.onDeath();
    }
  }

  function updateOnFoot(dt, ctx) {
    const input = ctx.input;
    let mx = 0;
    let my = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) my -= 1;
    if (input.down('KeyS') || input.down('ArrowDown')) my += 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) mx -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) mx += 1;
    const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
    const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(mx, my) || 1;
    if (mx !== 0 || my !== 0) {
      state.angle = Math.atan2(mx, -my);
      state.walkCycle += dt * (sprint ? 11 : 8);
    }
    state.vx = (mx / len) * (mx || my ? speed : 0);
    state.vy = (my / len) * (mx || my ? speed : 0);
    const pos = { x: state.x, y: state.y };
    world.moveCircle(pos, state.vx * dt, state.vy * dt, PLAYER.radius);
    state.x = pos.x;
    state.y = pos.y;

    // Aim follows the mouse when one is in play; otherwise the body.
    if (input.mouse.active) {
      const aim = ctx.screenToWorld(input.mouse.x, input.mouse.y);
      state.angle = angleTo(state.x, state.y, aim.x, aim.y);
    }

    // -- Firing -------------------------------------------------------------
    state.fireCd -= dt;
    if (state.reloadT > 0) {
      state.reloadT -= dt;
      if (state.reloadT <= 0) {
        const slot = currentWeapon();
        const def = WEAPONS[slot.id];
        const take = Math.min(def.mag - slot.mag, slot.reserve);
        slot.mag += take;
        slot.reserve -= take;
      }
    }
    const slot = currentWeapon();
    const def = WEAPONS[slot.id];
    const wantsFire = input.mouse.down || input.down('Space');
    if (wantsFire && state.fireCd <= 0 && state.reloadT <= 0) {
      if (slot.mag <= 0) {
        state.reloadT = 1.1;
        state.fireCd = 0.3;
        ctx.audio.denied();
      } else {
        slot.mag -= 1;
        state.fireCd = def.rate;
        ctx.combat.fireBullet(state.x, state.y, state.angle, def, 'player', rng);
        ctx.audio.shot(0.5);
        ctx.police.reportCrime(state.x, state.y, 'shot');
        ctx.scare(state.x, state.y, 260);
        if (slot.mag === 0 && slot.reserve > 0) state.reloadT = 1.1;
      }
    }
    if (input.pressed('KeyR') && state.reloadT <= 0 && slot.mag < def.mag && slot.reserve > 0) {
      state.reloadT = 1.1;
    }
    // Weapon switching on the number keys and the wheel.
    for (let i = 0; i < state.weapons.length && i < 4; i += 1) {
      if (input.pressed('Digit' + (i + 1))) state.weaponIdx = i;
    }
    if (input.wheel !== 0 && state.weapons.length > 1) {
      state.weaponIdx = (state.weaponIdx + Math.sign(input.wheel) + state.weapons.length)
        % state.weapons.length;
    }
  }

  function updateInCar(dt, ctx) {
    const input = ctx.input;
    const car = state.car;
    let throttle = 0;
    let steer = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) throttle += 1;
    if (input.down('KeyS') || input.down('ArrowDown')) throttle -= 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) steer -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) steer += 1;
    const handbrake = input.down('Space');
    const impact = stepVehicle(car, throttle, steer, dt, world, handbrake);
    state.x = car.x;
    state.y = car.y;
    state.angle = car.angle;
    state.vx = Math.sin(car.angle) * car.speed;
    state.vy = -Math.cos(car.angle) * car.speed;
    if (impact > 90) {
      ctx.audio.crash(false);
      ctx.police.reportCrime(car.x, car.y, 'crash');
      ctx.scare(car.x, car.y, 240);
      if (impact > 190) hurt(Math.round((impact - 190) * 0.06), ctx);
    }
    if (car.hp <= 0 && !car.exploded) {
      car.exploded = true;
      car.dead = true;
      ctx.combat.fx.explosion(car.x, car.y);
      hurt(35, ctx);
      exitCar(ctx);
    }
    if (input.pressed('KeyQ')) {
      state.radioIdx = (state.radioIdx + 1) % RADIO.length;
      ctx.feed('Radio: ' + RADIO[state.radioIdx].name + ' ' + RADIO[state.radioIdx].freq);
    }
    void carRadius;
  }

  function enterCar(car, ctx) {
    state.car = car;
    car.driver = 'player';
    state.x = car.x;
    state.y = car.y;
    if (car.wasParked) ctx.police.reportCrime(car.x, car.y, 'jack');
  }

  function exitCar(ctx) {
    const car = state.car;
    if (!car) return;
    car.driver = 'parked';
    state.car = null;
    // Step out on the left side, onto whatever ground is there.
    const side = { x: car.x - Math.cos(car.angle) * 40, y: car.y - Math.sin(car.angle) * 40 };
    if (world.passable(side.x, side.y) && !world.circleHitsSolid(side.x, side.y, PLAYER.radius)) {
      state.x = side.x;
      state.y = side.y;
    }
    void ctx;
  }

  function update(dt, ctx) {
    if (state.dead) return;
    if (state.car) updateInCar(dt, ctx);
    else updateOnFoot(dt, ctx);
  }

  return {
    state, hasWeapon, giveWeapon, heal, hurt, update,
    enterCar, exitCar, currentWeapon,
    /** Distance from the body (or its car) to a point. */
    distTo(x, y) {
      return dist(state.x, state.y, x, y);
    },
  };
}
