// BAHÍA ROJA — the four screenshot scenes behind ?shot=1..4. Each scene
// builds a real, living moment with the actual systems (dispatch filled
// in, combat running, the campaign mid-job), runs it for a fixed number
// of steps while a small driver pins the composition, then freezes the
// simulation so the captured frame is exact. Same seed, same frame,
// every time — main.js runs the driver synchronously to the frozen frame
// before the first paint, so a capture can never land mid-simulation.
//
//   1 — the cover: a golden-hour chase on the coast road, hero car large.
//   2 — action: a market-plaza shootout, every HUD panel populated.
//   3 — the full map face of the port, mid-campaign.
//   4 — MISSION PASSED over the container yard at dusk.

import { TILE } from './config.js';
import { LOCATIONS } from './world.js';
import { makeCar } from './vehicles.js';
import { WEAPONS } from './combat.js';

const COAST = LOCATIONS.ferryDock.y + 60; // on the coast avenue

function policeUnit(game, car, callsign, role) {
  const unit = {
    car, callsign, role: role || 'PURSUIT', sees: true,
    officersOut: false, state: 'IN SIGHT', distToPlayer: 15, officerCd: 9,
  };
  game.police.units.push(unit);
  return unit;
}

function officer(game, unit, x, y, weaponId) {
  const o = {
    x, y, hp: 55, maxHp: 55, angle: Math.PI / 2,
    weaponId: weaponId || 'pistol', accuracy: 0.42, speed: 132,
    band: [150, 300], cooldown: 0.3, burstLeft: 2, burstGap: 0, think: 0,
    strafe: 1, strafeT: 2, unit, dead: false, corpseT: 0, faction: 'police', seesPlayer: true,
  };
  game.police.officers.push(o);
  return o;
}

/** Staging hygiene: no prompts, no feed, no banners inside the frame, and
 *  no fresh dispatch spawns — the staged roster is the whole roster. */
function pinCommon(game, player) {
  game.prompt = null;
  game.feedList.length = 0;
  game.banner = null;
  game.police.bustTimer = 0;
  game.police.spawnT = 99;
  player.hp = 100;
  player.dead = false;
}

