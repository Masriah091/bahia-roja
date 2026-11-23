// BAHÍA ROJA — the painter. Everything the camera sees is drawn here and
// nowhere else: tiles, water, roads, the extruded buildings, container
// stacks, props, boats, cars, people, CÓNDOR-1, effects, markers, and the
// light of the hour over all of it. The canvas backing store is fixed at
// 1280×960 — the composed frame — and CSS stretches it to the window, so
// a screenshot is exactly the frame the game composes, every time.

import {
  TILE, MAP_W, VIEW_W, VIEW_H, DISTRICTS, COLORS, districtAt,
} from './config.js';
import { T } from './world.js';
import { clamp } from './rng.js';

/** Rounded-rectangle path; the caller fills or strokes it. */
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/** Multiply a #rrggbb colour by f (f<1 darker, f>1 lighter, clamped). */
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255);
  const g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255);
  const b = clamp(Math.round((n & 255) * f), 0, 255);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

/** Alpha version of a #rrggbb colour. */
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

/** Darkness 0..1 of the hour: the port is lit at noon, drowned at 3am. */
export function nightFactor(hour) {
  if (hour >= 7 && hour <= 17) return 0;
  if (hour >= 19.5 || hour <= 5) return 1;
  if (hour > 17) return (hour - 17) / 2.5;
  return (7 - hour) / 2;
}

/** Warmth of the light: golden hour burns around 18:00–19:30. */
export function goldFactor(hour) {
  if (hour >= 17.4 && hour <= 19.6) return 1 - Math.abs(hour - 18.5) / 1.1;
  return 0;
}

