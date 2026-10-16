// Hover detection by position, not by the DOM. An item counts as hovered when
// the pointer is inside its box, even if another object is drawn on top of it.
// Works while the page scrolls under a still pointer, too.
import { useEffect, useState } from "react";

const regions = new Map(); // key -> { rect(), extra(), on, set }
const pointerListeners = new Set();
let last = null;
let attached = false;

const inside = (r, x, y) => !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

function check() {
  if (!last) return;
  for (const reg of regions.values()) {
    const hit = inside(reg.rect(), last.x, last.y) || inside(reg.extra(), last.x, last.y);
    if (hit !== reg.on) {
      reg.on = hit;
      reg.set(hit);
    }
  }
}

function clear() {
  last = null;
  for (const reg of regions.values())
    if (reg.on) {
      reg.on = false;
      reg.set(false);
    }
}

function attach() {
  if (attached) return;
  attached = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      last = { x: e.clientX, y: e.clientY };
      pointerListeners.forEach((fn) => fn(e));
      check();
    },
    { passive: true },
  );
  window.addEventListener("scroll", check, { passive: true });
  document.documentElement.addEventListener("pointerleave", clear);
}

/** Re-checks hover now (after something moved, such as a card that follows its button). */
export function refreshHover() {
  check();
}

/** Subscribes to pointer movement (used for the card tilt). Returns an unsubscribe. */
export function onPointer(fn) {
  attach();
  pointerListeners.add(fn);
  return () => pointerListeners.delete(fn);
}

/**
 * True while the pointer is over the element behind ref, or over the rect that
 * extra() returns (for example a card open on top of it). Returns undefined when
 * there is no extra area.
 */
export function useHoverRegion(ref, extra) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const key = {};
    regions.set(key, {
      on: false,
      set: setOn,
      rect: () => ref.current?.getBoundingClientRect(),
      extra: () => (extra ? extra() : undefined),
    });
    attach();
    return () => regions.delete(key);
  }, []);
  return on;
}