function stageChase(game, sys) {
  const { playerCtl, police, missions, traffic } = sys;
  game.hour = 18.24; // golden hour, long red shadows
  const hero = makeCar('sport', 104 * TILE, COAST, Math.PI / 2, 'player', game.rng);
  hero.color = '#b03024';
  playerCtl.state.car = hero;
  playerCtl.state.x = hero.x;
  playerCtl.state.y = hero.y;
  playerCtl.state.radioIdx = 1;
  game.addCar(hero);

  // Clear the stage: ambient traffic and parked cars leave the frame area.
  for (const car of traffic.cars.concat(traffic.parked)) {
    if (Math.abs(car.x - hero.x) < 1100 && Math.abs(car.y - hero.y) < 700) {
      car.x = 2400;
      car.y = 500;
    }
  }

  const copA = makeCar('interceptor', hero.x - 95, hero.y - 30, Math.PI / 2, 'police', game.rng);
  const copB = makeCar('police', hero.x - 150, hero.y + 62, Math.PI / 2, 'police', game.rng);
  const copC = makeCar('police', hero.x + 118, hero.y + 66, Math.PI / 2 + 0.12, 'police', game.rng);
  for (const c of [copA, copB, copC]) game.addCar(c);
  policeUnit(game, copA, 'FARO-2', 'INTERCEPTOR');
  policeUnit(game, copB, 'MUELLE-1', 'PURSUIT');
  policeUnit(game, copC, 'BAHÍA-3', 'BLOCKADE');
  police.heat = 152; // four stars
  police.spawnT = 99; // the staged roster is the whole roster
  police.callsignSeq = 7; // and staged callsigns never collide with spawns
  police.heli = { x: hero.x - 36, y: hero.y - 30, angle: Math.PI / 2, sees: true, orbit: 1.2 };
  game.cash = 18420;
  game.rep = 655;
  game.stats.missionsDone = 11;
  missions.index = 11;
  missions.state = 'active';
  missions.stageIdx = 1; // CARGA FANTASMA: deliver under the searchlights

  let steps = 0;
  const info = { ready: false, screen: 'play' };
  game.shotDriver = () => {
    steps += 1;
    // The hero holds its speed, lane and health; the driver pins the
    // pursuit pack around it so the frozen frame is the staged one.
    hero.speed = 392;
    hero.angle = Math.PI / 2;
    hero.y = COAST;
    hero.hp = 100;
    copA.x = hero.x - 95 + Math.sin(steps * 0.11) * 4;
    copA.y = hero.y - 30;
    copA.angle = Math.PI / 2;
    copA.speed = 392;
    copA.hp = 100;
    copB.x = hero.x - 150;
    copB.y = hero.y + 62 + Math.cos(steps * 0.09) * 4;
    copB.angle = Math.PI / 2;
    copB.speed = 392;
    copB.hp = 100;
    copC.x = hero.x + 118;
    copC.y = hero.y + 66;
    copC.angle = Math.PI / 2 + 0.12;
    copC.speed = 380;
    copC.hp = 100;
    // The heli hovers ahead of the hero: seated top-centre of the frame,
    // clear of both HUD panels, its shadow across the roadblock car. Its
    // hub rides left of the hero's cabin so the red car reads clean.
    police.heli.x = hero.x - 36 + Math.sin(steps * 0.05) * 8;
    police.heli.y = hero.y - 30 + Math.cos(steps * 0.07) * 6;
    police.heli.angle = Math.PI / 2;
    police.heli.sees = true;
    police.heat = Math.max(police.heat, 148);
    // Zoom 3.55 puts the 116px hero at 412px on screen = 32% of frame
    // width (inside the 31–35% spec). The composition is carried by the
    // tightened pack geometry and the camera offset, not by the zoom
    // alone. The camera rides 88px south of the hero so a strip of the
    // sea itself, not just the beach, closes the bottom of the frame.
    game.cam.x = hero.x - 25;
    game.cam.y = hero.y + 88;
    game.cam.zoom = 3.55;
    playerCtl.state.x = hero.x;
    playerCtl.state.y = hero.y;
    pinCommon(game, playerCtl.state);
    if (steps >= 96) {
      game.freezeSim = true;
      info.ready = true;
    }
  };
  return info;
}

