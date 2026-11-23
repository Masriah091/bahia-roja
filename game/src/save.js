// BAHÍA ROJA — three save slots in the browser's local storage.
//
// A save is the campaign, not the street: mission index, cash, reputation,
// the weapon belt, the crates found and the run statistics. Loading puts
// Adrián back at the Casa Roja warehouse with a clean record — the
// Guardia forgets, the port forgives, the story continues. Storage
// failures (private windows, quotas) degrade to "slot empty", never to
// a crash: a port that cannot remember is still a port.

import { SAVE_KEYS } from './config.js';

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** What the saves screen prints about a slot, without loading it. */
export function slotInfo(slot) {
  const data = read(SAVE_KEYS[slot]);
  if (!data) return null;
  return {
    mission: data.missionIndex + 1,
    cash: data.cash,
    rep: data.rep,
    when: data.when || '',
  };
}

/** Save the campaign half of `game` into slot (0..2). True on success. */
export function saveGame(game, slot) {
  const p = game.playerCtl.state;
  const data = {
    version: 1,
    when: new Date().toISOString().slice(0, 10),
    missionIndex: game.missions.index,
    cash: game.cash,
    rep: game.rep,
    outfit: game.outfit,
    hat: game.hat,
    weapons: p.weapons.map((w) => ({ id: w.id, mag: w.mag, reserve: w.reserve })),
    weaponIdx: p.weaponIdx,
    crates: game.world.collectibles.filter((c) => c.taken).map((c) => c.id),
    stats: {
      missionsDone: game.stats.missionsDone,
      crates: game.stats.crates,
      kills: game.stats.kills,
      carsJacked: game.stats.carsJacked,
      deaths: game.stats.deaths,
      busts: game.stats.busts,
      playSeconds: Math.round(game.stats.playSeconds),
    },
  };
  return write(SAVE_KEYS[slot], data);
}

/** Load slot (0..2) into `game`. True when a save was there to load. */
export function loadGame(game, slot) {
  const data = read(SAVE_KEYS[slot]);
  if (!data) return false;
  game.missions.index = data.missionIndex || 0;
  game.missions.state = game.missions.index >= 15 ? 'alldone' : 'offer';
  game.missions.stageIdx = 0;
  game.cash = data.cash || 0;
  game.rep = data.rep || 0;
  game.outfit = data.outfit || 0;
  game.hat = !!data.hat;
  const p = game.playerCtl.state;
  p.weapons = (data.weapons && data.weapons.length)
    ? data.weapons
    : [{ id: 'pistol', mag: 12, reserve: 90 }];
  p.weaponIdx = Math.min(data.weaponIdx || 0, p.weapons.length - 1);
  p.hp = 100;
  p.armor = 0;
  p.dead = false;
  if (p.car) game.playerCtl.exitCar(game.ctx);
  for (const c of game.world.collectibles) c.taken = (data.crates || []).includes(c.id);
  Object.assign(game.stats, data.stats || {});
  game.stats.districts = game.stats.districts || {};
  game.police.clear(9999);
  game.police.heat = 0;
  return true;
}
