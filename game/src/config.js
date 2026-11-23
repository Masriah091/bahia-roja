// BAHÍA ROJA — the shared numbers: world size, the six districts of the
// port, the golden-hour palette, the wanted ladder and the reputation
// ladder. This module is pure data plus two lookups; behaviour lives
// elsewhere, so every system reads the same truth from here.

// ---------------------------------------------------------------------------
// Geometry. The world is a grid of TILE-pixel squares, MAP_W by MAP_H of
// them. The sea eats the south edge and bites two harbours into the coast.
// ---------------------------------------------------------------------------
export const TILE = 46;
export const MAP_W = 150;
export const MAP_H = 112;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/** The canvas is composed at this size; screenshots are captured at it. */
export const VIEW_W = 1280;
export const VIEW_H = 960;

/** Fixed simulation step, in seconds. The loop never steps coarser. */
export const STEP = 1 / 60;

// ---------------------------------------------------------------------------
// The six districts. Rects are tile coordinates [x, y, w, h]. The HUD shows
// `name` beneath the minimap; the full-screen map labels with `short`.
// Ground and roof colours are per-district so a screenshot reads its
// neighbourhood at a glance: red cliffs, white villas, grey yards, the
// loud awnings of the salt market, container steel, harbour cream.
// ---------------------------------------------------------------------------
export const DISTRICTS = [
  {
    id: 'acantilado', name: 'EL ACANTILADO', short: 'Acantilado',
    rect: [0, 0, 52, 30],
    ground: '#8a4a34', groundAlt: '#7c4030',
    roof: ['#c96f4a', '#b85c3c', '#d07a52', '#a9512f'], wall: '#6e3a28',
    note: 'Red cliff plateau, the lighthouse and the old smugglers’ stairs.',
  },
  {
    id: 'mirador', name: 'COLINA MIRADOR', short: 'Mirador',
    rect: [96, 0, 54, 30],
    ground: '#5d6b46', groundAlt: '#54633f',
    roof: ['#e8e0cc', '#ded2b4', '#efe8d8', '#d5c69e'], wall: '#8f8672',
    note: 'Villas, palms and the Casino Mirador above the bay.',
  },
  {
    id: 'astillero', name: 'BARRIO ASTILLERO', short: 'Astillero',
    rect: [0, 30, 40, 44],
    ground: '#6f6a63', groundAlt: '#655f58',
    roof: ['#7d8894', '#6b7683', '#8b95a1', '#5d6873'], wall: '#4c4a45',
    note: 'Shipyard rows, the dry dock and the workers’ cantinas.',
  },
  {
    id: 'mercado', name: 'MERCADO DE LA SAL', short: 'Mercado',
    rect: [40, 30, 56, 40],
    ground: '#a98f66', groundAlt: '#9d835c',
    roof: ['#d9a441', '#c74f35', '#4f8f7b', '#e3e0d2', '#b8577f'], wall: '#7a6248',
    note: 'The salt market: awnings, spice smoke and crowded lanes.',
  },
  {
    id: 'escarlata', name: 'MUELLE ESCARLATA', short: 'M. Escarlata',
    rect: [96, 30, 54, 44],
    ground: '#77726c', groundAlt: '#6d6862',
    roof: ['#97a0a8', '#87919b', '#a5adb4', '#78828c'], wall: '#55534f',
    note: 'The container yard. Casa Roja moves its cargo through here.',
  },
  {
    id: 'puerto', name: 'PUERTO VIEJO', short: 'Puerto Viejo',
    rect: [0, 74, 150, 38],
    ground: '#b39b6d', groundAlt: '#a68e60',
    roof: ['#e5ddc8', '#d8cbae', '#cdbb96', '#efe6d0'], wall: '#8a764f',
    note: 'The old fishing harbour: piers, boats and the fish auction.',
  },
];

/** The district that owns a pixel position; the harbour is the fallback. */
export function districtAt(x, y) {
  const tx = x / TILE;
  const ty = y / TILE;
  for (const d of DISTRICTS) {
    const r = d.rect;
    if (tx >= r[0] && tx < r[0] + r[2] && ty >= r[1] && ty < r[1] + r[3]) return d;
  }
  return DISTRICTS[DISTRICTS.length - 1];
}

