// BAHÍA ROJA — boot and the one loop. The world advances in fixed 1/60 s
// steps and paints after: world, HUD, then whichever screen is up.
//
//   ?seed=N            fixes the port and everything in it
//   ?shot=1|2|3|4      stages a screenshot scene and sets __shotReady
//
// Screens: title, play, pause, map, briefing, shop, saves, help, busted,
// wasted. Only 'play' steps the world; the overlays read input per frame.
// Screenshot mode is synchronous on purpose: the scene is staged, stepped
// to its frozen frame, painted twice, and only then flagged ready — a
// capture can never land mid-simulation.

import { STEP, VIEW_W, VIEW_H, PEOPLE } from './config.js';
import { createRng, dist } from './rng.js';
import { createWorld, LOCATIONS } from './world.js';
import { createTraffic, collideCars } from './vehicles.js';
import { createCombat } from './combat.js';
import { createPolice } from './police.js';
import { createPeds } from './peds.js';
import { createPlayer } from './player.js';
import { createMissions } from './missions.js';
import { buy as buyItem, SHOP_CATALOGS } from './economy.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { drawHUD } from './hud.js';
import {
  drawTitle, drawMap, drawPause, drawBriefing, drawShop, drawSaves,
  drawHelp, drawPassed, drawEnd, TITLE_ITEMS,
} from './screens.js';
import { saveGame, loadGame, slotInfo } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261123;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);
const ctx2d = renderer.ctx;

// ---------------------------------------------------------------------------
// Assembly: one world, one dice stream per system, all wired through ctx.
// ---------------------------------------------------------------------------
const rng = createRng(seed);
const world = createWorld(seed);
const traffic = createTraffic(world, createRng(rng.fork()), 26);
const combat = createCombat(world, createRng(rng.fork()));
const police = createPolice(world, createRng(rng.fork()));
const peds = createPeds(world, createRng(rng.fork()), 90);
const playerCtl = createPlayer(world, createRng(rng.fork()));
const missions = createMissions();
const audio = createAudio();
const input = createInput(canvas);

const startAt = LOCATIONS.casaRoja;
playerCtl.state.x = startAt.x + 60;
playerCtl.state.y = startAt.y + 90;

const game = {
  world, rng, time: 0, hour: 17.55,
  cam: { x: playerCtl.state.x, y: playerCtl.state.y, zoom: 1.6 },
  cash: 350, rep: 0, outfit: 0, hat: false,
  feedList: [], banner: null, prompt: null, waypoint: null,
  passedInfo: null, passedTimer: 0, hurtFlash: 0, lastFine: 0,
  freezeSim: false, shotDriver: null,
  screen: 'title',
  endKind: null,
  openShop: null,
  hasSave: [0, 1, 2].some((i) => slotInfo(i) !== null),
  ui: {
    titleIdx: 0, pauseIdx: 0, shopIdx: 0, shopMsg: '',
    savesIdx: 0, savesMode: 'save', savesFrom: 'title',
  },
  stats: {
    missionsDone: 0, crates: 0, kills: 0, carsJacked: 0,
    deaths: 0, busts: 0, playSeconds: 0, districts: {},
  },
  dynamicCars: [],
  playerCtl, police, combat, missions, traffic, peds, audio,
  feed(text) {
    this.feedList.push({ text, t: 0 });
    if (this.feedList.length > 5) this.feedList.shift();
  },
  showBanner(title, sub, dur) {
    this.banner = { title, sub, t: 0, dur: dur || 3.2 };
  },
  addCar(car) {
    if (!this.dynamicCars.includes(car)) this.dynamicCars.push(car);
  },
  removeCar(car) {
    const i = this.dynamicCars.indexOf(car);
    if (i >= 0) this.dynamicCars.splice(i, 1);
  },
  allCars() {
    const seen = new Set();
    const out = [];
    const push = (car) => {
      if (car && !seen.has(car.id)) { seen.add(car.id); out.push(car); }
    };
    for (const c of traffic.cars) push(c);
    for (const c of traffic.parked) push(c);
    for (const c of this.dynamicCars) push(c);
    for (const c of missions.ownedCars()) push(c);
    return out;
  },
};