export function createRenderer(canvas) {
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d');

  // -- Tiles ---------------------------------------------------------------
  function drawTiles(game, view) {
    const world = game.world;
    const tx0 = Math.max(0, Math.floor(view.x0 / TILE));
    const ty0 = Math.max(0, Math.floor(view.y0 / TILE));
    const tx1 = Math.min(MAP_W - 1, Math.ceil(view.x1 / TILE));
    const ty1 = Math.min(world.tiles.length / MAP_W - 1, Math.ceil(view.y1 / TILE));
    for (let ty = ty0; ty <= ty1; ty += 1) {
      for (let tx = tx0; tx <= tx1; tx += 1) {
        const t = world.getTile(tx, ty);
        const x = tx * TILE;
        const y = ty * TILE;
        const d = districtAt(x + 1, y + 1);
        const checker = ((tx + ty) % 2 === 0);
        switch (t) {
          case T.WATER: {
            ctx.fillStyle = checker ? COLORS.sea : COLORS.seaDeep;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            // A slow foam fleck, phased by tile and sim time: the harbour moves.
            const ph = Math.sin(game.time * 0.9 + (tx * 7 + ty * 13) % 6.28);
            if (ph > 0.72) {
              ctx.fillStyle = alpha(COLORS.seaFoam, 0.35);
              ctx.fillRect(x + 8 + ph * 6, y + TILE * 0.5, 16, 2.5);
            }
            break;
          }
          case T.SAND:
            ctx.fillStyle = checker ? COLORS.sand : COLORS.sandWet;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            break;
          case T.ROAD:
            ctx.fillStyle = COLORS.road;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            break;
          case T.WALK:
            ctx.fillStyle = COLORS.sidewalk;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = alpha(COLORS.ink, 0.08);
            ctx.fillRect(x, y, TILE + 1, 3);
            break;
          case T.CLIFF:
            ctx.fillStyle = checker ? COLORS.cliff : COLORS.cliffDark;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            break;
          case T.ROCK:
            ctx.fillStyle = '#5d4a3e';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = '#6e584a';
            ctx.fillRect(x + 8, y + 10, 14, 9);
            ctx.fillRect(x + 26, y + 26, 11, 8);
            break;
          case T.GRASS:
            ctx.fillStyle = checker ? COLORS.grass : shade(COLORS.grass, 0.92);
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            break;
          case T.DOCK:
            ctx.fillStyle = '#8a764f';
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = alpha(COLORS.ink, 0.16);
            for (let p = 0; p < TILE; p += 11) ctx.fillRect(x + p, y, 2, TILE);
            break;
          case T.YARD:
            ctx.fillStyle = checker ? d.ground : d.groundAlt;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            ctx.fillStyle = alpha(COLORS.paper, 0.14);
            ctx.fillRect(x, y + TILE - 4, TILE, 2);
            break;
          case T.PLAZA:
            ctx.fillStyle = checker ? COLORS.plaza : shade(COLORS.plaza, 0.93);
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
            break;
          default:
            ctx.fillStyle = checker ? d.ground : d.groundAlt;
            ctx.fillRect(x, y, TILE + 1, TILE + 1);
        }
      }
    }
    drawRoadLines(game, view);
  }

  // Centre dashes on roads: drawn as a second pass so they sit on top of
  // every ground colour a road crosses.
  function drawRoadLines(game, view) {
    const world = game.world;
    ctx.fillStyle = alpha(COLORS.roadLine, 0.55);
    const tx0 = Math.max(0, Math.floor(view.x0 / TILE));
    const ty0 = Math.max(0, Math.floor(view.y0 / TILE));
    const tx1 = Math.min(MAP_W - 1, Math.ceil(view.x1 / TILE));
    const ty1 = Math.min(111, Math.ceil(view.y1 / TILE));
    for (let ty = ty0; ty <= ty1; ty += 1) {
      for (let tx = tx0; tx <= tx1; tx += 1) {
        if (world.getTile(tx, ty) !== T.ROAD) continue;
        const right = world.getTile(tx + 1, ty) === T.ROAD;
        const down = world.getTile(tx, ty + 1) === T.ROAD;
        const x = tx * TILE;
        const y = ty * TILE;
        if (right && (tx % 2 === 0)) ctx.fillRect(x + TILE - 7, y + TILE / 2 - 1.5, 14, 3);
        if (down && (ty % 2 === 0)) ctx.fillRect(x + TILE / 2 - 1.5, y + TILE - 7, 3, 14);
      }
    }
  }

  // -- Boats -----------------------------------------------------------------
  function drawBoat(b, game) {
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(game.time * 0.8 + b.bob) * 2.5);
    ctx.rotate(b.angle);
    const len = b.len;
    const wid = len * 0.3;
    ctx.fillStyle = alpha(COLORS.ink, 0.25);
    ctx.fillRect(-len / 2 + 5, -wid / 2 + 7, len, wid);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(-len / 2, -wid / 2);
    ctx.lineTo(len / 2 - len * 0.16, -wid / 2);
    ctx.lineTo(len / 2, 0);
    ctx.lineTo(len / 2 - len * 0.16, wid / 2);
    ctx.lineTo(-len / 2, wid / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(b.color, 0.75);
    ctx.fillRect(-len * 0.32, -wid * 0.26, len * 0.34, wid * 0.52);
    if (b.kind === 'cargo') {
      ctx.fillStyle = '#7a4f35';
      ctx.fillRect(-len * 0.05, -wid * 0.3, len * 0.3, wid * 0.6);
      ctx.fillStyle = '#4f7a3a';
      ctx.fillRect(len * 0.28, -wid * 0.3, len * 0.18, wid * 0.6);
    }
    if (b.kind === 'fishing') {
      ctx.strokeStyle = '#e8e4da';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -wid * 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // -- Props -------------------------------------------------------------------
  function drawProp(p, game) {
    switch (p.kind) {
      case 'palm': {
        ctx.fillStyle = alpha(COLORS.ink, 0.2);
        ctx.beginPath();
        ctx.ellipse(p.x + 8, p.y + 6, 15, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7a5c38';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 4, p.y - 16);
        ctx.stroke();
        ctx.strokeStyle = '#4f7a3a';
        ctx.lineWidth = 3.4;
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2 + p.seed % 3;
          ctx.beginPath();
          ctx.moveTo(p.x + 4, p.y - 16);
          ctx.quadraticCurveTo(
            p.x + 4 + Math.sin(a) * 17, p.y - 24,
            p.x + 4 + Math.sin(a) * 26, p.y - 13 + Math.abs(Math.cos(a)) * 7,
          );
          ctx.stroke();
        }
        break;
      }
      case 'tree': {
        ctx.fillStyle = alpha(COLORS.ink, 0.2);
        ctx.beginPath();
        ctx.ellipse(p.x + 6, p.y + 5, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6e4a2f';
        ctx.fillRect(p.x - 3, p.y - 6, 6, 12);
        ctx.fillStyle = '#476b35';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 12, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#557d40';
        ctx.beginPath();
        ctx.arc(p.x - 6, p.y - 18, 11, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'lamp': {
        const night = nightFactor(game.hour) > 0.25;
        ctx.fillStyle = '#3d3a38';
        ctx.fillRect(p.x - 2, p.y - 15, 4, 17);
        if (night) {
          ctx.fillStyle = alpha(COLORS.gold, 0.16);
          ctx.beginPath();
          ctx.arc(p.x, p.y - 17, 26, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = night ? '#ffd977' : '#d8d2c2';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 17, 4.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'umbrella': {
        ctx.fillStyle = alpha(COLORS.ink, 0.2);
        ctx.beginPath();
        ctx.ellipse(p.x + 5, p.y + 4, 13, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e8e4da';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 4);
        ctx.lineTo(p.x - 2, p.y - 12);
        ctx.stroke();
        ctx.fillStyle = p.color || '#c74f35';
        ctx.beginPath();
        ctx.moveTo(p.x - 17, p.y - 10);
        ctx.quadraticCurveTo(p.x - 2, p.y - 22, p.x + 13, p.y - 10);
        ctx.quadraticCurveTo(p.x - 2, p.y - 14, p.x - 17, p.y - 10);
        ctx.fill();
        break;
      }
      case 'net': {
        ctx.strokeStyle = alpha('#d8cbae', 0.8);
        ctx.lineWidth = 1.6;
        for (let i = -3; i <= 3; i += 1) {
          ctx.beginPath();
          ctx.moveTo(p.x + i * 6, p.y - 12);
          ctx.lineTo(p.x + i * 6 + 3, p.y + 12);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x - 20, p.y + i * 3.4);
          ctx.lineTo(p.x + 20, p.y + i * 3.4 + 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#7a5c38';
        ctx.fillRect(p.x - 22, p.y - 14, 4, 28);
        ctx.fillRect(p.x + 18, p.y - 14, 4, 28);
        break;
      }
      case 'barrel': {
        ctx.fillStyle = '#7a4f35';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = alpha(COLORS.ink, 0.4);
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
      case 'crateProp': {
        ctx.fillStyle = '#9a7c4f';
        ctx.fillRect(p.x - 11, p.y - 11, 22, 22);
        ctx.strokeStyle = alpha(COLORS.ink, 0.35);
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - 11, p.y - 11, 22, 22);
        ctx.beginPath();
        ctx.moveTo(p.x - 11, p.y - 11);
        ctx.lineTo(p.x + 11, p.y + 11);
        ctx.moveTo(p.x + 11, p.y - 11);
        ctx.lineTo(p.x - 11, p.y + 11);
        ctx.stroke();
        break;
      }
      case 'stall': {
        ctx.fillStyle = alpha(COLORS.ink, 0.22);
        ctx.fillRect(p.x - 28, p.y - 14, 62, 42);
        ctx.fillStyle = '#8a6a44';
        ctx.fillRect(p.x - 30, p.y - 18, 60, 38);
        ctx.fillStyle = p.color || '#c74f35';
        for (let s = 0; s < 4; s += 1) {
          ctx.fillStyle = s % 2 ? '#e3e0d2' : (p.color || '#c74f35');
          ctx.fillRect(p.x - 34 + s * 17, p.y - 30, 17, 13);
        }
        ctx.fillStyle = '#e8b23a';
        ctx.fillRect(p.x - 22, p.y - 8, 12, 8);
        ctx.fillStyle = '#c74f35';
        ctx.fillRect(p.x - 4, p.y - 8, 12, 8);
        ctx.fillStyle = '#4f8f7b';
        ctx.fillRect(p.x + 13, p.y - 8, 12, 8);
        break;
      }
      case 'crane': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = alpha(COLORS.ink, 0.25);
        ctx.fillRect(-24, -18, 56, 44);
        ctx.fillStyle = '#c78a2e';
        ctx.fillRect(-26, -26, 52, 52);
        ctx.fillStyle = '#8a5f1e';
        ctx.fillRect(-18, -18, 36, 36);
        ctx.rotate(p.angle || 0);
        ctx.fillStyle = '#e0a83a';
        ctx.fillRect(-6, -150, 12, 150);
        ctx.fillRect(-70, -150, 140, 10);
        ctx.strokeStyle = alpha(COLORS.ink, 0.6);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(52, -146);
        ctx.lineTo(52, -88);
        ctx.stroke();
        ctx.fillStyle = '#5a6b7a';
        ctx.fillRect(40, -88, 24, 18);
        ctx.restore();
        break;
      }
      case 'lighthouse': {
        ctx.fillStyle = alpha(COLORS.ink, 0.25);
        ctx.beginPath();
        ctx.ellipse(p.x + 7, p.y + 6, 26, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8e4da';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.casaRoja;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, Math.PI * 0.15, Math.PI * 0.5);
        ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, Math.PI * 1.15, Math.PI * 1.5);
        ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd977';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'tower': {
        ctx.strokeStyle = '#4c4a45';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p.x - 16, p.y + 18);
        ctx.lineTo(p.x, p.y - 34);
        ctx.lineTo(p.x + 16, p.y + 18);
        ctx.moveTo(p.x - 10, p.y - 4);
        ctx.lineTo(p.x + 10, p.y - 4);
        ctx.stroke();
        ctx.fillStyle = COLORS.blood;
        ctx.beginPath();
        ctx.arc(p.x, p.y - 38, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'hull': {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle || 0);
        ctx.fillStyle = '#6b4a35';
        ctx.fillRect(-p.len / 2, -22, p.len, 44);
        ctx.fillStyle = '#8a5f43';
        for (let rib = -p.len / 2 + 14; rib < p.len / 2; rib += 26) {
          ctx.fillRect(rib, -22, 5, 44);
        }
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }

  // -- Containers and buildings ------------------------------------------------
  function drawContainer(c) {
    ctx.save();
    ctx.translate(c.x, c.y - c.level * 26);
    ctx.rotate(c.angle);
    if (c.level === 0) {
      ctx.fillStyle = alpha(COLORS.ink, 0.28);
      ctx.fillRect(-c.w / 2 + 6, -c.h / 2 + 9, c.w, c.h);
    }
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.fillStyle = alpha(COLORS.ink, 0.18);
    for (let rib = -c.w / 2 + 9; rib < c.w / 2 - 4; rib += 13) {
      ctx.fillRect(rib, -c.h / 2 + 3, 4, c.h - 6);
    }
    ctx.strokeStyle = alpha(COLORS.ink, 0.4);
    ctx.lineWidth = 2;
    ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.fillStyle = alpha('#ffffff', 0.75);
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ROJA-' + (1000 + (c.seed % 9000)), 0, 0);
    ctx.restore();
  }

  function drawBuilding(b, game) {
    const lift = b.height;
    // The golden-hour shadow falls long to the south-east.
    ctx.fillStyle = alpha(COLORS.ink, 0.26);
    ctx.fillRect(b.x + lift * 0.55, b.y + lift * 0.4, b.w, b.h);
    // Walls first (the extruded south and east faces), then the roof.
    ctx.fillStyle = shade(b.wall, 0.82);
    ctx.fillRect(b.x - lift * 0.22, b.y - lift * 0.22 + lift * 0.22, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(b.x - lift * 0.22, b.y - lift * 0.22, b.w, b.h + lift * 0.22);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x - lift * 0.22, b.y - lift * 0.22, b.w, b.h);
    ctx.fillStyle = alpha(COLORS.ink, 0.1);
    ctx.fillRect(b.x - lift * 0.22, b.y - lift * 0.22, b.w, 5);
    // Windows: a seeded grid, some lit when the evening comes in.
    const night = nightFactor(game.hour);
    const cols = Math.max(2, Math.floor(b.w / 26));
    const rows = Math.max(2, Math.floor(b.h / 26));
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        const s = Math.sin((b.seed + cx * 31 + cy * 57) * 12.9898) * 43758.5453;
        const frac = s - Math.floor(s);
        const lit = night > 0.3 && frac > 0.55;
        ctx.fillStyle = lit ? alpha('#ffd977', 0.9) : alpha(COLORS.ink, 0.22);
        ctx.fillRect(b.x - lift * 0.22 + 8 + cx * 24, b.y - lift * 0.22 + 8 + cy * 24, 11, 13);
      }
    }
    if (b.kind === 'warehouse') {
      ctx.fillStyle = alpha(COLORS.paper, 0.9);
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CASA ROJA', b.x + b.w / 2 - lift * 0.22, b.y + b.h / 2 - lift * 0.22);
    }
    if (b.kind === 'marketHall') {
      ctx.fillStyle = alpha(COLORS.ink, 0.75);
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LA LONJA · MERCADO', b.x + b.w / 2 - lift * 0.22, b.y + b.h / 2 - lift * 0.22);
    }
  }

  // -- Cars -----------------------------------------------------------------------
  function drawCar(car, game) {
    const t = car.type;
    ctx.save();
    ctx.translate(car.x, car.y);
    // Ground shadow, offset with the low sun. The sprite's nose is +X and
    // the heading convention points (sin a, -cos a), so the sprite turns
    // by a - PI/2 to lie along its heading.
    ctx.rotate(car.angle - Math.PI / 2);
    ctx.fillStyle = alpha(COLORS.ink, 0.3);
    roundRect(ctx, -t.len / 2 + 6, -t.wid / 2 + 8, t.len, t.wid, 10);
    ctx.fill();
    const wreck = car.hp <= 0;
    ctx.fillStyle = wreck ? '#3a3733' : car.color;
    roundRect(ctx, -t.len / 2, -t.wid / 2, t.len, t.wid, 10);
    ctx.fill();
    ctx.strokeStyle = alpha(COLORS.ink, 0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
    // Nose and tail shading: the long axis reads at a glance.
    ctx.fillStyle = alpha(COLORS.ink, 0.16);
    ctx.fillRect(t.len / 2 - 13, -t.wid / 2 + 4, 9, t.wid - 8);
    ctx.fillStyle = alpha('#ffffff', 0.13);
    ctx.fillRect(-t.len / 2 + 4, -t.wid / 2 + 4, 8, t.wid - 8);
    // Cabin: windscreen, roof, rear glass. The glazing is kept narrower
    // than the body on purpose: a continuous band of body colour runs
    // along both flanks, so the car reads as one painted shell.
    ctx.fillStyle = '#22303c';
    roundRect(ctx, -t.len * 0.05, -t.wid * 0.30, t.len * 0.2, t.wid * 0.6, 5);
    ctx.fill();
    ctx.fillStyle = shade(car.color === '#3a3733' ? '#3a3733' : car.color, 1.12);
    if (wreck) ctx.fillStyle = '#46423d';
    roundRect(ctx, -t.len * 0.28, -t.wid * 0.28, t.len * 0.24, t.wid * 0.56, 5);
    ctx.fill();
    ctx.fillStyle = '#1b2632';
    roundRect(ctx, -t.len * 0.42, -t.wid * 0.27, t.len * 0.12, t.wid * 0.54, 4);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#17150f';
    const wy = t.wid / 2 - 3;
    const wx = t.len / 2 - 17;
    ctx.fillRect(-wx - 8, -wy - 3, 16, 7);
    ctx.fillRect(wx - 8, -wy - 3, 16, 7);
    ctx.fillRect(-wx - 8, wy - 4, 16, 7);
    ctx.fillRect(wx - 8, wy - 4, 16, 7);
    // Type dressing.
    if (car.typeId === 'taxi') {
      ctx.fillStyle = COLORS.ink;
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillStyle = '#ffd977';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TAXI', 0, 0);
    }
    if (car.typeId === 'truck') {
      ctx.fillStyle = alpha('#ffffff', 0.2);
      ctx.fillRect(-t.len / 2 + 4, -t.wid / 2 + 5, t.len * 0.52, t.wid - 10);
      ctx.fillStyle = alpha(COLORS.ink, 0.55);
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CASA ROJA', -t.len * 0.22, 0);
    }
    if (car.typeId === 'police' || car.typeId === 'interceptor') {
      ctx.fillStyle = COLORS.police;
      ctx.fillRect(-t.len * 0.3, -t.wid / 2 + 3, t.len * 0.52, 8);
      ctx.fillRect(-t.len * 0.3, t.wid / 2 - 11, t.len * 0.52, 8);
      ctx.fillStyle = alpha(COLORS.ink, 0.7);
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GP', -t.len * 0.16, 0);
      // Light bar: red/blue halves strobing on sim time.
      const phase = Math.floor(game.time * 6) % 2 === 0;
      ctx.fillStyle = phase ? '#e8452c' : '#7fa8e8';
      ctx.fillRect(-11, -t.wid / 2 + 9, 10, t.wid - 18);
      ctx.fillStyle = phase ? '#7fa8e8' : '#e8452c';
      ctx.fillRect(1, -t.wid / 2 + 9, 10, t.wid - 18);
    }
    // Headlights at night; brake glow while slowing.
    if (nightFactor(game.hour) > 0.25) {
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(t.len / 2 - 3, -t.wid / 2 + 5, 4, 8);
      ctx.fillRect(t.len / 2 - 3, t.wid / 2 - 13, 4, 8);
    }
    if (car.speed < -4 || (car.wait > 0)) {
      ctx.fillStyle = '#e8452c';
      ctx.fillRect(-t.len / 2 - 1, -t.wid / 2 + 5, 4, 8);
      ctx.fillRect(-t.len / 2 - 1, t.wid / 2 - 13, 4, 8);
    }
    ctx.restore();
    if (wreck && !car.exploded) {
      ctx.fillStyle = alpha(COLORS.ink, 0.35);
      ctx.beginPath();
      ctx.arc(car.x, car.y, t.wid * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // -- People -----------------------------------------------------------------------
  function drawPerson(x, y, angle, colors, opts) {
    const o = opts || {};
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = alpha(COLORS.ink, 0.28);
    ctx.beginPath();
    ctx.ellipse(3, 5, 10, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.dead) {
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = colors.pants;
      ctx.fillRect(-13, -4.5, 26, 9);
      ctx.fillStyle = colors.shirt;
      ctx.beginPath();
      ctx.arc(-2, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.skin;
      ctx.beginPath();
      ctx.arc(9, 0, 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = alpha(COLORS.blood, 0.5);
      ctx.beginPath();
      ctx.ellipse(2, 7, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const stride = o.walk ? Math.sin(o.walk * 9) * 4 : 0;
    ctx.rotate(angle - Math.PI / 2);
    // Legs swing fore and aft along the heading.
    ctx.fillStyle = colors.pants;
    ctx.fillRect(-3.4 + stride * 0.4, -6.4, 6.4, 5.4);
    ctx.fillRect(-3.4 - stride * 0.4, 1, 6.4, 5.4);
    // Torso and arms.
    ctx.fillStyle = colors.shirt;
    ctx.beginPath();
    ctx.arc(-1, 0, 8.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-3, -13.5, 4.6, 6);
    ctx.fillRect(-3, 7, 4.6, 6);
    if (o.weapon) {
      ctx.strokeStyle = '#1d1a16';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(4, 3);
      ctx.lineTo(19, 4.5);
      ctx.stroke();
    }
    // Head, forward of the shoulders, with hair or a hat.
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.arc(5.5, 0, 5.4, 0, Math.PI * 2);
    ctx.fill();
    if (o.hat) {
      ctx.fillStyle = '#d8c98a';
      ctx.beginPath();
      ctx.ellipse(5.5, 0, 8.4, 8.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.skin;
      ctx.beginPath();
      ctx.arc(5.5, 0, 4.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = colors.hair || '#2b2018';
      ctx.beginPath();
      ctx.arc(4.4, 0, 5, 0, Math.PI * 0.9);
      ctx.fill();
    }
    ctx.restore();
    if (o.hpBar && o.hpFrac < 1) {
      ctx.fillStyle = alpha(COLORS.ink, 0.65);
      ctx.fillRect(x - 15, y - 24, 30, 4.6);
      ctx.fillStyle = o.hpFrac > 0.4 ? '#7fc46a' : '#e8452c';
      ctx.fillRect(x - 14, y - 23.2, 28 * clamp(o.hpFrac, 0, 1), 3);
    }
  }

  const OUTFITS = [
    { shirt: '#b03024', pants: '#2e2a26', skin: '#a06a42', hair: '#17120e' },
    { shirt: '#e3e0d2', pants: '#37424e', skin: '#a06a42', hair: '#17120e' },
    { shirt: '#2e8f86', pants: '#3d3a38', skin: '#a06a42', hair: '#17120e' },
    { shirt: '#274b8f', pants: '#23252a', skin: '#a06a42', hair: '#17120e' },
  ];

  // -- CÓNDOR-1 ----------------------------------------------------------------------
  function drawHeli(h, game) {
    // The shadow lands first, displaced from the body: height you can feel.
    ctx.fillStyle = alpha(COLORS.ink, 0.3);
    ctx.beginPath();
    ctx.ellipse(h.x + 70, h.y + 95, 44, 17, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // The searchlight pool, where the shadow will fall in the chase frame.
    ctx.fillStyle = alpha('#ffe9a8', 0.13);
    ctx.beginPath();
    ctx.ellipse(h.x + 66, h.y + 88, 58, 26, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.angle - Math.PI / 2);
    // Tail boom and fin.
    ctx.fillStyle = '#2b3442';
    ctx.fillRect(-84, -4, 76, 8);
    ctx.fillRect(-90, -10, 8, 20);
    // Body.
    ctx.fillStyle = '#37424e';
    roundRect(ctx, -38, -16, 80, 32, 14);
    ctx.fill();
    ctx.fillStyle = '#4c5a68';
    roundRect(ctx, -22, -12, 46, 24, 10);
    ctx.fill();
    // Cockpit glass.
    ctx.fillStyle = '#9fc6d8';
    roundRect(ctx, 16, -10, 20, 20, 8);
    ctx.fill();
    // Guardia band and callsign.
    ctx.fillStyle = COLORS.police;
    ctx.fillRect(-35, -16, 11, 32);
    ctx.fillStyle = '#e8ecf2';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('C-1', -5, 0);
    // Skids.
    ctx.strokeStyle = '#1d2126';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-30, -22);
    ctx.lineTo(36, -22);
    ctx.moveTo(-30, 22);
    ctx.lineTo(36, 22);
    ctx.stroke();
    ctx.restore();
    // The rotor disc spins above everything, a translucent blur with a
    // bright arc that catches the light once per revolution.
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.fillStyle = alpha('#0e0c0a', 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = alpha('#e8e4da', 0.45);
    ctx.lineWidth = 3;
    const ra = game.time * 21 % (Math.PI * 2);
    ctx.beginPath();
    ctx.arc(0, 0, 52, ra, ra + 0.85);
    ctx.stroke();
    ctx.fillStyle = '#23272e';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // -- Effects -------------------------------------------------------------------------
  function drawEffects(game) {
    const combat = game.combat;
    // Tracers: a bright head and a fading tail along the flight line.
    for (const b of combat.bullets) {
      ctx.strokeStyle = alpha('#ffd977', 0.85);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const p of combat.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const f of combat.flashes) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillStyle = alpha('#ffd977', clamp(f.life / 0.05, 0, 1));
      const s = f.big ? 66 : 17;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.32);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s * 0.32);
      ctx.lineTo(s * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const n of combat.numbers) {
      ctx.globalAlpha = clamp(n.life / 0.85, 0, 1);
      ctx.fillStyle = n.color;
      ctx.fillText(String(n.value), n.x, n.y);
    }
    ctx.globalAlpha = 1;
  }

  // -- Markers ---------------------------------------------------------------------------
  function drawMarkers(game) {
    const marker = game.missions.marker();
    const t = game.time;
    if (marker) {
      const bob = Math.sin(t * 3) * 6;
      ctx.strokeStyle = alpha(COLORS.gold, 0.85);
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 30 + Math.sin(t * 4) * 4, 0, Math.PI * 2);
      ctx.stroke();
      // The beacon pillar: a column of light the whole district can see.
      const grad = ctx.createLinearGradient(0, marker.y - 330, 0, marker.y);
      grad.addColorStop(0, alpha(COLORS.gold, 0));
      grad.addColorStop(1, alpha(COLORS.gold, 0.3));
      ctx.fillStyle = grad;
      ctx.fillRect(marker.x - 13, marker.y - 330, 26, 330);
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.moveTo(marker.x, marker.y - 52 + bob);
      ctx.lineTo(marker.x - 13, marker.y - 74 + bob);
      ctx.lineTo(marker.x + 13, marker.y - 74 + bob);
      ctx.closePath();
      ctx.fill();
    }
    if (game.waypoint) {
      ctx.strokeStyle = alpha(COLORS.teal, 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(game.waypoint.x, game.waypoint.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLORS.teal;
      ctx.beginPath();
      ctx.arc(game.waypoint.x, game.waypoint.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cargo crates still waiting in the corners.
    for (const c of game.world.collectibles) {
      if (c.taken) continue;
      ctx.fillStyle = '#8a6a35';
      ctx.fillRect(c.x - 12, c.y - 12, 24, 24);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x - 12, c.y - 12, 24, 24);
      ctx.fillStyle = alpha(COLORS.gold, 0.5 + Math.sin(t * 4 + c.id) * 0.3);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Shop signs and safehouse doors.
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of game.world.shops) {
      ctx.fillStyle = alpha(COLORS.ink, 0.72);
      roundRect(ctx, s.x - 62, s.y - 52, 124, 24, 6);
      ctx.fill();
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x - 62, s.y - 52, 124, 4);
      ctx.fillStyle = COLORS.paper;
      ctx.fillText(s.name, s.x, s.y - 39);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText('$', s.x, s.y + 0.5);
    }
    for (const sh of game.world.safehouses) {
      ctx.fillStyle = alpha(COLORS.teal, 0.85);
      ctx.fillRect(sh.x - 11, sh.y - 11, 22, 22);
      ctx.fillStyle = '#fff';
      ctx.fillText('H', sh.x, sh.y + 0.5);
    }
  }

  // -- The frame ---------------------------------------------------------------------------
  function draw(game) {
    const cam = game.cam;
    const zoom = cam.zoom;
    const view = {
      x0: cam.x - VIEW_W / 2 / zoom,
      y0: cam.y - VIEW_H / 2 / zoom,
      x1: cam.x + VIEW_W / 2 / zoom,
      y1: cam.y + VIEW_H / 2 / zoom,
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.seaDeep;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.setTransform(zoom, 0, 0, zoom,
      VIEW_W / 2 - cam.x * zoom, VIEW_H / 2 - cam.y * zoom);

    drawTiles(game, view);
    for (const b of game.world.boats) {
      if (b.x < view.x0 - 200 || b.x > view.x1 + 200 || b.y < view.y0 - 200 || b.y > view.y1 + 200) continue;
      drawBoat(b, game);
    }
    for (const p of game.world.props) {
      if (p.x < view.x0 - 90 || p.x > view.x1 + 90 || p.y < view.y0 - 170 || p.y > view.y1 + 90) continue;
      if (p.kind === 'crane') continue; // cranes draw above the cars
      drawProp(p, game);
    }
    for (const c of game.world.containers) {
      if (c.x < view.x0 - 90 || c.x > view.x1 + 90 || c.y < view.y0 - 90 || c.y > view.y1 + 90) continue;
      if (c.level === 0) drawContainer(c);
    }
    for (const b of game.world.buildings) {
      if (b.x + b.w < view.x0 - 60 || b.x > view.x1 + 60 || b.y + b.h < view.y0 - 60 || b.y > view.y1 + 60) continue;
      drawBuilding(b, game);
    }
    for (const c of game.world.containers) if (c.level > 0) drawContainer(c);
    drawMarkers(game);
    const cars = game.allCars();
    for (const car of cars) {
      if (car.x < view.x0 - 120 || car.x > view.x1 + 120 || car.y < view.y0 - 120 || car.y > view.y1 + 120) continue;
      drawCar(car, game);
    }
    // People: peds, sicarios, officers, then Adrián on top of his street.
    for (const ped of game.peds.peds) {
      if (ped.x < view.x0 - 40 || ped.x > view.x1 + 40 || ped.y < view.y0 - 40 || ped.y > view.y1 + 40) continue;
      drawPerson(ped.x, ped.y, ped.angle,
        { shirt: ped.shirt, pants: ped.pants, skin: ped.skin },
        { walk: game.time + ped.seed });
    }
    for (const e of game.combat.enemies) {
      drawPerson(e.x, e.y, e.angle,
        { shirt: e.shirt, pants: '#2e2a26', skin: '#8a5a3b' },
        { dead: e.dead, weapon: !e.dead, hpBar: !e.dead, hpFrac: e.hp / e.maxHp, walk: game.time });
    }
    for (const o of game.police.officers) {
      drawPerson(o.x, o.y, o.angle,
        { shirt: COLORS.police, pants: '#232c3f', skin: '#a06a42' },
        { dead: o.dead, weapon: !o.dead, hpBar: !o.dead, hpFrac: o.hp / o.maxHp, walk: game.time });
    }
    const p = game.playerCtl.state;
    if (!p.car && !p.dead) {
      const outfit = OUTFITS[game.outfit % OUTFITS.length];
      drawPerson(p.x, p.y, p.angle, outfit,
        { weapon: true, hat: game.hat, walk: p.walkCycle, hpBar: false });
    }
    if (p.dead) {
      const outfit = OUTFITS[game.outfit % OUTFITS.length];
      drawPerson(p.x, p.y, p.angle, outfit, { dead: true });
    }
    for (const prop of game.world.props) {
      if (prop.kind === 'crane') drawProp(prop, game);
    }
    drawEffects(game);
    if (game.police.heli) drawHeli(game.police.heli, game);

    // -- Light of the hour, over everything --------------------------------
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const night = nightFactor(game.hour);
    if (night > 0) {
      ctx.fillStyle = 'rgba(18,24,48,' + (night * 0.42).toFixed(3) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    const gold = goldFactor(game.hour);
    if (gold > 0) {
      ctx.fillStyle = 'rgba(232,140,50,' + (gold * 0.13).toFixed(3) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // A soft vignette seats the frame.
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    vg.addColorStop(0, 'rgba(10,6,4,0)');
    vg.addColorStop(1, 'rgba(10,6,4,0.3)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (game.hurtFlash > 0) {
      ctx.fillStyle = 'rgba(194,59,42,' + (game.hurtFlash * 0.3).toFixed(3) + ')';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  return { draw, ctx };
}