function stageAction(game, sys) {
  const { playerCtl, police, combat, missions, traffic, peds } = sys;
  game.hour = 17.9;
  const plaza = LOCATIONS.marketPlaza;
  const player = playerCtl.state;
  game.outfit = 1; // the white suit: Adrián reads apart from the sicarios
  player.x = plaza.x - 120;
  player.y = plaza.y + 10;
  player.angle = Math.PI / 2;
  player.armor = 65;
  playerCtl.giveWeapon('rifle');
  playerCtl.giveWeapon('smg');
  player.weaponIdx = player.weapons.findIndex((w) => w.id === 'rifle');

  for (const car of traffic.cars.concat(traffic.parked)) {
    if (Math.abs(car.x - plaza.x) < 850 && Math.abs(car.y - plaza.y) < 600) {
      car.x = 2400;
      car.y = 500;
    }
  }

  // Sicarios among the stalls, east of the player, across the market street.
  const foes = [];
  const foeSpots = [
    { x: plaza.x + 45, y: plaza.y - 6, w: 'smg' },
    { x: plaza.x + 105, y: plaza.y + 40, w: 'shotgun' },
    { x: plaza.x + 80, y: plaza.y - 58, w: 'rifle' },
    { x: plaza.x + 150, y: plaza.y + 14, w: 'pistol' },
  ];
  for (const s of foeSpots) {
    const e = combat.spawnGang(s.x, s.y, { weapon: s.w, hp: 95, accuracy: 0.4 });
    foes.push({ e, hx: s.x, hy: s.y });
  }
  const gangCar = makeCar('muscle', plaza.x + 185, plaza.y + 84, -Math.PI / 2 + 0.2, 'gang', game.rng);
  gangCar.color = '#23252a';
  game.addCar(gangCar);

  // The Guardia arrives from the west, down the same street.
  const copA = makeCar('police', plaza.x - 195, plaza.y - 16, Math.PI / 2, 'police', game.rng);
  const copB = makeCar('interceptor', plaza.x - 242, plaza.y + 50, Math.PI / 2, 'police', game.rng);
  game.addCar(copA);
  game.addCar(copB);
  const unitA = policeUnit(game, copA, 'SAL-4', 'PURSUIT');
  const unitB = policeUnit(game, copB, 'FARO-1', 'INTERCEPTOR');
  unitA.officersOut = true;
  unitB.officersOut = true;
  const offs = [
    officer(game, unitA, plaza.x - 128, plaza.y - 30, 'pistol'),
    officer(game, unitA, plaza.x - 120, plaza.y + 26, 'smg'),
    officer(game, unitB, plaza.x - 158, plaza.y + 80, 'pistol'),
    officer(game, unitB, plaza.x - 146, plaza.y - 76, 'smg'),
  ];
  const offHomes = offs.map((o) => ({ o, hx: o.x, hy: o.y }));
  // Two market-goers fleeing west across the bottom of the frame.
  const fleers = peds.peds.slice(0, 2).map((ped, i) => {
    const home = { ped, hx: plaza.x - 30 + i * 64, hy: plaza.y + 128 + i * 14 };
    ped.x = home.hx;
    ped.y = home.hy;
    ped.state = 'walk';
    ped.target = null;
    return home;
  });
  police.heat = 96; // three stars
  police.spawnT = 99;
  police.callsignSeq = 7;
  game.cash = 9310;
  game.rep = 402;
  game.stats.missionsDone = 9;
  missions.index = 9;
  missions.state = 'active';
  missions.stageIdx = 0; // MERCADO CERRADO: clear the plaza

  let steps = 0;
  const info = { ready: false, screen: 'play' };
  game.shotDriver = () => {
    steps += 1;
    player.x = plaza.x - 120;
    player.y = plaza.y + 10;
    player.angle = Math.PI / 2 + Math.sin(steps * 0.13) * 0.05;
    for (const f of foes) {
      if (f.e.dead) continue;
      f.e.x = f.hx + Math.sin(steps * 0.07 + f.hy) * 7;
      f.e.y = f.hy + Math.cos(steps * 0.09 + f.hx) * 5;
      f.e.angle = -Math.PI / 2;
    }
    for (const fl of fleers) {
      fl.ped.x = fl.hx - ((steps * 1.5) % 96);
      fl.ped.y = fl.hy + Math.sin(steps * 0.3 + fl.hx) * 2.5;
      fl.ped.angle = -Math.PI / 2;
    }
    gangCar.x = plaza.x + 185;
    gangCar.y = plaza.y + 84;
    gangCar.angle = -Math.PI / 2 + 0.2;
    for (const h of offHomes) {
      h.o.x = h.hx;
      h.o.y = h.hy;
      h.o.angle = Math.PI / 2;
      h.o.hp = 55;
      h.o.dead = false;
    }
    copA.x = plaza.x - 195;
    copA.y = plaza.y - 16;
    copA.angle = Math.PI / 2;
    copA.hp = 100;
    copB.x = plaza.x - 242;
    copB.y = plaza.y + 50;
    copB.angle = Math.PI / 2;
    copB.hp = 100;
    police.heat = Math.max(police.heat, 92);
    // Scripted volleys in the last steps: the frozen frame holds live
    // tracers, muzzle flashes and fresh damage numbers.
    if (steps >= 88 && steps % 2 === 0) {
      combat.fireBullet(player.x, player.y, Math.PI / 2 + game.rng.range(-0.03, 0.03), WEAPONS.rifle, 'player', game.rng);
      const foe = foes[1].e;
      if (!foe.dead) combat.fireBullet(foe.x, foe.y, -Math.PI / 2 + game.rng.range(-0.05, 0.05), WEAPONS.smg, 'gang', game.rng);
      const off = offs[0];
      combat.fireBullet(off.x, off.y, Math.PI / 2, WEAPONS.pistol, 'police', game.rng);
    }
    if (steps === 92) {
      combat.fx.damageNumber(foes[0].hx, foes[0].hy, 34, '#ffe9a8');
      combat.fx.hitPuff(foes[0].hx, foes[0].hy, '#8f2f26');
    }
    if (steps === 94) combat.fx.damageNumber(foes[2].hx, foes[2].hy, 23, '#ffe9a8');
    game.cam.x = plaza.x - 16;
    game.cam.y = plaza.y - 55;
    game.cam.zoom = 2.6;
    pinCommon(game, player);
    if (steps >= 96) {
      game.freezeSim = true;
      info.ready = true;
    }
  };
  return info;
}

