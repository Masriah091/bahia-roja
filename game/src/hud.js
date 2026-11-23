// BAHÍA ROJA — the HUD: everything printed over the world while playing.
// Minimap with the district name beneath it, the wallet, the mission
// panel (JOB n/15, the stage bar, NEXT), the Guardia dispatch panel with
// its named units and rolling chatter, vitals, the weapon strip, the
// vehicle panel, the feed, banners and prompts. Panels share one visual
// language: dark glass, a gold rule, paper text.

import { VIEW_W, VIEW_H, COLORS, TILE, MAP_W, MAP_H, repTitle, repNext, RADIO } from './config.js';
import { T } from './world.js';
import { WEAPONS } from './combat.js';
import { roundRect, alpha } from './render.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function txt(ctx, s, x, y, size, color, align, bold) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = alpha(COLORS.ink, 0.72);
  roundRect(ctx, x, y, w, h, 9);
  ctx.fill();
  ctx.strokeStyle = alpha(COLORS.gold, 0.5);
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// -- Minimap -----------------------------------------------------------------
const MM = { x: 18, y: 18, w: 218, h: 163 };

function drawMinimap(ctx, game) {
  const world = game.world;
  panel(ctx, MM.x - 5, MM.y - 5, MM.w + 10, MM.h + 34);
  const sx = MM.w / (MAP_W * TILE);
  const sy = MM.h / (MAP_H * TILE);
  // Land and water first, at tile resolution.
  for (let ty = 0; ty < MAP_H; ty += 2) {
    for (let tx = 0; tx < MAP_W; tx += 2) {
      const t = world.getTile(tx, ty);
      ctx.fillStyle = t === T.WATER ? COLORS.seaDeep
        : t === T.ROAD ? '#57524c'
          : t === T.SAND ? COLORS.sand
            : '#6d5b40';
      ctx.fillRect(MM.x + tx * TILE * sx, MM.y + ty * TILE * sy, TILE * sx * 2 + 1, TILE * sy * 2 + 1);
    }
  }
  const toMap = (wx, wy) => ({ x: MM.x + wx * sx, y: MM.y + wy * sy });
  // Shops, safehouses, the mission marker, the waypoint.
  for (const s of world.shops) {
    const m = toMap(s.x, s.y);
    ctx.fillStyle = s.color;
    ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
  }
  for (const sh of world.safehouses) {
    const m = toMap(sh.x, sh.y);
    ctx.fillStyle = COLORS.teal;
    ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
  }
  const marker = game.missions.marker();
  if (marker) {
    const m = toMap(marker.x, marker.y);
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4.6 + Math.sin(game.time * 5) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (game.waypoint) {
    const m = toMap(game.waypoint.x, game.waypoint.y);
    ctx.fillStyle = COLORS.teal;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Guardia blips while the hunt is on.
  if (game.police.stars() > 0) {
    ctx.fillStyle = '#7fa8e8';
    for (const u of game.police.units) {
      const m = toMap(u.car.x, u.car.y);
      ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
    }
    if (game.police.heli) {
      const m = toMap(game.police.heli.x, game.police.heli.y);
      ctx.fillRect(m.x - 2.6, m.y - 2.6, 5.2, 5.2);
    }
  }
  // Sicarios in an active shootout.
  ctx.fillStyle = '#e8452c';
  for (const e of game.combat.enemies) {
    if (e.dead) continue;
    const m = toMap(e.x, e.y);
    ctx.fillRect(m.x - 1.8, m.y - 1.8, 3.6, 3.6);
  }
  // Adrián: a white wedge pointing his way.
  const p = game.playerCtl.state;
  const pm = toMap(p.x, p.y);
  ctx.save();
  ctx.translate(pm.x, pm.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6.4);
  ctx.lineTo(4.4, 5);
  ctx.lineTo(-4.4, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The district name sits under the minimap, always current.
  const d = world.districtAt(p.x, p.y);
  txt(ctx, d.name, MM.x + 1, MM.y + MM.h + 24, 14.5, COLORS.paper, 'left', true);
}

// -- Wallet ---------------------------------------------------------------------
function drawWallet(ctx, game) {
  const w = 218;
  panel(ctx, VIEW_W - w - 18, 18, w, 80);
  txt(ctx, money(game.cash), VIEW_W - 32, 47, 25, '#8fd07a', 'right', true);
  const next = repNext(game.rep);
  txt(ctx, 'REP ' + game.rep + ' · ' + repTitle(game.rep), VIEW_W - 32, 70, 12.5, COLORS.gold, 'right', true);
  // The climb to the next title, as a thin gold bar under the wallet.
  if (next) {
    const prevNeed = game.rep >= 540 ? 540 : game.rep >= 320 ? 320 : game.rep >= 160 ? 160 : game.rep >= 60 ? 60 : 0;
    const frac = (game.rep - prevNeed) / Math.max(1, next.need - prevNeed);
    ctx.fillStyle = alpha(COLORS.paper, 0.18);
    roundRect(ctx, VIEW_W - w - 4, 80, w - 28, 6, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    roundRect(ctx, VIEW_W - w - 4, 80, (w - 28) * Math.min(1, frac), 6, 3);
    ctx.fill();
    txt(ctx, next.name + ' · ' + next.need, VIEW_W - 32, 80 - 14 + 27, 9.5, '#9a8f78', 'right');
  }
  // Wanted stars ride the wallet's top edge.
  const stars = game.police.stars();
  for (let i = 0; i < 5; i += 1) {
    const x = VIEW_W - 32 - (4 - i) * 23;
    txt(ctx, '★', x, 47 - 34, 19, i < stars ? COLORS.gold : alpha(COLORS.paper, 0.25), 'center', true);
  }
}

// -- Mission panel ------------------------------------------------------------------
function drawMissionPanel(ctx, game) {
  const m = game.missions;
  const w = 300;
  const x = VIEW_W - w - 18;
  const y = 106;
  panel(ctx, x, y, w, 96);
  if (m.state === 'alldone') {
    txt(ctx, 'REY DE BAHÍA ROJA', x + 14, y + 26, 16, COLORS.gold, 'left', true);
    txt(ctx, 'La costa es tuya. El puerto sigue abierto:', x + 14, y + 48, 12.5, COLORS.paper);
    txt(ctx, 'cajas, tiendas y la Guardia, como siempre.', x + 14, y + 66, 12.5, COLORS.paper);
    return;
  }
  const cur = m.mission();
  if (!cur) return;
  if (m.state === 'offer') {
    txt(ctx, 'TRABAJO DISPONIBLE', x + 14, y + 25, 13, COLORS.gold, 'left', true);
    txt(ctx, cur.title, x + 14, y + 48, 16.5, COLORS.paper, 'left', true);
    txt(ctx, cur.giver + ' · ' + money(cur.reward.cash) + ' · +' + cur.reward.rep + ' REP', x + 14, y + 70, 12.5, '#cbbfa5');
    return;
  }
  if (m.state !== 'active') return;
  const st = m.stage();
  txt(ctx, 'JOB ' + (m.index + 1) + '/15 — ' + cur.title, x + 14, y + 24, 13.5, COLORS.gold, 'left', true);
  txt(ctx, st ? st.label : '', x + 14, y + 45, 13.5, COLORS.paper, 'left');
  // The stage bar: how much of this stage is done.
  ctx.fillStyle = alpha(COLORS.paper, 0.18);
  roundRect(ctx, x + 14, y + 55, w - 28, 8, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  roundRect(ctx, x + 14, y + 55, (w - 28) * Math.min(1, m.stageProgress()), 8, 4);
  ctx.fill();
  let next = '';
  if (st && st.kind === 'race') next = 'Tiempo: ' + Math.max(0, Math.ceil(m.raceTime)) + 's · punto ' + (m.racePoint + 1) + '/' + st.points.length;
  else if (st && st.kind === 'shootout') next = 'Sicarios en pie: ' + m.aliveEnemies;
  else if (st && st.kind === 'load') next = 'Cargando… ' + Math.floor((m.loadProgress / (st.seconds || 4)) * 100) + '%';
  else if (st && st.kind === 'escape') next = 'Pierde a la Guardia: que baje la estrella';
  else if (m.message) next = m.message;
  else next = 'Sigue el marcador dorado';
  txt(ctx, 'NEXT: ' + next, x + 14, y + 84, 12, '#cbbfa5', 'left');
}

// -- Dispatch panel ---------------------------------------------------------------------
function drawDispatch(ctx, game) {
  const police = game.police;
  if (police.stars() === 0 && police.units.length === 0) return;
  const w = 300;
  const x = VIEW_W - w - 18;
  const y = 214;
  const rows = Math.max(1, police.units.length + (police.heli ? 1 : 0));
  const h = 34 + rows * 19 + (police.log.length ? 8 + police.log.length * 16 : 0) + 10;
  panel(ctx, x, y, w, h);
  txt(ctx, 'GUARDIA PORTUARIA — DESPACHO', x + 14, y + 22, 12.5, '#7fa8e8', 'left', true);
  let cy = y + 42;
  const line = (callsign, role, distM, state) => {
    txt(ctx, callsign, x + 14, cy, 12, COLORS.paper, 'left', true);
    txt(ctx, role, x + 96, cy, 11, '#cbbfa5');
    txt(ctx, distM + 'm', x + 196, cy, 11.5, COLORS.paper);
    txt(ctx, state, x + w - 14, cy, 11, state === 'IN SIGHT' ? '#e88a7a' : '#9fc6a8', 'right', true);
    cy += 19;
  };
  for (const u of police.units) {
    line(u.callsign, u.role, u.distToPlayer * 10, u.state);
  }
  if (police.heli) {
    const p = game.playerCtl.state;
    const d = Math.max(1, Math.round(Math.hypot(police.heli.x - p.x, police.heli.y - p.y) / 10) * 10);
    line('CÓNDOR-1', 'HELI', d, police.heli.sees ? 'IN SIGHT' : 'SEARCHING');
  }
  if (police.log.length) {
    cy += 6;
    ctx.strokeStyle = alpha(COLORS.paper, 0.2);
    ctx.beginPath();
    ctx.moveTo(x + 14, cy - 10);
    ctx.lineTo(x + w - 14, cy - 10);
    ctx.stroke();
    for (const entry of police.log) {
      txt(ctx, entry.callsign + ': ' + entry.text, x + 14, cy + 6, 11, '#b9ac93');
      cy += 16;
    }
  }
}

// -- Vitals, weapons, vehicle ---------------------------------------------------------------
function bar(ctx, x, y, w, frac, color) {
  ctx.fillStyle = alpha(COLORS.ink, 0.66);
  roundRect(ctx, x, y, w, 11, 5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x + 1.5, y + 1.5, (w - 3) * Math.max(0, Math.min(1, frac)), 8, 4);
  ctx.fill();
}

function drawVitals(ctx, game) {
  const p = game.playerCtl.state;
  const x = 18;
  const y = VIEW_H - 64;
  panel(ctx, x, y, 218, 46);
  txt(ctx, 'SALUD', x + 12, y + 19, 10.5, '#cbbfa5', 'left', true);
  bar(ctx, x + 62, y + 9, 140, p.hp / 100, p.hp > 30 ? '#7fc46a' : '#e8452c');
  txt(ctx, 'CHALECO', x + 12, y + 38, 10.5, '#cbbfa5', 'left', true);
  bar(ctx, x + 62, y + 28, 140, p.armor / 100, '#7fa8e8');
  if (game.police.bustTimer > 0) {
    txt(ctx, '¡DETENIDO EN ' + Math.max(0, 2.4 - game.police.bustTimer).toFixed(1) + '!', x + 12, y - 12, 14, '#e88a7a', 'left', true);
  }
}

function drawWeapons(ctx, game) {
  const p = game.playerCtl.state;
  if (p.car) return;
  const slotW = 86;
  const total = p.weapons.length * slotW + (p.weapons.length - 1) * 6;
  let x = VIEW_W / 2 - total / 2;
  const y = VIEW_H - 62;
  p.weapons.forEach((slot, i) => {
    const def = WEAPONS[slot.id];
    const active = i === p.weaponIdx;
    ctx.fillStyle = alpha(COLORS.ink, active ? 0.82 : 0.55);
    roundRect(ctx, x, y, slotW, 44, 7);
    ctx.fill();
    if (active) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    txt(ctx, def.name.split(' ')[0], x + slotW / 2, y + 18, 11, active ? COLORS.paper : '#9a8f78', 'center', true);
    const ammo = p.reloadT > 0 && active ? '···' : slot.mag + ' / ' + slot.reserve;
    txt(ctx, ammo, x + slotW / 2, y + 36, 12.5, active ? '#ffd977' : '#9a8f78', 'center', true);
    x += slotW + 6;
  });
}

function drawVehiclePanel(ctx, game) {
  const p = game.playerCtl.state;
  if (!p.car) return;
  const car = p.car;
  const w = 252;
  const x = VIEW_W - w - 18;
  const y = VIEW_H - 108;
  panel(ctx, x, y, w, 90);
  txt(ctx, car.type.name, x + 14, y + 24, 15, COLORS.paper, 'left', true);
  txt(ctx, Math.round(Math.abs(car.speed) * 0.36) + ' km/h', x + w - 14, y + 24, 15, '#ffd977', 'right', true);
  txt(ctx, 'ESTADO', x + 14, y + 46, 10.5, '#cbbfa5', 'left', true);
  bar(ctx, x + 70, y + 36, w - 84, car.hp / 100, car.hp > 30 ? '#7fc46a' : '#e8452c');
  const radio = RADIO[p.radioIdx % RADIO.length];
  txt(ctx, '♪ ' + radio.freq + ' ' + radio.name + ' — ' + radio.genre, x + 14, y + 68, 11.5, '#9fc6a8');
  txt(ctx, '[F] salir · [Q] radio · [Espacio] freno de mano', x + 14, y + 84, 10.5, '#8a7f68');
}

// -- Feed, banner, prompt ---------------------------------------------------------------------------
function drawFeed(ctx, game) {
  let y = VIEW_H - 128;
  for (let i = game.feedList.length - 1; i >= 0; i -= 1) {
    const f = game.feedList[i];
    const fade = f.t > 4.4 ? Math.max(0, 1 - (f.t - 4.4)) : 1;
    ctx.globalAlpha = fade;
    txt(ctx, f.text, 20, y, 14.5, '#ffe9a8', 'left');
    y -= 21;
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const fadeIn = Math.min(1, b.t / 0.25);
  const fadeOut = Math.min(1, (b.dur - b.t) / 0.4);
  ctx.globalAlpha = Math.min(fadeIn, fadeOut);
  ctx.fillStyle = alpha(COLORS.ink, 0.66);
  ctx.fillRect(0, 118, VIEW_W, 92);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, 118, VIEW_W, 3);
  ctx.fillRect(0, 207, VIEW_W, 3);
  txt(ctx, b.title, VIEW_W / 2, 168, 37, COLORS.paper, 'center', true);
  if (b.sub) txt(ctx, b.sub, VIEW_W / 2, 196, 16, '#ffd977', 'center');
  ctx.globalAlpha = 1;
}

function drawPrompt(ctx, game) {
  if (!game.prompt) return;
  const label = '[E] ' + game.prompt;
  ctx.font = 'bold 15px ' + FONT;
  const w = ctx.measureText(label).width + 34;
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H - 122;
  ctx.fillStyle = alpha(COLORS.ink, 0.78);
  roundRect(ctx, x, y, w, 34, 8);
  ctx.fill();
  txt(ctx, label, VIEW_W / 2, y + 23, 15, COLORS.paper, 'center', true);
}

/** The whole HUD, in paint order. */
export function drawHUD(ctx, game) {
  drawMinimap(ctx, game);
  drawWallet(ctx, game);
  drawMissionPanel(ctx, game);
  drawDispatch(ctx, game);
  drawVitals(ctx, game);
  drawWeapons(ctx, game);
  drawVehiclePanel(ctx, game);
  drawFeed(ctx, game);
  drawPrompt(ctx, game);
  drawBanner(ctx, game);
  // Clock, small, bottom-centre: the hour shapes the light, so show it.
  const hh = Math.floor(game.hour);
  const mm = Math.floor((game.hour - hh) * 60);
  txt(ctx, String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'),
    VIEW_W / 2, VIEW_H - 8, 13, '#cbbfa5', 'center', true);
}
