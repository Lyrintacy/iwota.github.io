import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useMedia } from "../lib/media.js";

/**
 * A round badge placed a small distance below the centre of the button that waits for
 * its second press. Shows the picture if set, else the message, else an arrow.
 */
export function HintWidget({ hint, count, el, style }) {
  const img = useMedia("image", hint.image || "");
  const box = useRef(null);
  const visible = !!(hint.on && count && el);
  const distance = Number(hint.distance) || 0;

  // Follow the button while it is shown (it can scroll or move with the page).
  useEffect(() => {
    if (!visible) return undefined;
    let frame;
    const place = () => {
      const node = box.current;
      if (node && el.isConnected) {
        const r = el.getBoundingClientRect();
        node.style.left = `${r.left + r.width / 2}px`;
        node.style.top = `${r.top + r.height / 2 + distance}px`;
      }
      frame = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [visible, el, distance]);

  if (!visible) return null;
  const left = hint.side === "left";
  // In the body, so nothing on the page can cover it.
  return createPortal(
    <div ref={box} className="hint-widget" style={style} role="status" aria-live="polite">
      {img.url ? (
        <img src={img.url} alt="" />
      ) : hint.message ? (
        <span className="hint-text">{hint.message}</span>
      ) : (
        <span className="hint-arrow">{left ? "\u2190" : "\u2192"}</span>
      )}
    </div>,
    document.body,
  );
}
