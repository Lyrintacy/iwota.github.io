import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMedia } from "../lib/media.js";
import { onPointer, refreshHover, useHoverRegion } from "../lib/hover.js";
import { DEFAULT_FX } from "../lib/model.js";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const urlCss = (u) => `url("${u}")`;

// First frame of an image, drawn to a canvas. Used as a still picture for a
// hover-only GIF that has no thumbnail. Returns null if it can't be drawn.
function useStill(url, enabled) {
  const [still, setStill] = useState(null);
  useEffect(() => {
    if (!url || !enabled) {
      setStill(null);
      return;
    }
    let live = true;
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        if (live) setStill(c.toDataURL("image/png"));
      } catch {
        if (live) setStill(null);
      }
    };
    img.src = url;
    return () => {
      live = false;
    };
  }, [url, enabled]);
  return still;
}

/** A GIF that only runs while hovered. The thumbnail (or a still) shows otherwise. */
export function HoverGif({ item }) {
  const ref = useRef(null);
  const hovered = useHoverRegion(ref);
  const main = useMedia("gif", item.file);
  const thumb = useMedia("image", item.thumbnail || "");
  const still = useStill(main.url, !thumb.url);
  const poster = thumb.url || still;
  const fit = item.fit || "contain";
  return (
    <div ref={ref} className="hover-box">
      {poster && <img className="media layer" src={poster} alt={item.alt || ""} style={{ objectFit: fit }} />}
      {/* Mounted only while hovered, so the GIF does not run the rest of the time. */}
      {hovered && main.url && (
        <img className="media layer fade-in" src={main.url} alt={item.alt || ""} style={{ objectFit: fit }} />
      )}
    </div>
  );
}

/** A video that plays while hovered and shows its thumbnail otherwise. */
export function HoverVideo({ item }) {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const hovered = useHoverRegion(ref);
  const main = useMedia("video", item.file);
  const thumb = useMedia("image", item.thumbnail || "");
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hovered) v.play().catch(() => {});
    else {
      v.pause();
      v.currentTime = 0; // back to the first frame, so the thumbnail matches
    }
  }, [hovered]);
  return (
    <div ref={ref} className="hover-box">
      <video
        ref={videoRef}
        className="media layer"
        src={main.url || undefined}
        loop={!!item.loop}
        muted
        playsInline
        preload="auto"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {thumb.url && <img className={`media layer poster ${playing ? "is-hidden" : ""}`} src={thumb.url} alt="" />}
    </div>
  );
}

// How big the card is: the button times cardScale, kept on screen as asked.
// fit "x" limits the width, "y" the height, "both" both (the card keeps its shape).
function cardSize(r, scale, fit, pageW, vh) {
  const ratio = r.height / r.width;
  let w = r.width * scale;
  if ((fit === "x" || fit === "both") && w > pageW * 0.9) w = pageW * 0.9;
  let h = w * ratio;
  if ((fit === "y" || fit === "both") && h > vh * 0.9) {
    h = vh * 0.9;
    w = h / ratio;
  }
  return { w, h };
}

const CLOSE_MS = 360; // the card shrinks back this long before it is removed

/**
 * A button: an image (or a GIF made into a button) with a hover sequence. On hover
 * it shakes for shakeMs, flashes white, then a palette-coloured shine sweeps across
 * inside its shape. The card extends from the button (after the flash, or at once),
 * tilts with the cursor, and shrinks back on unhover. A click flashes in colour
 * when there is an action. A GIF button plays once the sequence has ended.
 */