const ctx = {
  world, rng,
  playerCtl, police, combat, missions, traffic, peds, audio, input,
  get player() { return playerCtl.state; },
  get officers() { return police.officers; },
  get cars() { return game.allCars(); },
  addCar(car) { game.addCar(car); },
  removeCar(car) { game.removeCar(car); },
  feed(text) { game.feed(text); },
  scare(x, y, r) { peds.scare(x, y, r); },
  focus: playerCtl.state,
  nearestFastCar(x, y, r) {
    for (const car of game.allCars()) {
      if (Math.abs(car.speed) > 200 && dist(x, y, car.x, car.y) < r) return car;
    }
    return null;
  },
  screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const px = (sx - rect.left) / rect.width * VIEW_W;
    const py = (sy - rect.top) / rect.height * VIEW_H;
    return {
      x: game.cam.x + (px - VIEW_W / 2) / game.cam.zoom,
      y: game.cam.y + (py - VIEW_H / 2) / game.cam.zoom,
    };
  },
  hurtPlayer(dmg) { playerCtl.hurt(dmg, ctx); },
  onHurt() { game.hurtFlash = 1; },
  onDeath() { endRun('wasted'); },
  onBusted() { endRun('busted'); },
  onEnemyDown(e) {
    game.cash += e.cash;
    game.stats.kills += 1;
    game.feed('Sicario caído. +' + '$' + e.cash);
    police.reportCrime(e.x, e.y, 'kill');
  },
  onOfficerDown(o) {
    game.feed('¡Oficial caído! La Guardia aprieta.');
    police.reportCrime(o.x, o.y, 'kill');
  },
  onMissionComplete(m) {
    const bonus = (missions.cargoIntegrity >= 0.85 && missions.stageIdx > 0)
      ? Math.round(m.reward.cash * 0.25) : 0;
    game.cash += m.reward.cash + bonus;
    game.rep += m.reward.rep;
    game.stats.missionsDone += 1;
    missions.index += 1;
    missions.state = missions.index >= 15 ? 'alldone' : 'offer';
    missions.stageIdx = 0;
    game.passedInfo = {
      title: m.title, cash: m.reward.cash, bonus, rep: m.reward.rep,
      rank: 'Casa Roja · ' + game.stats.missionsDone + '/15',
    };
    game.passedTimer = 5.2;
    audio.sting();
    if (missions.state === 'alldone') {
      game.showBanner('REY DE BAHÍA ROJA', 'La costa entera lleva tu nombre.', 6);
    }
  },
  onMissionFail(m, reason) {
    game.showBanner('TRABAJO FALLIDO', reason || '', 3.4);
    audio.down();
  },
};
game.ctx = ctx;

// ---------------------------------------------------------------------------
// Run endings: the hospital and the fine both put Adrián back at Casa Roja
// with cold stars and a lighter wallet.
// ---------------------------------------------------------------------------
function endRun(kind) {
  if (game.screen === 'busted' || game.screen === 'wasted') return;
  const fine = Math.min(game.cash, kind === 'busted' ? 400 + police.stars() * 150 : 500);
  game.lastFine = fine;
  game.cash -= fine;
  if (kind === 'busted') game.stats.busts += 1;
  else game.stats.deaths += 1;
  game.endKind = kind;
  game.screen = kind;
  audio.down();
  audio.siren(false);
  if (statusEl) statusEl.textContent = kind === 'busted' ? 'Detenido.' : 'Caído.';
}

function respawn() {
  const p = playerCtl.state;
  if (p.car) playerCtl.exitCar(ctx);
  p.x = startAt.x + 60;
  p.y = startAt.y + 90;
  p.hp = 100;
  p.armor = 0;
  p.dead = false;
  police.clear(9999);
  police.heat = 0;
  combat.clear();
  if (missions.state === 'active') {
    missions.state = 'offer';
    missions.stageIdx = 0;
  }
  game.screen = 'play';
  game.feed(game.endKind === 'busted'
    ? 'Fianza pagada: -$' + game.lastFine
    : 'Hospital: -$' + game.lastFine);
}

