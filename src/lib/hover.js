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

/** Subscribes to pointer movement (used for the card tilt). Returns an unsubscribe. */
export function onPointer(fn) {
  attach();
  pointerListeners.add(fn);
  return () => pointerListeners.delete(fn);
}

/**
 * True while the pointer is over the element behind ref (or over extraRef, if
 * given and set, such as a card that opens on top of it).
 */
export function useHoverRegion(ref, extraRef) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const key = {};
    regions.set(key, {
      on: false,
      set: setOn,
      rect: () => ref.current?.getBoundingClientRect(),
      extra: () => extraRef?.current?.getBoundingClientRect(),
    });
    attach();
    return () => regions.delete(key);
  }, []);
  return on;
}
