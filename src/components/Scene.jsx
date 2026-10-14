import React, { useEffect, useRef } from "react";
import { safeUrl } from "../lib/config.js";

// Defaults used when a scene section omits a setting. The real values live in
// public/config/pages/*.json under `scene`.
const DEFAULT_BORDERS = {
  enabled: true,
  left: "",
  right: "",
  width: 140,
  mobileWidth: 48,
  speed: 0.5,
  leftDirection: "up",
  rightDirection: "down",
};

const backgroundImage = (src) =>
  `url("${safeUrl(src, true).replaceAll('"', "%22")}")`;

/**
 * A scroll-driven stage. Two long border images are repeated vertically
 * (background-repeat: repeat-y), so they recycle seamlessly as you scroll.
 * Left moves up and right moves down while scrolling down; scrolling up
 * reverses both, because the offset simply follows window.scrollY.
 */
export function Scene({ section, visuals, reduced }) {
  const cfg = section.scene || {};
  const borders = { ...DEFAULT_BORDERS, ...(cfg.borders || {}) };
  const background = cfg.background || "primary";
  const left = useRef(null),
    right = useRef(null);
  const { enabled, speed, leftDirection, rightDirection } = borders;

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const offset = reduced ? 0 : window.scrollY * speed;
      // "up" = negative background offset, "down" = positive.
      if (left.current)
        left.current.style.backgroundPositionY = `${leftDirection === "down" ? offset : -offset}px`;
      if (right.current)
        right.current.style.backgroundPositionY = `${rightDirection === "down" ? offset : -offset}px`;
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [enabled, speed, leftDirection, rightDirection, reduced]);

  const leftSrc = borders.left || visuals.leftBorder;
  const rightSrc = borders.right || visuals.rightBorder;

  return (
    <section
      id={section.id}
      data-section={section.id}
      className={`scene scene-${background}`}
      style={{
        minHeight: cfg.minHeight || 900,
        "--scene-width": `${borders.width}px`,
        "--scene-width-mobile": `${borders.mobileWidth}px`,
      }}
    >
      {enabled && (
        <>
          <div
            ref={left}
            className="scene-border scene-border-left"
            style={{ backgroundImage: backgroundImage(leftSrc) }}
            aria-hidden="true"
          />
          <div
            ref={right}
            className="scene-border scene-border-right"
            style={{ backgroundImage: backgroundImage(rightSrc) }}
            aria-hidden="true"
          />
        </>
      )}
      {/* Blank for now. Blocks and new content are added here later. */}
      <div className="scene-inner" />
    </section>
  );
}

export default Scene;
