import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMedia } from "../lib/media.js";
import { onPointer, useHoverRegion } from "../lib/hover.js";

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

/**
 * A button: an image (or a GIF with "make it a button") with a hover sequence:
 * it shakes, flashes white, a palette-coloured shine sweeps across inside its
 * shape, then (optionally) a larger card opens over the page, tilting with the
 * cursor. A GIF button starts playing after the sequence. Clicking follows the link.
 */
export function ButtonItem({ item, editing }) {
  const isGif = item.type === "gif";
  const fx = { shake: true, flash: true, shine: true, shineColour: 4, card: true, cardScale: 2.5, cardFile: "", ...(item.fx || {}) };
  const link = item.link || { kind: "none" };
  const img = useMedia(isGif ? "gif" : "image", item.file);
  const thumb = useMedia("image", item.thumbnail || "");
  const cardMedia = useMedia("image", fx.cardFile || "");
  const still = useStill(img.url, isGif && !thumb.url);
  const base = isGif ? thumb.url || still : img.url;

  const ref = useRef(null);
  const cardRef = useRef(null);
  const hovered = useHoverRegion(ref, cardRef);
  const [phase, setPhase] = useState("idle"); // idle | flash | shine | done
  const [run, setRun] = useState(0);
  const [cardBox, setCardBox] = useState(null);
  const [playGif, setPlayGif] = useState(false);

  useEffect(() => {
    if (!hovered) {
      setPhase("idle");
      setCardBox(null);
      setPlayGif(false);
      return;
    }
    setRun((r) => r + 1);
    setPhase(fx.flash ? "flash" : "shine");
    const toShine = setTimeout(() => setPhase("shine"), 300);
    const toDone = setTimeout(() => {
      setPhase("done");
      setPlayGif(isGif);
      const r = ref.current?.getBoundingClientRect();
      if (fx.card && r) {
        const w = Math.min(r.width * fx.cardScale, window.innerWidth * 0.9);
        const h = w * (r.height / r.width);
        setCardBox({ x: r.left + r.width / 2 - w / 2, y: r.top + r.height / 2 - h / 2, w, h });
      }
    }, 1000);
    return () => {
      clearTimeout(toShine);
      clearTimeout(toDone);
    };
  }, [hovered]);

  // The card tilts toward the cursor's position inside the button.
  useEffect(() => {
    if (!cardBox) return;
    return onPointer((e) => {
      const r = ref.current?.getBoundingClientRect();
      const el = cardRef.current;
      if (!r || !el) return;
      const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      el.style.setProperty("--rx", `${(-ny * 10).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(nx * 12).toFixed(2)}deg`);
    });
  }, [cardBox]);

  const mask = base ? { WebkitMaskImage: urlCss(base), maskImage: urlCss(base) } : {};
  const fit = item.fit || "contain";
  const body = (
    <div className={`fx-body ${hovered && fx.shake ? "fx-shake" : ""}`}>
      {base && <img className="media" src={base} alt={item.alt || ""} style={{ objectFit: fit }} />}
      {isGif && playGif && img.url && (
        <img className="media fade-in" src={img.url} alt={item.alt || ""} style={{ objectFit: fit }} />
      )}
      {fx.flash && phase === "flash" && base && (
        <div className="fx-mask" style={mask}>
          <div className="fx-flash" />
        </div>
      )}
      {fx.shine && phase === "shine" && base && (
        <div className="fx-mask" key={run} style={mask}>
          <div className="fx-shine-band" style={{ "--shine": `var(--color-${fx.shineColour || 4})` }} />
        </div>
      )}
    </div>
  );

  const inner = (
    <div ref={ref} className="fx-root">
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
          document
            .getElementById(`section-${link.section}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        {inner}
      </a>
    );

  return (
    <>
      {wrapped}
      {cardBox &&
        createPortal(
          <div
            ref={cardRef}
            className="fx-card"
            style={{ left: cardBox.x, top: cardBox.y, width: cardBox.w, height: cardBox.h }}
          >
            <img src={cardMedia.url || base || undefined} alt="" />
          </div>,
          document.body,
        )}
    </>
  );
}
