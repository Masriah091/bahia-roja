// BAHÍA ROJA — the port itself, grown deterministically from a seed.
//
// createWorld(seed) paints the tile grid (asphalt, beach, harbour water,
// the container yard, the market plaza, the dry dock), raises buildings
// with a pseudo-3D height each, plants the props that make a district
// readable at a glance — container stacks, market stalls, cranes, palms,
// boats — signs the shops and safehouses, hides twenty-four cargo crates,
// and returns the collision queries every mover shares. Nothing here
// draws; render.js paints what this module builds.

import {
  TILE, MAP_W, MAP_H, WORLD_W, WORLD_H, DISTRICTS, CONTAINER_COLORS, districtAt,
} from './config.js';
import { createRng, clamp } from './rng.js';

/** Tile kinds stored in the grid. */
export const T = {
  GROUND: 0, ROAD: 1, WALK: 2, WATER: 3, SAND: 4, CLIFF: 5,
  GRASS: 6, DOCK: 7, YARD: 8, PLAZA: 9, ROCK: 10,
};

/** Avenue centre-lines (tile x) and street centre-lines (tile y). */
export const AVENUES_X = [16, 40, 64, 88, 112, 134];
export const STREETS_Y = [14, 32, 50, 68, 86];
/** The coast avenue's row; it crosses both harbours on a causeway. */
export const COAST_Y = 98;

const SEA_ROW = 103;
const BEACH_ROW = 101;

/** Named places the campaign and the map point at. Pixel coordinates. */
export const LOCATIONS = {
  yardGate: { x: 104 * TILE, y: 69 * TILE, name: 'Puerta del Muelle Escarlata' },
  yardCrane: { x: 122 * TILE, y: 50 * TILE, name: 'Grúa Tres, Muelle Escarlata' },
  fishAuction: { x: 24 * TILE, y: 92 * TILE, name: 'Lonja de Puerto Viejo' },
  ferryDock: { x: 58 * TILE, y: 97 * TILE, name: 'Embarcadero del Ferry' },
  lighthouse: { x: 6 * TILE, y: 5 * TILE, name: 'Faro de Bahía Roja' },
  cliffStairs: { x: 30 * TILE, y: 15 * TILE, name: 'Escaleras del Acantilado' },
  casino: { x: 122 * TILE, y: 15 * TILE, name: 'Casino Mirador' },
  villaSol: { x: 132 * TILE, y: 24 * TILE, name: 'Villa Sol de la Colina' },
  dryDock: { x: 13 * TILE, y: 51 * TILE, name: 'Dique Seco del Astillero' },
  saltWorks: { x: 76 * TILE, y: 74 * TILE, name: 'Salinas del Sur' },
  marketPlaza: { x: 70 * TILE, y: 50 * TILE, name: 'Plaza del Mercado de la Sal' },
  radioTower: { x: 46 * TILE, y: 8 * TILE, name: 'Torre de Radio Faro' },
  casaRoja: { x: 108 * TILE, y: 76 * TILE, name: 'Almacén Casa Roja' },
  oldFort: { x: 20 * TILE, y: 24 * TILE, name: 'Fuerte Viejo' },
  marina: { x: 132 * TILE, y: 95 * TILE, name: 'Marina de la Colina' },
};