// ---------------------------------------------------------------------------
// Palette: golden hour over a red-cliff coast, plus the working colours
// the renderer and the HUD agree on.
// ---------------------------------------------------------------------------
export const COLORS = {
  sea: '#1d5f6e', seaDeep: '#174c5c', seaFoam: '#bfe8e2',
  sand: '#c9ab72', sandWet: '#bb9f6e',
  road: '#3d3a38', roadEdge: '#57524c', roadLine: '#d8c98a',
  sidewalk: '#9a9186', plaza: '#b3a58c',
  cliff: '#9c5138', cliffDark: '#7e3f2b', grass: '#66754c',
  ink: '#14100d', paper: '#f2e8d5', gold: '#e8b23a',
  blood: '#c23b2a', teal: '#2e8f86',
  police: '#274b8f', policeLight: '#7fa8e8', casaRoja: '#b03024',
  night: '#232c3f',
};

/** Container liveries stacked across Muelle Escarlata. */
export const CONTAINER_COLORS = [
  '#b0402f', '#2f6db0', '#3f8f4f', '#c78a2e', '#7a4f9e',
  '#2e8f86', '#96502c', '#5a6b7a', '#a83a5e', '#4f7a3a',
];

// ---------------------------------------------------------------------------
// Adrián Roja, driver for Casa Roja: the body every system pushes around.
// ---------------------------------------------------------------------------
export const PLAYER = {
  radius: 13,
  walkSpeed: 178,
  sprintSpeed: 268,
  maxHealth: 100,
  maxArmor: 100,
  enterRange: 58,
};

/** The named people of the port: briefings, chatter and the crew card. */
export const PEOPLE = {
  hero: 'ADRIÁN ROJA',
  boss: 'DOÑA CARMEN ROJA',
  fixer: 'VIEJO TOMÁS',
  siren: 'LA SIRENA',
  mechanic: 'ROQUE',
  rival: 'LOS MARTILLOS',
  police: 'GUARDIA PORTUARIA',
};

// ---------------------------------------------------------------------------
// Wanted system. One number, `heat`, drives everything: thresholds[i] is
// the heat that holds i stars. CÓNDOR-1, the helicopter, joins at four.
// ---------------------------------------------------------------------------
export const WANTED = {
  thresholds: [0, 18, 46, 88, 140, 205],
  decayHidden: 4.2, // heat per second while no unit holds the suspect
  decaySeen: 0.55, // heat per second while watched — the hunt cools slowly
  searchAfter: 3.5, // unseen seconds before units flip to SEARCHING
  heliStars: 4,
};

/** Star count (0..5) for a heat value. */
export function starsForHeat(heat) {
  let stars = 0;
  for (let i = 0; i < WANTED.thresholds.length; i += 1) {
    if (heat >= WANTED.thresholds[i]) stars = i;
  }
  return stars;
}

// ---------------------------------------------------------------------------
// Reputation ladder: [rep needed, title]. The top rung is the campaign's
// promise — the final mission is named after it.
// ---------------------------------------------------------------------------
export const REP_LADDER = [
  [0, 'NADIE'],
  [60, 'CORREO'],
  [160, 'PILOTO DE MUELLE'],
  [320, 'CONTRABANDISTA'],
  [540, 'CAPITÁN DEL MUELLE'],
  [820, 'REY DE BAHÍA ROJA'],
];

/** The title a rep total has earned. */
export function repTitle(rep) {
  let title = REP_LADDER[0][1];
  for (const rung of REP_LADDER) if (rep >= rung[0]) title = rung[1];
  return title;
}

/** The next rung above rep, or null when the ladder is topped out. */
export function repNext(rep) {
  for (const rung of REP_LADDER) {
    if (rep < rung[0]) return { need: rung[0], name: rung[1] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Storage: three save slots and one settings record.
// ---------------------------------------------------------------------------
export const SAVE_KEYS = ['bahia-roja-slot-1', 'bahia-roja-slot-2', 'bahia-roja-slot-3'];
export const SETTINGS_KEY = 'bahia-roja-settings';

/** Car radios: pure flavour, printed on the vehicle panel. */
export const RADIO = [
  { freq: '91.3', name: 'RADIO FARO', genre: 'boleros y noticias' },
  { freq: '97.9', name: 'OLA ROJA', genre: 'cumbia del puerto' },
  { freq: '103.1', name: 'MUELLE FM', genre: 'rock en español' },
  { freq: '88.7', name: 'LA SIRENA', genre: 'jazz de medianoche' },
];