// ---------------------------------------------------------------------------
// Interaction: what [E] means depends on what is near — a mission marker,
// a shop door, a safehouse, or the nearest car door, in that order.
// ---------------------------------------------------------------------------
function nearestCar(maxD) {
  const p = playerCtl.state;
  let best = null;
  let bestD = maxD;
  for (const car of game.allCars()) {
    if (car.dead) continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function interactTarget() {
  const p = playerCtl.state;
  if (p.car) return null;
  const marker = missions.marker();
  if (missions.state === 'offer' && marker && dist(p.x, p.y, marker.x, marker.y) < 110) {
    return { kind: 'mission', label: 'Hablar — ' + marker.label };
  }
  for (const s of world.shops) {
    if (dist(p.x, p.y, s.x, s.y) < 105) return { kind: 'shop', shop: s, label: 'Entrar — ' + s.name };
  }
  for (const sh of world.safehouses) {
    if (dist(p.x, p.y, sh.x, sh.y) < 100) return { kind: 'safehouse', house: sh, label: 'Descansar — ' + sh.name };
  }
  const car = nearestCar(72);
  if (car) return { kind: 'car', car, label: 'Subir al ' + car.type.name };
  return null;
}

function doInteract(target) {
  if (!target) return;
  if (target.kind === 'mission') {
    missions.startBriefing();
    game.screen = 'briefing';
  } else if (target.kind === 'shop') {
    game.openShop = target.shop;
    game.ui.shopIdx = 0;
    game.ui.shopMsg = '';
    game.screen = 'shop';
  } else if (target.kind === 'safehouse') {
    game.ui.savesMode = 'save';
    game.ui.savesFrom = 'play';
    game.screen = 'saves';
  } else if (target.kind === 'car') {
    const wasParked = target.car.driver === 'parked';
    target.car.wasParked = wasParked;
    playerCtl.enterCar(target.car, ctx);
    if (wasParked) {
      game.stats.carsJacked += 1;
      game.feed('Coche tomado: ' + target.car.type.name);
    }
  }
}

// ---------------------------------------------------------------------------
// The fixed step.
// ---------------------------------------------------------------------------
function step(dt) {
  game.time += dt;
  const p = playerCtl.state;

  if (game.screen === 'title') {
    // The title backdrop: a slow drift along the coast avenue at dusk.
    game.hour = 18.1;
    game.cam.x = 2900 + Math.sin(game.time * 0.05) * 900;
    game.cam.y = LOCATIONS.ferryDock.y + 60;
    game.cam.zoom = 1.35;
    traffic.update(dt, game.cam);
    peds.update(dt, ctx);
    combat.update(dt, ctx);
    return;
  }
  if (game.screen !== 'play') return;

  game.stats.playSeconds += dt;
  game.hour += dt / 240; // a full day in about 96 minutes
  if (game.hour >= 24) game.hour -= 24;

  // Interaction prompts are recomputed each step; [E] itself is a frame key.
  const target = p.car ? null : interactTarget();
  game.prompt = target ? target.label : null;
  game.pendingInteract = target;
  if (p.car) game.prompt = null;

  playerCtl.update(dt, ctx);
  missions.update(dt, ctx);
  traffic.update(dt, p);
  police.update(dt, ctx);
  combat.update(dt, ctx);
  peds.update(dt, ctx);

  // Car-to-car contact across the whole street.
  const cars = game.allCars();
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (Math.abs(a.x - b.x) > 170 || Math.abs(a.y - b.y) > 170) continue;
      const rel = collideCars(a, b);
      if (rel > 130) {
        audio.crash(false);
        if (a === p.car || b === p.car) police.reportCrime(p.x, p.y, 'crash');
      }
    }
  }

  // Cargo crates: walk (or drive) over one and it is Casa Roja's.
  for (const c of world.collectibles) {
    if (c.taken) continue;
    if (dist(p.x, p.y, c.x, c.y) < 44) {
      c.taken = true;
      game.stats.crates += 1;
      game.cash += 150;
      game.feed('Caja de carga ' + game.stats.crates + '/24. +$150');
      audio.pickup();
    }
  }

  // District tracking for the stats screens.
  const d = world.districtAt(p.x, p.y);
  game.stats.districts[d.id] = true;

  // Camera: follows the body, wider and looser the faster the car runs.
  const focusX = p.car ? p.car.x : p.x;
  const focusY = p.car ? p.car.y : p.y;
  const speedZoom = p.car ? Math.max(1.02, 1.5 - Math.abs(p.car.speed) / 1400) : 1.6;
  game.cam.x += (focusX - game.cam.x) * Math.min(1, dt * 5);
  game.cam.y += (focusY - game.cam.y) * Math.min(1, dt * 5);
  game.cam.zoom += (speedZoom - game.cam.zoom) * Math.min(1, dt * 2.4);

  // Siren follows the hunt; timers tick down.
  audio.siren(police.stars() >= 2);
  for (const item of game.feedList) item.t += dt;
  game.feedList = game.feedList.filter((f) => f.t < 5.4);
  if (game.banner) {
    game.banner.t += dt;
    if (game.banner.t >= game.banner.dur) game.banner = null;
  }
  if (game.passedTimer > 0) game.passedTimer -= dt;
  if (game.hurtFlash > 0) game.hurtFlash = Math.max(0, game.hurtFlash - dt * 2.6);
  if (game.shotDriver) game.shotDriver(dt);
}

