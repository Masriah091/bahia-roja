// BAHÍA ROJA — seeded randomness and the small math kit every system shares.
//
// One mulberry32 stream per game seed is the only dice the simulation may
// roll: the same seed grows the same port, deals the same traffic and stages
// the same screenshot scenes, byte for byte, on every run.
//
// Angle convention for the whole game: heading 0 points up the screen and
// angles grow clockwise, so the heading vector of angle a is
// (sin a, -cos a). Every mover, turret and camera in the game obeys it.

/** Clamp v into the closed interval [lo, hi]. */
export function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

/** Linear interpolation: lerp(a, b, 0) is a, lerp(a, b, 1) is b. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Straight-line distance between (x1, y1) and (x2, y2). */
export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance, for hot loops that only compare distances. */
export function dist2(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * The smallest signed turn that carries angle a onto angle b.
 * The result always lands in (-PI, PI], so callers can sign-test it to
 * learn which way to steer.
 */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Rotate angle a toward b, moving at most maxStep radians. */
export function angleTurn(a, b, maxStep) {
  const d = angleDelta(a, b);
  if (Math.abs(d) <= maxStep) return b;
  return a + Math.sign(d) * maxStep;
}

/** Unit heading vector for an angle, under the game convention. */
export function heading(angle) {
  return { x: Math.sin(angle), y: -Math.cos(angle) };
}

/** Angle whose heading points from (x1, y1) toward (x2, y2). */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(x2 - x1, -(y2 - y1));
}

/**
 * Build a seeded generator. The returned object exposes the whole random
 * vocabulary of the game; nothing in the simulation calls Math.random.
 */
export function createRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** Float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** Integer in [min, max], both ends included. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** One element of a non-empty array. */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
    /** -1 or +1 with equal odds. */
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    /** A fresh seed spun off this stream, for a subsystem's own dice. */
    fork() {
      return Math.floor(next() * 4294967296);
    },
  };
}