export function ButtonItem({ item, editing }) {
  const isGif = item.type === "gif";
  const fx = { ...DEFAULT_FX, ...(item.fx || {}) };
  const link = item.link || { kind: "none" };
  const hasAction = (link.kind === "url" && !!link.url) || (link.kind === "section" && !!link.section) || fx.card;
  const img = useMedia(isGif ? "gif" : "image", item.file);
  const thumb = useMedia("image", item.thumbnail || "");
  const cardMedia = useMedia("image", fx.cardFile || "");
  const still = useStill(img.url, isGif && !thumb.url);
  const base = isGif ? thumb.url || still : img.url;

  const ref = useRef(null);
  const cardRef = useRef(null);
  const cardShown = useRef(false); // the card counts as part of the hover area while open
  const hovered = useHoverRegion(ref, () =>
    cardShown.current && cardRef.current ? cardRef.current.getBoundingClientRect() : undefined,
  );

  const [phase, setPhase] = useState("idle"); // idle | flash | shine | done
  const [run, setRun] = useState(0);
  const [card, setCard] = useState("none"); // none | open | closing
  const [playGif, setPlayGif] = useState(false);
  const [clicks, setClicks] = useState(0);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // The hover sequence. Times are the variables set in the editor.
  useEffect(() => {
    clearTimers();
    if (!hovered) {
      setPhase("idle");
      setPlayGif(false);
      if (card === "open") {
        setCard("closing");
        later(() => setCard("none"), CLOSE_MS);
      }
      return;
    }
    if (card === "closing") setCard("none"); // back again before it had shrunk away
    setRun((r) => r + 1);
    const flashEnd = fx.flash ? fx.flashMs : 0;
    const shineEnd = flashEnd + (fx.shine ? fx.shineMs : 0);
    setPhase(fx.flash ? "flash" : fx.shine ? "shine" : "done");
    if (fx.flash && fx.shine) later(() => setPhase("shine"), flashEnd);
    later(() => {
      setPhase("done");
      setPlayGif(isGif);
    }, shineEnd);
    if (fx.card) {
      const open = () => setCard("open");
      if (fx.waitFlash) later(open, shineEnd);
      else open();
    }
  }, [hovered]);

  // Keeps the card on the button: it moves on scroll and resizes, and is sized
  // to the screen by the fit setting.
  const place = () => {
    const el = cardRef.current;
    const r = ref.current?.getBoundingClientRect();
    if (!el || !r) return;
    const pageW = ref.current.closest(".canvas")?.clientWidth || window.innerWidth;
    const { w, h } = cardSize(r, fx.cardScale, fx.cardFit, pageW, window.innerHeight);
    el.style.left = `${r.left + r.width / 2 - w / 2}px`;
    el.style.top = `${r.top + r.height / 2 - h / 2}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.setProperty("--k0", String(Math.min(1, r.width / w)));
    refreshHover();
  };
  useLayoutEffect(() => {
    cardShown.current = card === "open";
    if (card === "none") return;
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [card]);

  // The card tilts toward the cursor's position inside the button.
  useEffect(() => {
    if (card === "none") return;
    return onPointer((e) => {
      const r = ref.current?.getBoundingClientRect();
      const el = cardRef.current;
      if (!r || !el) return;
      const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      el.style.setProperty("--rx", `${(-ny * 10).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(nx * 12).toFixed(2)}deg`);
    });
  }, [card]);

  const mask = base ? { WebkitMaskImage: urlCss(base), maskImage: urlCss(base) } : {};
  const fit = item.fit || "contain";
  const flashCol = `var(--color-${fx.cardFlashColour || 3})`;
  const body = (
    <div className={`fx-body ${hovered && fx.shake ? "fx-shake" : ""}`} style={{ "--shake-ms": `${fx.shakeMs}ms` }}>
      {base && <img className="media" src={base} alt={item.alt || ""} style={{ objectFit: fit }} />}
      {isGif && playGif && img.url && (
        <img className="media fade-in" src={img.url} alt={item.alt || ""} style={{ objectFit: fit }} />
      )}
      {fx.flash && phase === "flash" && base && (
        <div className="fx-mask" style={mask}>
          <div className="fx-flash" style={{ animationDuration: `${fx.flashMs}ms` }} />
        </div>
      )}
      {fx.shine && phase === "shine" && base && (
        <div className="fx-mask" key={run} style={mask}>
          <div
            className="fx-shine-band"
            style={{
              "--shine": `var(--color-${fx.shineColour || 4})`,
              "--sw": `${fx.shineWidth}%`,
              animationDuration: `${fx.shineMs}ms`,
            }}
          />
        </div>
      )}
      {clicks > 0 && hasAction && base && (
        <div className="fx-mask" key={clicks} style={mask}>
          <div
            className="fx-soft-flash"
            style={{ "--flash-col": flashCol, animationDuration: `${fx.cardFlashMs}ms` }}
          />
        </div>
      )}
    </div>
  );

  const inner = (
    <div ref={ref} className="fx-root" onClick={() => hasAction && setClicks((c) => c + 1)}>
      {body}
    </div>
  );

  let wrapped = inner;
  if (link.kind === "url" && link.url)
    wrapped = (
      <a
        className="fx-link"
        href={link.url}
        target={link.newTab ? "_blank" : undefined}
        rel={link.newTab ? "noopener noreferrer" : undefined}
        onClick={(e) => editing && e.preventDefault()}
      >
        {inner}
      </a>
    );
  else if (link.kind === "section" && link.section)
    wrapped = (
      <a
        className="fx-link"
        href={`#section-${link.section}`}
        onClick={(e) => {
          e.preventDefault();
          if (editing) return;
          document.getElementById(`section-${link.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        {inner}
      </a>
    );

  // The card lives in the site (so palette variables apply), above everything else.
  const host = ref.current?.closest(".site") || document.body;
  return (
    <>
      {wrapped}
      {card !== "none" &&
        createPortal(
          <div
            ref={cardRef}
            className={`fx-card ${card === "closing" ? "is-closing" : ""}`}
            style={{ "--shake-ms": `${fx.shakeMs}ms` }}
          >
            <img src={cardMedia.url || base || undefined} alt="" />
            <div
              className="fx-soft-flash"
              style={{ "--flash-col": flashCol, animationDuration: `${fx.cardFlashMs}ms` }}
            />
          </div>,
          host,
        )}
    </>
  );
}
