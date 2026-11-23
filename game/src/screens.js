// BAHÍA ROJA — the full-screen faces of the game: the title menu, the
// full-screen map, pause-and-stats, the mission briefing, the shop, the
// save slots, the help card, the MISSION PASSED banner and the two bad
// endings. Each is a pure painter over game state; main.js owns the keys.

import {
  VIEW_W, VIEW_H, COLORS, TILE, MAP_W, MAP_H, DISTRICTS, PEOPLE,
  repTitle, repNext,
} from './config.js';
import { T, LOCATIONS } from './world.js';
import { SHOP_CATALOGS } from './economy.js';
import { slotInfo } from './save.js';
import { roundRect, alpha } from './render.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function txt(ctx, s, x, y, size, color, align, bold) {
  ctx.font = (bold ? 'bold ' : '') + size + 'px ' + FONT;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function money(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function veil(ctx, a) {
  ctx.fillStyle = 'rgba(12,9,7,' + a + ')';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function panelBox(ctx, x, y, w, h) {
  ctx.fillStyle = alpha(COLORS.ink, 0.86);
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = alpha(COLORS.gold, 0.6);
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function menuList(ctx, items, idx, x, y, size, gap) {
  items.forEach((label, i) => {
    const active = i === idx;
    if (active) {
      ctx.fillStyle = alpha(COLORS.gold, 0.16);
      roundRect(ctx, x - 16, y + i * gap - size - 6, 340, size + 16, 7);
      ctx.fill();
      txt(ctx, '▸', x - 8, y + i * gap, size, COLORS.gold, 'left', true);
    }
    txt(ctx, label, x + 16, y + i * gap, size, active ? COLORS.paper : '#a89a7d', 'left', active);
  });
}

export const TITLE_ITEMS = ['NUEVA PARTIDA', 'CARGAR PARTIDA', 'AYUDA', 'SEGUIR JUGANDO'];

export function drawTitle(ctx, game) {
  // The world runs behind the title (main keeps the camera on the coast).
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, 'rgba(20,12,8,0.25)');
  grad.addColorStop(0.55, 'rgba(20,12,8,0.45)');
  grad.addColorStop(1, 'rgba(20,12,8,0.88)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  txt(ctx, 'CASA ROJA PRESENTA', VIEW_W / 2, 168, 17, '#ffd977', 'center', true);
  txt(ctx, 'BAHÍA ROJA', VIEW_W / 2, 268, 96, COLORS.paper, 'center', true);
  ctx.fillStyle = COLORS.casaRoja;
  ctx.fillRect(VIEW_W / 2 - 260, 292, 520, 5);
  txt(ctx, 'Quince trabajos. Una costa. Ningún testigo.', VIEW_W / 2, 336, 19, '#e8dcc2', 'center');
  txt(ctx, PEOPLE.hero + ' · ' + PEOPLE.police + ' · ' + PEOPLE.rival, VIEW_W / 2, 368, 13.5, '#b9ac93', 'center');
  const items = game.hasSave
    ? TITLE_ITEMS
    : ['NUEVA PARTIDA', 'AYUDA', 'SEGUIR JUGANDO'];
  menuList(ctx, items, Math.min(game.ui.titleIdx, items.length - 1), VIEW_W / 2 - 150, 470, 21, 44);
  txt(ctx, 'WASD conducir · ratón apuntar · E entrar/usar · F salir · M mapa · Esc pausa',
    VIEW_W / 2, VIEW_H - 54, 13.5, '#8a7f68', 'center');
  txt(ctx, 'Un juego de mundo abierto de Casa Roja — la Guardia Portuaria patrulla día y noche.',
    VIEW_W / 2, VIEW_H - 30, 12.5, '#6e6350', 'center');
}

// -- The full-screen map ---------------------------------------------------------
// District labels are placed at hand-tuned anchors and then de-collided:
// each label keeps a box, and any later label that would overlap an
// earlier one is nudged down until clear. Location names ride smaller,
// offset from their dots, so the face stays legible at a glance.
const DISTRICT_LABEL_AT = {
  acantilado: [0.16, 0.13], mirador: [0.82, 0.12], astillero: [0.13, 0.47],
  mercado: [0.45, 0.44], escarlata: [0.82, 0.47], puerto: [0.45, 0.86],
};

export function drawMap(ctx, game) {
  veil(ctx, 0.94);
  const mx = 46;
  const my = 66;
  const mw = 830;
  const mh = 620;
  txt(ctx, 'BAHÍA ROJA — MAPA DEL PUERTO', mx, 44, 24, COLORS.paper, 'left', true);
  txt(ctx, 'Pulsa un distrito en tu cabeza: el marcador dorado es el trabajo.', mx + 470, 44, 13, '#b9ac93');
  const sx = mw / (MAP_W * TILE);
  const sy = mh / (MAP_H * TILE);
  const world = game.world;
  for (let ty = 0; ty < MAP_H; ty += 1) {
    for (let tx = 0; tx < MAP_W; tx += 1) {
      const t = world.getTile(tx, ty);
      const d = world.districtAt((tx + 0.5) * TILE, (ty + 0.5) * TILE);
      ctx.fillStyle = t === T.WATER ? COLORS.seaDeep
        : t === T.ROAD ? '#4c4741'
          : t === T.SAND ? COLORS.sand
            : t === T.GRASS ? '#5a6b45'
              : t === T.CLIFF || t === T.ROCK ? COLORS.cliffDark
                : d.ground;
      ctx.fillRect(mx + tx * TILE * sx, my + ty * TILE * sy, TILE * sx + 0.7, TILE * sy + 0.7);
    }
  }
  ctx.strokeStyle = alpha(COLORS.gold, 0.7);
  ctx.lineWidth = 2;
  ctx.strokeRect(mx, my, mw, mh);
  const toMap = (wx, wy) => ({ x: mx + wx * sx, y: my + wy * sy });
  // District label positions are settled FIRST, among themselves, and
  // every other name on the face then de-collides against their boxes.
  const districtLabels = [];
  {
    const placedBoxes = [];
    for (const d of DISTRICTS) {
      const at = DISTRICT_LABEL_AT[d.id];
      let lx = mx + at[0] * mw;
      let ly = my + at[1] * mh;
      ctx.font = 'bold 17px ' + FONT;
      const w = ctx.measureText(d.name).width;
      let guard = 0;
      while (placedBoxes.some((b) => Math.abs(b.x - lx) < (b.w + w) / 2 && Math.abs(b.y - ly) < 24) && guard < 8) {
        ly += 22;
        guard += 1;
      }
      placedBoxes.push({ x: lx, y: ly, w });
      districtLabels.push({ name: d.name, lx, ly, w });
    }
  }
  const nameBoxes = districtLabels.map((b) => ({ x: b.lx - b.w / 2, y: b.ly, w: b.w }));
  // Shop name positions are settled next and registered, so the location
  // names below de-collide against shops as well as districts.
  const shopLabels = world.shops.map((s) => {
    const m = toMap(s.x, s.y);
    ctx.font = '10.5px ' + FONT;
    const wName = ctx.measureText(s.name).width;
    let ny = m.y + 3;
    let guard = 0;
    while (nameBoxes.some((b) => m.x + 8 < b.x + b.w && m.x + 8 + wName > b.x && Math.abs(ny - b.y) < 14) && guard < 5) {
      ny += 15;
      guard += 1;
    }
    nameBoxes.push({ x: m.x + 8, y: ny, w: wName });
    return { s, m, ny };
  });
  // Location dots and names: the short names ride beside their dots, and
  // any name that would collide with an earlier one drops below its dot.
  ctx.font = '11px ' + FONT;
  for (const key of Object.keys(LOCATIONS)) {
    const loc = LOCATIONS[key];
    const m = toMap(loc.x, loc.y);
    ctx.fillStyle = '#e8e4da';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
    ctx.fill();
    const short = loc.name.split(',')[0].split(' de ')[0].split(' del ')[0];
    const wName = ctx.measureText(short).width;
    let lx = m.x + 7;
    let ly = m.y + 3;
    let guard = 0;
    while (nameBoxes.some((b) => lx < b.x + b.w && lx + wName > b.x && Math.abs(ly - b.y) < 13) && guard < 6) {
      ly += 13;
      guard += 1;
    }
    nameBoxes.push({ x: lx, y: ly, w: wName });
    txt(ctx, short, lx, ly, 10.5, alpha('#e8dcc2', 0.92), 'left');
  }
  // District labels themselves, on their settled positions.
  for (const b of districtLabels) {
    ctx.fillStyle = alpha(COLORS.ink, 0.55);
    roundRect(ctx, b.lx - b.w / 2 - 8, b.ly - 19, b.w + 16, 27, 6);
    ctx.fill();
    txt(ctx, b.name, b.lx, b.ly, 17, COLORS.paper, 'center', true);
  }
  // Shops, houses, crates still unfound.
  for (const item of shopLabels) {
    const { s, m, ny } = item;
    ctx.fillStyle = s.color;
    ctx.fillRect(m.x - 4, m.y - 4, 8, 8);
    txt(ctx, s.name, m.x + 8, ny, 10.5, '#e8dcc2', 'left');
  }
  for (const sh of world.safehouses) {
    const m = toMap(sh.x, sh.y);
    ctx.fillStyle = COLORS.teal;
    ctx.fillRect(m.x - 4, m.y - 4, 8, 8);
  }
  const marker = game.missions.marker();
  if (marker) {
    const m = toMap(marker.x, marker.y);
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 8 + Math.sin(game.time * 5) * 2, 0, Math.PI * 2);
    ctx.fill();
    txt(ctx, marker.label, m.x + 13, m.y + 17, 12.5, '#ffd977', 'left', true);
  }
  if (game.waypoint) {
    const m = toMap(game.waypoint.x, game.waypoint.y);
    ctx.strokeStyle = COLORS.teal;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  const p = game.playerCtl.state;
  const pm = toMap(p.x, p.y);
  ctx.save();
  ctx.translate(pm.x, pm.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 7);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // The stats column rides the right edge: the run so far, in numbers.
  const x = mx + mw + 28;
  const w = VIEW_W - x - 40;
  panelBox(ctx, x, my, w, mh);
  let cy = my + 42;
  txt(ctx, 'LA CARRERA DE ADRIÁN', x + 20, cy, 16, COLORS.gold, 'left', true);
  cy += 34;
  const rows = [
    ['Trabajos hechos', game.stats.missionsDone + ' / 15'],
    ['Dinero', money(game.cash)],
    ['Reputación', game.rep + ' — ' + repTitle(game.rep)],
    ['Cajas de carga', game.stats.crates + ' / 24'],
    ['Sicarios caídos', String(game.stats.kills)],
    ['Coches tomados', String(game.stats.carsJacked)],
    ['Distritos pisados', Object.keys(game.stats.districts).length + ' / 6'],
  ];
  const next = repNext(game.rep);
  if (next) rows.push(['Siguiente título', next.name + ' (' + next.need + ')']);
  for (const row of rows) {
    txt(ctx, row[0], x + 20, cy, 13.5, '#b9ac93');
    txt(ctx, row[1], x + w - 20, cy, 13.5, COLORS.paper, 'right', true);
    cy += 27;
  }
  cy += 12;
  txt(ctx, 'LEYENDA', x + 20, cy, 14, COLORS.gold, 'left', true);
  cy += 26;
  const legend = [
    [COLORS.gold, 'Trabajo actual'],
    ['#e8e4da', 'Lugar con nombre'],
    [COLORS.teal, 'Casa segura / destino'],
    ['#8f2f26', 'Tiendas del puerto'],
  ];
  for (const item of legend) {
    ctx.fillStyle = item[0];
    ctx.fillRect(x + 20, cy - 10, 12, 12);
    txt(ctx, item[1], x + 42, cy, 12.5, '#e8dcc2');
    cy += 24;
  }
  txt(ctx, '[M] o [Esc] volver · clic: fijar destino', mx, my + mh + 34, 13.5, '#b9ac93');
}

// -- Pause: the same stats, over the frozen street --------------------------------
export function drawPause(ctx, game) {
  veil(ctx, 0.62);
  const w = 560;
  const x = VIEW_W / 2 - w / 2;
  const y = 150;
  panelBox(ctx, x, y, w, 470);
  txt(ctx, 'PAUSA', VIEW_W / 2, y + 58, 34, COLORS.paper, 'center', true);
  txt(ctx, PEOPLE.hero + ' · ' + repTitle(game.rep), VIEW_W / 2, y + 88, 14.5, '#ffd977', 'center');
  let cy = y + 140;
  const rows = [
    ['Trabajos', game.stats.missionsDone + ' / 15'],
    ['Dinero', money(game.cash)],
    ['Reputación', game.rep + ' REP'],
    ['Cajas de carga', game.stats.crates + ' / 24'],
    ['Sicarios caídos', String(game.stats.kills)],
    ['Coches tomados', String(game.stats.carsJacked)],
    ['Caídas / detenciones', game.stats.deaths + ' / ' + game.stats.busts],
    ['Tiempo en el puerto', Math.floor(game.stats.playSeconds / 60) + ' min'],
  ];
  for (const row of rows) {
    txt(ctx, row[0], x + 44, cy, 15, '#b9ac93');
    txt(ctx, row[1], x + w - 44, cy, 15, COLORS.paper, 'right', true);
    cy += 30;
  }
  menuList(ctx, ['SEGUIR', 'MAPA', 'GUARDAR / CARGAR', 'AYUDA', 'TÍTULO'],
    game.ui.pauseIdx, VIEW_W / 2 - 130, cy + 26, 17, 34);
}

// -- Briefing ----------------------------------------------------------------------
export function drawBriefing(ctx, game) {
  veil(ctx, 0.55);
  const m = game.missions.mission();
  if (!m) return;
  const w = 640;
  const x = VIEW_W / 2 - w / 2;
  const y = 250;
  panelBox(ctx, x, y, w, 300);
  txt(ctx, 'TRABAJO ' + (game.missions.index + 1) + ' DE 15', x + 34, y + 44, 13, COLORS.gold, 'left', true);
  txt(ctx, m.title, x + 34, y + 82, 30, COLORS.paper, 'left', true);
  txt(ctx, 'De parte de ' + m.giver, x + 34, y + 110, 14, '#b9ac93');
  m.brief.forEach((line, i) => {
    txt(ctx, line, x + 34, y + 148 + i * 24, 15.5, '#e8dcc2');
  });
  txt(ctx, 'Recompensa: ' + money(m.reward.cash) + ' · +' + m.reward.rep + ' REP', x + 34, y + 216, 14.5, '#8fd07a', 'left', true);
  txt(ctx, 'Etapas: ' + m.stages.map((s) => s.label).join(' → '), x + 34, y + 244, 12, '#9a8f78');
  txt(ctx, '[Enter] Aceptar el trabajo      [Esc] Ahora no', x + 34, y + 278, 14, COLORS.paper, 'left', true);
}

// -- Shop -----------------------------------------------------------------------------
export function drawShop(ctx, game) {
  veil(ctx, 0.6);
  const shop = game.openShop;
  if (!shop) return;
  const catalog = SHOP_CATALOGS[shop.kind];
  const w = 620;
  const x = VIEW_W / 2 - w / 2;
  const y = 190;
  const h = 150 + catalog.items.length * 40 + 60;
  panelBox(ctx, x, y, w, h);
  txt(ctx, catalog.title, x + 32, y + 48, 25, COLORS.paper, 'left', true);
  txt(ctx, shop.blurb, x + 32, y + 76, 13.5, '#b9ac93');
  txt(ctx, money(game.cash), x + w - 32, y + 48, 20, '#8fd07a', 'right', true);
  let cy = y + 122;
  catalog.items.forEach((item, i) => {
    const active = i === game.ui.shopIdx;
    const price = item.priceOf ? item.priceOf(game) : item.price;
    const check = item.can(game);
    if (active) {
      ctx.fillStyle = alpha(COLORS.gold, 0.15);
      roundRect(ctx, x + 16, cy - 24, w - 32, 36, 7);
      ctx.fill();
    }
    txt(ctx, item.name, x + 32, cy, 15.5, active ? COLORS.paper : '#cbbfa5', 'left', active);
    txt(ctx, item.desc, x + 300, cy, 12.5, '#9a8f78');
    txt(ctx, check !== true ? String(check) : money(price), x + w - 32, cy, 14,
      check !== true ? '#e88a7a' : '#ffd977', 'right', true);
    cy += 40;
  });
  if (game.ui.shopMsg) txt(ctx, game.ui.shopMsg, x + 32, cy + 8, 14, '#8fd07a');
  txt(ctx, '[Enter] Comprar · [Esc] Salir', x + 32, y + h - 22, 12.5, '#8a7f68');
}

// -- Saves ------------------------------------------------------------------------------
export function drawSaves(ctx, game) {
  veil(ctx, 0.66);
  const w = 540;
  const x = VIEW_W / 2 - w / 2;
  const y = 230;
  panelBox(ctx, x, y, w, 330);
  txt(ctx, game.ui.savesMode === 'load' ? 'CARGAR PARTIDA' : 'GUARDAR PARTIDA',
    VIEW_W / 2, y + 52, 24, COLORS.paper, 'center', true);
  let cy = y + 110;
  for (let i = 0; i < 3; i += 1) {
    const info = slotInfo(i);
    const active = i === game.ui.savesIdx;
    if (active) {
      ctx.fillStyle = alpha(COLORS.gold, 0.15);
      roundRect(ctx, x + 22, cy - 26, w - 44, 52, 8);
      ctx.fill();
    }
    txt(ctx, 'HUECO ' + (i + 1), x + 40, cy + 6, 16, active ? COLORS.paper : '#cbbfa5', 'left', true);
    txt(ctx, info
      ? 'Trabajo ' + info.mission + ' · ' + money(info.cash) + ' · ' + info.rep + ' REP · ' + info.when
      : 'Vacío', x + 170, cy + 6, 13.5, '#9a8f78');
    cy += 62;
  }
  txt(ctx, '[Enter] ' + (game.ui.savesMode === 'load' ? 'Cargar' : 'Guardar') + ' · [Esc] Volver',
    VIEW_W / 2, y + 292, 13, '#b9ac93', 'center');
}

// -- Help ----------------------------------------------------------------------------------
export function drawHelp(ctx, game) {
  veil(ctx, 0.78);
  const w = 660;
  const x = VIEW_W / 2 - w / 2;
  const y = 170;
  panelBox(ctx, x, y, w, 560);
  txt(ctx, 'CÓMO SE JUEGA', VIEW_W / 2, y + 54, 27, COLORS.paper, 'center', true);
  const lines = [
    ['WASD / flechas', 'Moverse y conducir'],
    ['Ratón', 'Apuntar (a pie)'],
    ['Clic / Espacio', 'Disparar (a pie) · freno de mano (en coche)'],
    ['E', 'Entrar en un coche, tienda, trabajo o casa'],
    ['F', 'Salir del coche'],
    ['1–4 / rueda', 'Cambiar de arma'],
    ['R', 'Recargar'],
    ['Q', 'Cambiar la radio (en coche)'],
    ['M', 'Mapa del puerto con estadísticas'],
    ['Esc / P', 'Pausa'],
    ['', ''],
    ['La estrella dorada marca el trabajo. La Guardia Portuaria', ''],
    ['despacha unidades con nombre: si te ven, IN SIGHT;', ''],
    ['si te pierden, SEARCHING. A las 4 estrellas llega', ''],
    ['CÓNDOR-1. Las cajas doradas esconden $150 cada una.', ''],
  ];
  let cy = y + 104;
  for (const row of lines) {
    if (row[0] && row[1]) {
      txt(ctx, row[0], x + 44, cy, 15, '#ffd977', 'left', true);
      txt(ctx, row[1], x + 220, cy, 15, '#e8dcc2');
    } else if (row[0]) {
      txt(ctx, row[0], x + 44, cy, 14.5, '#b9ac93');
    }
    cy += 27;
  }
  txt(ctx, '[Esc] Volver', VIEW_W / 2, y + 524, 14, COLORS.paper, 'center', true);
  void game;
}

// -- MISSION PASSED ----------------------------------------------------------------------------
export function drawPassed(ctx, game) {
  const info = game.passedInfo;
  if (!info) return;
  const fade = Math.min(1, game.passedTimer / 1.2, (5.2 - (5.2 - game.passedTimer)) / 0.3 + 0.4);
  ctx.globalAlpha = Math.max(0, Math.min(1, fade));
  ctx.fillStyle = alpha(COLORS.ink, 0.6);
  ctx.fillRect(0, 300, VIEW_W, 210);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, 300, VIEW_W, 4);
  ctx.fillRect(0, 506, VIEW_W, 4);
  txt(ctx, 'MISSION PASSED', VIEW_W / 2, 372, 46, COLORS.paper, 'center', true);
  txt(ctx, info.title, VIEW_W / 2, 408, 19, '#ffd977', 'center', true);
  const bonus = info.bonus ? '  (+' + money(info.bonus) + ' carga intacta)' : '';
  txt(ctx, '+' + money(info.cash) + bonus + '   ·   +' + info.rep + ' REP',
    VIEW_W / 2, 448, 20, '#8fd07a', 'center', true);
  if (info.rank) txt(ctx, info.rank, VIEW_W / 2, 480, 14.5, '#b9ac93', 'center');
  ctx.globalAlpha = 1;
}

// -- The bad endings ------------------------------------------------------------------------------
export function drawEnd(ctx, game, kind) {
  veil(ctx, 0.72);
  const title = kind === 'busted' ? 'DETENIDO' : 'CAÍDO';
  txt(ctx, title, VIEW_W / 2, 380, 64, kind === 'busted' ? '#7fa8e8' : '#e88a7a', 'center', true);
  txt(ctx, kind === 'busted'
    ? 'La Guardia Portuaria te saca del coche. La fianza duele.'
    : 'El puerto te recoge del asfalto. El hospital también cobra.',
  VIEW_W / 2, 428, 17, '#e8dcc2', 'center');
  txt(ctx, 'Pagas ' + money(game.lastFine || 0) + ' y vuelves a la calle, sin estrellas.',
    VIEW_W / 2, 460, 15, '#b9ac93', 'center');
  txt(ctx, '[Enter] Volver a la calle', VIEW_W / 2, 520, 16, COLORS.paper, 'center', true);
}
