import React from "react";
import { useMedia } from "../lib/media.js";

/** A round badge at the top corner of the tab bar, shown while a card waits for a second press. */
export function HintWidget({ hint, count }) {
  const img = useMedia("image", hint.image || "");
  if (!hint.on || !count) return null;
  const left = hint.side === "left";
  return (
    <div className={`hint-widget ${left ? "side-left" : "side-right"}`} role="status" aria-live="polite">
      {img.url ? (
        <img src={img.url} alt="" />
      ) : hint.message ? (
        <span className="hint-text">{hint.message}</span>
      ) : (
        <span className="hint-arrow">{left ? "\u2190" : "\u2192"}</span>
      )}
    </div>
  );
}