export function createWorld(seed) {
  const rng = createRng(seed);
  const tiles = new Uint8Array(MAP_W * MAP_H);
  const buildings = [];
  const containers = [];
  const props = [];
  const colliders = [];
  const boats = [];
  const shops = [];
  const safehouses = [];
  const collectibles = [];

  const idx = (tx, ty) => ty * MAP_W + tx;
  const inMap = (tx, ty) => tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H;

  function setTile(tx, ty, v) {
    if (inMap(tx, ty)) tiles[idx(tx, ty)] = v;
  }
  function getTile(tx, ty) {
    if (!inMap(tx, ty)) return T.WATER;
    return tiles[idx(tx, ty)];
  }

  // -- Base earth, then the sea ------------------------------------------
  for (let i = 0; i < tiles.length; i += 1) tiles[i] = T.GROUND;
  for (let ty = SEA_ROW; ty < MAP_H; ty += 1) {
    for (let tx = 0; tx < MAP_W; tx += 1) setTile(tx, ty, T.WATER);
  }
  for (let ty = BEACH_ROW; ty < SEA_ROW; ty += 1) {
    for (let tx = 0; tx < MAP_W; tx += 1) setTile(tx, ty, T.SAND);
  }
  // The harbour basin bites into Puerto Viejo's south-west corner.
  for (let ty = 90; ty < MAP_H; ty += 1) {
    for (let tx = 2; tx <= 37; tx += 1) setTile(tx, ty, T.WATER);
  }
  // The marina inlet below Colina Mirador.
  for (let ty = 92; ty < MAP_H; ty += 1) {
    for (let tx = 122; tx <= 146; tx += 1) setTile(tx, ty, T.WATER);
  }
  // The red cliff: rock and cliff face across the north-west heights.
  for (let ty = 0; ty < 12; ty += 1) {
    for (let tx = 0; tx < 27; tx += 1) {
      setTile(tx, ty, rng.chance(0.4) ? T.ROCK : T.CLIFF);
    }
  }
  for (let tx = 0; tx < 27; tx += 1) {
    setTile(tx, 12, T.CLIFF);
    setTile(tx, 13, T.CLIFF);
  }
  // Grass takes the villa hill and the unclaimed band north of the Mercado.
  for (let ty = 0; ty < 30; ty += 1) {
    for (let tx = 96; tx < MAP_W; tx += 1) setTile(tx, ty, T.GRASS);
  }
  for (let ty = 0; ty < 30; ty += 1) {
    for (let tx = 52; tx < 96; tx += 1) setTile(tx, ty, T.GRASS);
  }
  // The container yard floor and the market plaza get their own tiles.
  for (let ty = 32; ty < 72; ty += 1) {
    for (let tx = 98; tx < 148; tx += 1) setTile(tx, ty, T.YARD);
  }
  for (let ty = 44; ty < 57; ty += 1) {
    for (let tx = 62; tx < 79; tx += 1) setTile(tx, ty, T.PLAZA);
  }
  // The dry dock: a dock-floored trench in the Astillero.
  for (let ty = 47; ty < 56; ty += 1) {
    for (let tx = 8; tx < 19; tx += 1) setTile(tx, ty, T.DOCK);
  }
  // Salt pans glitter south of the Mercado.
  for (let ty = 71; ty < 77; ty += 1) {
    for (let tx = 70; tx < 83; tx += 1) setTile(tx, ty, T.SAND);
  }

  // -- Roads ---------------------------------------------------------------
  // Avenues run north–south, streets east–west; each is three tiles wide
  // with a walk tile of pavement on either side. Roads carve over water
  // only where the coast causeway is allowed to.
  function carveRoad(vertical, centre, overWater) {
    for (let a = -2; a <= 2; a += 1) {
      const isPave = Math.abs(a) === 2;
      const limit = vertical ? MAP_H : MAP_W;
      for (let i = 0; i < limit; i += 1) {
        const tx = vertical ? centre + a : i;
        const ty = vertical ? i : centre + a;
        if (!inMap(tx, ty)) continue;
        const cur = getTile(tx, ty);
        if (cur === T.WATER && !overWater) continue;
        if (cur === T.ROCK) continue;
        setTile(tx, ty, isPave ? T.WALK : T.ROAD);
      }
    }
  }
  for (const x of AVENUES_X) carveRoad(true, x, false);
  for (const y of STREETS_Y) carveRoad(false, y, false);
  carveRoad(false, COAST_Y, true);
  // The cliff road climbs to the lighthouse along the top street.
  carveRoad(true, 6, false);

  // Piers reach into the harbour basin and the marina.
  function pier(x0, x1, y) {
    for (let tx = x0; tx <= x1; tx += 1) {
      setTile(tx, y, T.DOCK);
      setTile(tx, y + 1, T.DOCK);
    }
  }
  pier(6, 14, 94);
  pier(20, 30, 97);
  pier(126, 134, 96);

  // -- Buildings -----------------------------------------------------------
  // Blocks fill the gaps between roads. A building is a footprint, a
  // district palette and a height; the renderer extrudes it. Footprints
  // never touch roads, water or the plaza, and every one is a collider.
  function addBuilding(x, y, w, h, district, kind) {
    const b = {
      x, y, w, h, kind: kind || 'block',
      roof: rng.pick(district.roof), wall: district.wall,
      height: rng.range(14, 46), seed: rng.int(1, 99999),
      district: district.id,
    };
    buildings.push(b);
    colliders.push({ x, y, w, h });
    return b;
  }
  function blockFree(tx, ty, tw, th) {
    for (let y = ty; y < ty + th; y += 1) {
      for (let x = tx; x < tx + tw; x += 1) {
        const t = getTile(x, y);
        if (t === T.ROAD || t === T.WATER || t === T.ROCK || t === T.PLAZA
          || t === T.YARD || t === T.DOCK) return false;
      }
    }
    return true;
  }
  for (const d of DISTRICTS) {
    const r = d.rect;
    for (let ty = r[1] + 2; ty < r[1] + r[3] - 4; ty += rng.int(5, 7)) {
      for (let tx = r[0] + 2; tx < r[0] + r[2] - 5; tx += rng.int(6, 9)) {
        const tw = rng.int(3, 5);
        const th = rng.int(3, 4);
        if (!blockFree(tx, ty, tw, th)) continue;
        if (rng.chance(0.18)) continue; // gaps read as yards and alleys
        addBuilding(tx * TILE + 6, ty * TILE + 6, tw * TILE - 12, th * TILE - 12, d);
      }
    }
  }
  // Landmark footprints at the named places.
  const market = DISTRICTS[3];
  addBuilding(64 * TILE, 46 * TILE, 3 * TILE, 2 * TILE, market, 'marketHall');
  const escarlata = DISTRICTS[4];
  addBuilding(106 * TILE, 73 * TILE, 5 * TILE, 3 * TILE, escarlata, 'warehouse');

  // -- Containers ----------------------------------------------------------
  function addContainer(x, y, angle, level) {
    const c = {
      x, y, angle, level,
      color: rng.pick(CONTAINER_COLORS), seed: rng.int(1, 9999),
      w: 104, h: 44,
    };
    containers.push(c);
    if (level === 0) colliders.push({ x: x - 52, y: y - 22, w: 104, h: 44 });
    return c;
  }
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      if (rng.chance(0.22)) continue;
      const x = (102 + col * 6.4) * TILE;
      const y = (36 + row * 4.1) * TILE;
      addContainer(x, y, rng.chance(0.5) ? 0 : Math.PI / 2, 0);
      if (rng.chance(0.4)) addContainer(x, y, 0, 1);
    }
  }

  // -- Props ---------------------------------------------------------------
  function addProp(kind, x, y, extra) {
    const p = Object.assign({ kind, x, y, seed: rng.int(1, 9999) }, extra || {});
    props.push(p);
    if (kind === 'crane') colliders.push({ x: x - 26, y: y - 26, w: 52, h: 52 });
    if (kind === 'stall') colliders.push({ x: x - 30, y: y - 20, w: 60, h: 40 });
    if (kind === 'palm' || kind === 'tree') colliders.push({ x: x - 7, y: y - 7, w: 14, h: 14 });
    return p;
  }
  // Cranes over the yard and the dry dock.
  addProp('crane', LOCATIONS.yardCrane.x, LOCATIONS.yardCrane.y, { angle: 0.4 });
  addProp('crane', 13 * TILE, 44 * TILE, { angle: 2.2 });
  addProp('crane', 128 * TILE, 62 * TILE, { angle: -0.7 });
  // Market stalls crowd the plaza in rows.
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      if (rng.chance(0.2)) continue;
      addProp('stall', (64.5 + col * 3.1) * TILE, (47 + row * 3.4) * TILE,
        { color: rng.pick(market.roof) });
    }
  }
  // Palms on the hill and along the beach; pines on the cliff top.
  for (let i = 0; i < 46; i += 1) {
    const x = rng.range(97, 148) * TILE;
    const y = rng.range(2, 28) * TILE;
    if (!circleHitsSolid(x, y, 20)) addProp('palm', x, y, {});
  }
  for (let i = 0; i < 30; i += 1) {
    const x = rng.range(3, 146) * TILE;
    const y = rng.range(99.4, 100.6) * TILE;
    addProp('palm', x, y, {});
  }
  // Beach umbrellas and drying fishing nets: the shore at leisure and at work.
  for (let i = 0; i < 16; i += 1) {
    const x = rng.range(40, 146) * TILE;
    const y = rng.range(99.6, 100.8) * TILE;
    addProp('umbrella', x, y, { color: rng.pick(['#c74f35', '#e8b23a', '#2e8f86', '#e3e0d2']) });
  }
  for (let i = 0; i < 10; i += 1) {
    const x = rng.range(4, 36) * TILE;
    const y = rng.range(88.4, 89.6) * TILE;
    if (!circleHitsSolid(x, y, 20)) addProp('net', x, y, {});
  }
  for (let i = 0; i < 22; i += 1) {
    const x = rng.range(28, 50) * TILE;
    const y = rng.range(2, 26) * TILE;
    if (!circleHitsSolid(x, y, 20)) addProp('tree', x, y, {});
  }
  // Lamps along the coast avenue, barrels and crates in working corners.
  for (let tx = 4; tx < 148; tx += 6) addProp('lamp', tx * TILE, 96.6 * TILE, {});
  for (let i = 0; i < 40; i += 1) {
    const spot = randomPointIn(rng, rng.pick(DISTRICTS).id);
    addProp(rng.chance(0.5) ? 'barrel' : 'crateProp', spot.x, spot.y, {});
  }
  // The lighthouse and the radio tower stand on their named spots.
  addProp('lighthouse', LOCATIONS.lighthouse.x, LOCATIONS.lighthouse.y, {});
  colliders.push({ x: LOCATIONS.lighthouse.x - 24, y: LOCATIONS.lighthouse.y - 24, w: 48, h: 48 });
  addProp('tower', LOCATIONS.radioTower.x, LOCATIONS.radioTower.y, {});
  colliders.push({ x: LOCATIONS.radioTower.x - 18, y: LOCATIONS.radioTower.y - 18, w: 36, h: 36 });

  // -- Boats -----------------------------------------------------------------
  function addBoat(x, y, angle, len, color, kind) {
    boats.push({ x, y, angle, len, color, kind, seed: rng.int(1, 9999), bob: rng.range(0, 6) });
  }
  for (let i = 0; i < 12; i += 1) {
    addBoat(rng.range(4, 34) * TILE, rng.range(92, 108) * TILE, rng.range(0, Math.PI * 2),
      rng.range(52, 84), rng.pick(['#d8d2c2', '#b0402f', '#2f6db0', '#3f8f4f', '#e0a83a']), 'fishing');
  }
  addBoat(70 * TILE, 108 * TILE, 0.2, 300, '#5a3b32', 'cargo');
  addBoat(96 * TILE, 109 * TILE, -0.15, 340, '#37424e', 'cargo');
  for (let i = 0; i < 6; i += 1) {
    addBoat(rng.range(124, 145) * TILE, rng.range(94, 108) * TILE, rng.range(0, Math.PI * 2),
      rng.range(40, 60), '#e8e4da', 'yacht');
  }
  // A half-built hull waits in the dry dock for the Martillos' money.
  addProp('hull', 13 * TILE, 51 * TILE, { angle: 0.1, len: 300 });

  // -- Shops and safehouses, at fixed signed frontages ----------------------
  function addShop(id, name, kind, tx, ty, color, blurb) {
    const s = { id, name, kind, x: tx * TILE, y: ty * TILE, color, blurb };
    shops.push(s);
    return s;
  }
  addShop('armeria', 'ARMERÍA DEL PUERTO', 'weapons', 62.4, 48.4, '#8f2f26', 'Armas y munición, sin preguntas.');
  addShop('taller', 'TALLER ROQUE', 'garage', 17.6, 54.4, '#3f6d8f', 'Reparación, pintura y motor nuevo.');
  addShop('cantina', 'CANTINA LA BRASA', 'food', 44, 96.4, '#c78a2e', 'Pescado frito y café fuerte. Cura 50 de salud.');
  addShop('farmacia', 'FARMACIA DEL FARO', 'pharmacy', 89.6, 30.4, '#2e8f86', 'Vendajes y chalecos antibalas.');
  addShop('boutique', 'BOUTIQUE MIRADOR', 'clothes', 110.4, 12.4, '#a83a5e', 'Ropa nueva: la Guardia pierde tu rastro.');
  addShop('motor', 'MOTOR ROQUE — VENTA', 'dealer', 113.6, 66.4, '#4f7a3a', 'Coches del puerto, papeles limpios.');

  safehouses.push(
    { name: 'Casa del Puerto Viejo', x: 30 * TILE, y: 88 * TILE, district: 'puerto' },
    { name: 'Piso del Mercado', x: 66 * TILE, y: 30 * TILE, district: 'mercado' },
    { name: 'Villa Mirador', x: 130 * TILE, y: 20 * TILE, district: 'mirador' },
  );

  // -- Collectible cargo crates: twenty-four, hidden in working corners -----
  const crateSpots = [];
  while (crateSpots.length < 24) {
    const x = rng.range(3, MAP_W - 3) * TILE;
    const y = rng.range(3, 99) * TILE;
    const t = getTile(Math.floor(x / TILE), Math.floor(y / TILE));
    if (t === T.WATER || t === T.ROAD) continue;
    if (crateSpots.some((c) => Math.hypot(c.x - x, c.y - y) < 500)) continue;
    crateSpots.push({ x, y });
  }
  crateSpots.forEach((c, i) => collectibles.push({ id: i, x: c.x, y: c.y, taken: false }));

  // -- Queries ---------------------------------------------------------------
  function tileAtPx(x, y) {
    return getTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }
  function isWater(x, y) {
    return tileAtPx(x, y) === T.WATER;
  }
  function isRoad(x, y) {
    const t = tileAtPx(x, y);
    return t === T.ROAD || t === T.YARD || t === T.DOCK;
  }
  /** Can a land entity stand or drive at this pixel point? */
  function passable(x, y) {
    if (x < 8 || y < 8 || x > WORLD_W - 8 || y > WORLD_H - 8) return false;
    const t = tileAtPx(x, y);
    return t !== T.WATER && t !== T.ROCK;
  }
  /** The first solid collider overlapping a circle, or null. */
  function circleHitsSolid(x, y, r) {
    for (const c of colliders) {
      const nx = clamp(x, c.x, c.x + c.w);
      const ny = clamp(y, c.y, c.y + c.h);
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < r * r) return c;
    }
    return null;
  }
  /**
   * Move a circle by (dx, dy), sliding along solids one axis at a time.
   * Mutates pos {x, y}; returns true when anything blocked the move.
   */
  function moveCircle(pos, dx, dy, r) {
    let hit = false;
    const nx = pos.x + dx;
    if (passable(nx, pos.y) && !circleHitsSolid(nx, pos.y, r)) pos.x = nx;
    else hit = true;
    const ny = pos.y + dy;
    if (passable(pos.x, ny) && !circleHitsSolid(pos.x, ny, r)) pos.y = ny;
    else hit = true;
    return hit;
  }
  /** A deterministic open land point inside a district, for ambient spawns. */
  function randomPointIn(rng2, districtId) {
    const d = DISTRICTS.find((dd) => dd.id === districtId) || DISTRICTS[0];
    const r = d.rect;
    for (let tries = 0; tries < 24; tries += 1) {
      const x = rng2.range(r[0] + 1, r[0] + r[2] - 1) * TILE;
      const y = rng2.range(r[1] + 1, Math.min(r[1] + r[3] - 1, 99)) * TILE;
      if (passable(x, y) && !circleHitsSolid(x, y, 16)) return { x, y };
    }
    return { x: (r[0] + r[2] / 2) * TILE, y: (r[1] + r[3] / 2) * TILE };
  }

  return {
    tiles, buildings, containers, props, colliders, boats, shops, safehouses,
    collectibles, getTile, tileAtPx, isWater, isRoad, passable, circleHitsSolid,
    moveCircle, randomPointIn, districtAt,
  };
}