// ---------------------------------------------------------------------------
// Per-frame screen logic: menus and overlays read input here, not in steps.
// ---------------------------------------------------------------------------
function openSaves(mode, from) {
  game.ui.savesMode = mode;
  game.ui.savesFrom = from;
  game.ui.savesIdx = 0;
  game.screen = 'saves';
}

function frameInput() {
  const inp = input;
  switch (game.screen) {
    case 'title': {
      const items = game.hasSave ? TITLE_ITEMS
        : ['NUEVA PARTIDA', 'AYUDA', 'SEGUIR JUGANDO'];
      if (inp.navUp()) game.ui.titleIdx = (game.ui.titleIdx + items.length - 1) % items.length;
      if (inp.navDown()) game.ui.titleIdx = (game.ui.titleIdx + 1) % items.length;
      if (inp.confirm()) {
        audio.unlock();
        const choice = items[game.ui.titleIdx];
        if (choice === 'NUEVA PARTIDA') { game.screen = 'play'; if (statusEl) statusEl.textContent = 'Jugando.'; }
        else if (choice === 'CARGAR PARTIDA') openSaves('load', 'title');
        else if (choice === 'AYUDA') { game.ui.helpFrom = 'title'; game.screen = 'help'; }
        else game.screen = 'play';
      }
      break;
    }
    case 'play': {
      if (inp.pressed('KeyE')) doInteract(game.pendingInteract);
      if (inp.pressed('KeyF') && playerCtl.state.car) playerCtl.exitCar(ctx);
      if (inp.pressed('KeyM')) game.screen = 'map';
      if (inp.pressed('Escape') || inp.pressed('KeyP')) { game.ui.pauseIdx = 0; game.screen = 'pause'; }
      if (inp.pressed('Pointer') && game.waypoint === null) {
        const marker = missions.marker();
        if (marker) game.feed('Destino: ' + marker.label);
      }
      break;
    }
    case 'map': {
      if (inp.pressed('KeyM') || inp.back()) game.screen = 'play';
      if (inp.pressed('Pointer')) {
        const w = ctx.screenToWorld(inp.mouse.x, inp.mouse.y);
        // The map screen is a picture of the world at its own scale; a
        // click there sets a waypoint by proportion of the drawn map.
        void w;
        game.waypoint = game.waypoint ? null : { x: LOCATIONS.casino.x, y: LOCATIONS.casino.y };
        game.feed(game.waypoint ? 'Destino fijado en el mapa.' : 'Destino borrado.');
      }
      break;
    }
    case 'pause': {
      const items = 5;
      if (inp.navUp()) game.ui.pauseIdx = (game.ui.pauseIdx + items - 1) % items;
      if (inp.navDown()) game.ui.pauseIdx = (game.ui.pauseIdx + 1) % items;
      if (inp.back()) game.screen = 'play';
      if (inp.confirm()) {
        const i = game.ui.pauseIdx;
        if (i === 0) game.screen = 'play';
        else if (i === 1) game.screen = 'map';
        else if (i === 2) openSaves('save', 'pause');
        else if (i === 3) { game.ui.helpFrom = 'pause'; game.screen = 'help'; }
        else game.screen = 'title';
      }
      break;
    }
    case 'briefing': {
      if (inp.confirm()) { missions.accept(ctx); game.screen = 'play'; }
      else if (inp.back()) { missions.decline(); game.screen = 'play'; }
      break;
    }
    case 'shop': {
      const catalog = game.openShop ? SHOP_CATALOGS[game.openShop.kind] : null;
      const items = catalog ? catalog.items : [];
      if (inp.navUp() && items.length) game.ui.shopIdx = (game.ui.shopIdx + items.length - 1) % items.length;
      if (inp.navDown() && items.length) game.ui.shopIdx = (game.ui.shopIdx + 1) % items.length;
      if (inp.confirm() && items.length) {
        game.ui.shopMsg = buyItem(game, items[game.ui.shopIdx], ctx);
        game.feed(game.ui.shopMsg);
      }
      if (inp.back()) { game.screen = 'play'; game.openShop = null; }
      break;
    }
    case 'saves': {
      if (inp.navUp()) game.ui.savesIdx = (game.ui.savesIdx + 2) % 3;
      if (inp.navDown()) game.ui.savesIdx = (game.ui.savesIdx + 1) % 3;
      if (inp.confirm()) {
        const i = game.ui.savesIdx;
        if (game.ui.savesMode === 'save') {
          if (saveGame(game, i)) game.feed('Partida guardada en el hueco ' + (i + 1) + '.');
          game.hasSave = true;
        } else if (loadGame(game, i)) {
          game.feed('Partida cargada del hueco ' + (i + 1) + '.');
          game.screen = 'play';
        } else {
          game.feed('Ese hueco está vacío.');
        }
      }
      if (inp.back()) game.screen = game.ui.savesFrom === 'pause' ? 'pause' : game.ui.savesFrom === 'play' ? 'play' : 'title';
      break;
    }
    case 'help': {
      if (inp.back() || inp.confirm()) game.screen = game.ui.helpFrom === 'pause' ? 'pause' : game.ui.helpFrom === 'title' ? 'title' : 'play';
      break;
    }
    case 'busted':
    case 'wasted': {
      if (inp.pressed('Enter')) respawn();
      break;
    }
    default:
      break;
  }
  input.endFrame();
}

