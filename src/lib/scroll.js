// Scroll feel, for the mouse wheel and for texture panning.
//
// - Mouse wheel and trackpad: eased in JavaScript, so every notch glides.
// - Keyboard and scrollbar arrows: CSS scroll-behavior (see styles.css).
// - --pan: the sum of the scroll movement, eased so panning textures glide
//   instead of snapping. Every panning texture reads it (see panPos in model.js).
//
// Set both time constants to 0 (or use reduced motion) to turn smoothing off.
const PAN_TAU_MS = 240; // time to close most of the gap between pan and target
const WHEEL_EASE = 0.09; // share of the remaining wheel distance covered per frame

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Starts the scroll effects. Returns a function that stops them. */
export function startScrollEffects() {
  const root = document.documentElement;
  const cleanups = [];

  // --- Panning: eased sum of scroll movement ---------------------------------
  let lastY = window.scrollY;
  let panTarget = 0;
  let panShown = 0;
  let panFrame = 0;
  let panPrev = 0;
  const panTick = (now) => {
    const dt = panPrev ? Math.min(64, now - panPrev) : 16;
    panPrev = now;
    const k =
      reducedMotion() || !PAN_TAU_MS ? 1 : 1 - Math.exp(-dt / PAN_TAU_MS);
    panShown += (panTarget - panShown) * k;
    if (Math.abs(panTarget - panShown) < 0.01) panShown = panTarget;
    root.style.setProperty("--pan", panShown.toFixed(2));
    if (panShown !== panTarget) panFrame = requestAnimationFrame(panTick);
    else {
      panFrame = 0;
      panPrev = 0;
    }
  };
  const onScroll = () => {
    const y = window.scrollY;
    panTarget += y - lastY; // movement, not position: scrolling back takes it back
    lastY = y;
    if (!panFrame) {
      panPrev = 0;
      panFrame = requestAnimationFrame(panTick);
    }
  };
  root.style.setProperty("--pan", "0");
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(panFrame);
  });

  // --- Mouse wheel: eased scrolling ------------------------------------------
  if (!reducedMotion()) {
    let wheelTarget = window.scrollY;
    let wheelShown = window.scrollY;
    let wheelFrame = 0;
    const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
    const wheelTick = () => {
      // If the page was moved another way (scrollbar, keyboard), follow it.
      if (Math.abs(window.scrollY - wheelShown) > 4) {
        wheelShown = window.scrollY;
        wheelTarget = wheelShown;
      }
      wheelShown += (wheelTarget - wheelShown) * WHEEL_EASE;
      if (Math.abs(wheelTarget - wheelShown) < 0.5) wheelShown = wheelTarget;
      window.scrollTo({ top: wheelShown, behavior: "instant" });
      wheelFrame =
        wheelShown === wheelTarget ? 0 : requestAnimationFrame(wheelTick);
    };
    const onWheel = (e) => {
      // Leave zoom gestures, horizontal swipes, and the workshop's own panel alone.
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))
        return;
      if (e.target.closest?.(".editor")) return;
      e.preventDefault();
      if (!wheelFrame) {
        wheelShown = window.scrollY;
        wheelTarget = wheelShown;
      }
      const unit =
        e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
      wheelTarget = Math.min(
        maxScroll(),
        Math.max(0, wheelTarget + e.deltaY * unit),
      );
      if (!wheelFrame) wheelFrame = requestAnimationFrame(wheelTick);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    cleanups.push(() => {
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(wheelFrame);
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
