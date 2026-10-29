// Procedural motion for text boxes ({box<bg>-<fg>:...} in the text markup).
// Each box has a seed; its wander, tilt and edge shape come from that seed, so every
// box moves its own way and the same text always moves the same way.
// The motion is CSS keyframes: a transform on the box and a clip-path on its background.

const PERIOD_MS = [3200, 6400]; // a box's loop length, chosen by its seed
const POINTS = 8; // corners and edge midpoints of the box's outline

// A small seeded random generator (mulberry32). Same seed, same numbers.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number from a string (FNV-1a). Used for a box's seed. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * The keyframes of one box. `name` is a unique class name for the box.
 * Returns CSS text: a move keyframe set, a shape keyframe set, and the rules that use them.
 */
export function boxCss(name, seed) {
  const r = rng(seed);
  const period = Math.round(PERIOD_MS[0] + r() * (PERIOD_MS[1] - PERIOD_MS[0]));
  const frames = 4; // keyframes at 0, 1/3, 2/3 of the loop, then back to the first
  const moves = [];
  const shapes = [];
  for (let f = 0; f <= frames; f++) {
    const at = (f / frames) * 100;
    const dx = (r() * 2 - 1) * 2.2; // px in text units, moves slightly
    const dy = (r() * 2 - 1) * 1.6;
    const rot = (r() * 2 - 1) * 2.2; // degrees
    moves.push(`${at.toFixed(1)}% { transform: translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg); }`);
    // The outline: corners and edge midpoints, each pushed a little in or out, so the edges are uneven.
    const pts = [];
    const base = [
      [0, 0], [50, 0], [100, 0], [100, 50], [100, 100], [50, 100], [0, 100], [0, 50],
    ];
    for (let k = 0; k < POINTS; k++) {
      const [bx, by] = base[k];
      const jx = (r() * 2 - 1) * 4;
      const jy = (r() * 2 - 1) * 6;
      // Points on the edge stay on it; corners and midpoints move in both directions.
      const x = Math.min(100, Math.max(0, bx + (bx === 0 ? Math.abs(jx) : bx === 100 ? -Math.abs(jx) : jx)));
      const y = Math.min(100, Math.max(0, by + (by === 0 ? Math.abs(jy) : by === 100 ? -Math.abs(jy) : jy)));
      pts.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
    }
    shapes.push(`${at.toFixed(1)}% { clip-path: polygon(${pts.join(", ")}); }`);
  }
  return [
    `@keyframes ${name}-move { ${moves.join(" ")} }`,
    `@keyframes ${name}-shape { ${shapes.join(" ")} }`,
    `.${name} { animation: ${name}-move ${period}ms ease-in-out infinite alternate; }`,
    `.${name}::before { animation: ${name}-shape ${period}ms ease-in-out infinite alternate; }`,
  ].join("\n");
}