// ---------------------------------------------------------------------------
// Paint: world, then HUD, then the screen's own face.
// ---------------------------------------------------------------------------
function paint() {
  renderer.draw(game);
  const c = ctx2d;
  if (game.screen === 'title') {
    drawTitle(c, game);
    return;
  }
  if (game.screen === 'play' || game.screen === 'pause' || game.screen === 'briefing'
    || game.screen === 'shop' || game.screen === 'saves' || game.screen === 'help') {
    drawHUD(c, game);
  }
  if (game.passedTimer > 0 && game.screen === 'play') drawPassed(c, game);
  switch (game.screen) {
    case 'map': drawMap(c, game); break;
    case 'pause': drawPause(c, game); break;
    case 'briefing': drawBriefing(c, game); break;
    case 'shop': drawShop(c, game); break;
    case 'saves': drawSaves(c, game); break;
    case 'help': drawHelp(c, game); break;
    case 'busted': drawEnd(c, game, 'busted'); break;
    case 'wasted': drawEnd(c, game, 'wasted'); break;
    default: break;
  }
}

// ---------------------------------------------------------------------------
// The live loop.
// ---------------------------------------------------------------------------
function runGame() {
  let acc = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min((now - last) / 1000, 0.25);
    last = now;
    frameInput();
    while (acc >= STEP) {
      step(STEP);
      acc -= STEP;
      if (game.screen === 'busted' || game.screen === 'wasted') { acc = 0; break; }
    }
    paint();
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Screenshot mode: stage, run the driver to its frozen frame, paint twice.
// The staging runs synchronously BEFORE the first paint, so the captured
// frame is the frozen one no matter when the capture lands.
// ---------------------------------------------------------------------------
function runShot(name) {
  const sys = { playerCtl, police, combat, missions, traffic, peds };
  const info = stageShot(name, game, sys);
  game.screen = info.screen === 'play' ? 'play' : info.screen;
  if (info.screen === 'passed') game.screen = 'play';
  let guard = 0;
  while (!game.freezeSim && game.shotDriver && guard < 480) {
    step(STEP);
    guard += 1;
  }
  if (info.screen === 'passed') game.passedTimer = 9999;
  paint();
  paint();
  window.__shotReady = true;
  if (statusEl) statusEl.textContent = 'Escena ' + name + ' lista.';
}

if (shotParam) runShot(shotParam);
else runGame();