function stageMap(game, sys) {
  const { playerCtl, missions } = sys;
  // A campaign well under way: nine jobs done, the tenth live.
  game.stats.missionsDone = 9;
  game.stats.crates = 11;
  game.stats.kills = 46;
  game.stats.carsJacked = 13;
  game.rep = 486;
  game.cash = 12740;
  for (const id of ['puerto', 'mercado', 'escarlata', 'astillero', 'mirador']) {
    game.stats.districts[id] = true;
  }
  missions.index = 9;
  missions.state = 'active';
  missions.stageIdx = 0;
  playerCtl.state.x = LOCATIONS.marketPlaza.x;
  playerCtl.state.y = LOCATIONS.marketPlaza.y;
  game.waypoint = { x: LOCATIONS.casino.x, y: LOCATIONS.casino.y };
  game.feedList.length = 0;
  return { ready: true, screen: 'map' };
}

function stagePassed(game, sys) {
  const { playerCtl, missions } = sys;
  game.hour = 18.85; // late golden light over the yard, not yet night
  const crane = LOCATIONS.yardCrane;
  const hero = makeCar('sport', crane.x - 90, crane.y + 215, Math.PI / 2 - 0.35, 'player', game.rng);
  hero.color = '#b03024';
  playerCtl.state.car = hero;
  playerCtl.state.x = hero.x;
  playerCtl.state.y = hero.y;
  game.addCar(hero);
  const crewA = makeCar('muscle', crane.x + 150, crane.y + 240, Math.PI / 2 + 0.2, 'parked', game.rng);
  const crewB = makeCar('truck', crane.x + 330, crane.y + 120, Math.PI, 'parked', game.rng);
  game.addCar(crewA);
  game.addCar(crewB);
  // The crew stands by the cars, celebrating.
  const crewSpots = [
    { x: crane.x - 28, y: crane.y + 192 },
    { x: crane.x + 44, y: crane.y + 252 },
    { x: crane.x + 128, y: crane.y + 196 },
  ];
  game.peds.peds.slice(0, 3).forEach((ped, i) => {
    ped.x = crewSpots[i].x;
    ped.y = crewSpots[i].y;
    ped.state = 'walk';
    ped.target = null;
    ped.timer = 99;
    ped.speed = 0;
  });
  game.stats.missionsDone = 13;
  game.stats.crates = 17;
  game.cash = 24180;
  game.rep = 702;
  missions.index = 13;
  missions.state = 'offer';
  game.passedInfo = {
    title: 'LA ÚLTIMA GRÚA', cash: 4400, bonus: 1100, rep: 120,
    rank: 'Casa Roja · 13/15',
  };
  game.passedTimer = 9999;
  game.cam.x = crane.x + 40;
  game.cam.y = crane.y + 80;
  game.cam.zoom = 1.45;
  game.feedList.length = 0;
  return { ready: true, screen: 'passed' };
}

export function stageShot(name, game, sys) {
  const n = String(name);
  if (n === '2' || n === 'action') return stageAction(game, sys);
  if (n === '3' || n === 'map') return stageMap(game, sys);
  if (n === '4' || n === 'passed') return stagePassed(game, sys);
  return stageChase(game, sys);
}
