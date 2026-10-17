import React, { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMedia } from "../lib/media.js";
import { onPointer, refreshHover, useHoverRegion } from "../lib/hover.js";
import { DEFAULT_FX, DEFAULT_LINK } from "../lib/model.js";
import { NavContext, pageHref } from "../lib/nav.js";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const urlCss = (u) => `url("${u}")`;
const colourVar = (n) => (n ? `var(--color-${n})` : "#fff");

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

/**
 * A button: an image (or a GIF made into a button) with a hover sequence.
 * Hover (or, on touch screens, a tap) starts it: the picture shakes once, flashes,
 * and a band sweeps across inside its shape, independently of the flash. The card
 * extends from the button, wobbles and shines, tilts with the cursor, and shrinks
 * back on unhover. A click flashes in colour when there is an action. On touch,
 * a tap acts as hover; another tap, or a tap elsewhere, or scrolling, ends it.
 */
export function ButtonItem({ item, editing }) {
  const navigate = useContext(NavContext);
  const isGif = item.type === "gif";
  const fx = { ...DEFAULT_FX, ...(item.fx || {}) };
  const link = item.link || DEFAULT_LINK;
  const hasLink =
    (link.kind === "url" && !!link.url) ||
    (link.kind === "section" && !!link.section) ||
    (link.kind === "page" && !!link.page);
  const hasAction = hasLink || fx.card;
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
  const [pinned, setPinned] = useState(false); // touch: tapped on
  const touch = useRef(false); // the last pointer was a finger or pen
  const active = hovered || pinned;

  const [flashing, setFlashing] = useState(false);
  const [shining, setShining] = useState(false);
  const [run, setRun] = useState(0); // restarts the band on each hover
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

  // The hover sequence. Each step has its own start and length (the variables).
  useEffect(() => {
    clearTimers();
    if (!active) {
      setFlashing(false);
      setShining(false);
      setPlayGif(false);
      if (card === "open") {
        setCard("closing");
        later(() => setCard("none"), fx.cardCloseMs);
      }
      return;
    }
    if (card === "closing") setCard("none"); // back before it had shrunk away
    setRun((r) => r + 1);
    const flashEnd = fx.flash ? fx.flashMs : 0;
    const shineStart = fx.shine ? fx.shineDelayMs : 0;
    const shineEnd = fx.shine ? shineStart + fx.shineMs : 0;
    if (fx.flash) {
      setFlashing(true);
      later(() => setFlashing(false), flashEnd);
    }
    if (fx.shine) {
      if (shineStart > 0) later(() => setShining(true), shineStart);
      else setShining(true);
      later(() => setShining(false), shineEnd);
    }
    later(() => setPlayGif(isGif), Math.max(flashEnd, shineEnd));
    if (fx.card) later(() => setCard("open"), fx.waitFlash ? flashEnd : 0);
  }, [active]);

  // Touch: the tap-on stays until another tap elsewhere, a scroll, or a second tap.
  useEffect(() => {
    if (!pinned) return;
    const outside = (e) => {
      if (ref.current?.contains(e.target) || cardRef.current?.contains(e.target)) return;
      setPinned(false);
    };
    const moved = () => setPinned(false);
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", moved, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", moved);
    };
  }, [pinned]);

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
    if (card === "none" || !fx.cardTilt) return;
    const k = Math.max(0, fx.cardTiltStrength) / 100;
    return onPointer((e) => {
      const r = ref.current?.getBoundingClientRect();
      const el = cardRef.current;
      if (!r || !el) return;
      const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      el.style.setProperty("--rx", `${(-ny * 10 * k).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(nx * 12 * k).toFixed(2)}deg`);
    });
  }, [card, fx.cardTilt, fx.cardTiltStrength]);

  // A tap in the page: a touch screen has no hover, so a tap acts as hover.
  const onPointerDown = (e) => {
    touch.current = e.pointerType !== "mouse";
  };
  const onTap = (e) => {
    if (editing) return;
    if (hasAction && fx.clickFlash) setClicks((c) => c + 1);
    // A link button follows its link at once. Without a link, a tap acts as hover:
    // the first tap starts it, the next one ends it.
    if (!touch.current || hasLink) return;
    e.preventDefault();
    setPinned((p) => !p);
  };

  const mask = base ? { WebkitMaskImage: urlCss(base), maskImage: urlCss(base) } : {};
  const cardPicture = cardMedia.url || base;
  const cardMask = cardPicture ? { WebkitMaskImage: urlCss(cardPicture), maskImage: urlCss(cardPicture) } : {};
  const fit = item.fit || "contain";
  const flashColour = colourVar(fx.flashColour);
  const body = (
    <div
      className={`fx-body ${active && fx.shake ? "fx-shake" : ""}`}
      style={{ "--shake-ms": `${fx.shakeMs}ms`, "--shake-k": String(fx.shakeAmount / 100) }}
    >
      {base && <img className="media" src={base} alt={item.alt || ""} style={{ objectFit: fit }} />}
      {isGif && playGif && img.url && (
        <img className="media fade-in" src={img.url} alt={item.alt || ""} style={{ objectFit: fit }} />
      )}
      {fx.flash && flashing && base && (
        <div className="fx-mask" style={mask}>
          <div
            className="fx-flash"
            style={{
              "--flash-col": flashColour,
              "--flash-peak": String(fx.flashStrength / 100),
              animationDuration: `${fx.flashMs}ms`,
            }}
          />
        </div>
      )}
      {fx.shine && shining && base && (
        <div className="fx-mask" key={run} style={mask}>
          <div
            className="fx-shine-band"
            style={{
              "--shine": `var(--color-${fx.shineColour || 4})`,
              "--sw": `${fx.shineWidth}%`,
              "--slant": `${fx.shineSlant}deg`,
              animationDuration: `${fx.shineMs}ms`,
            }}
          />
        </div>
      )}
      {clicks > 0 && hasAction && fx.clickFlash && base && (
        <div className="fx-mask" key={clicks} style={mask}>
          <div
            className="fx-soft-flash"
            style={{ "--flash-col": `var(--color-${fx.cardFlashColour || 3})`, animationDuration: `${fx.cardFlashMs}ms` }}
          />
        </div>
      )}
    </div>
  );

  const inner = (
    <div ref={ref} className="fx-root" onPointerDown={onPointerDown} onClick={onTap}>
      {body}
    </div>
  );

  // The link: a web address, the top of a section, or another tab.
  const linkTo = (e) => {
    if (editing) {
      e.preventDefault();
      return;
    }
    if (e.defaultPrevented) return;
    if (link.kind === "section" && link.section) {
      e.preventDefault();
      document.getElementById(`section-${link.section}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (link.kind === "page" && link.page) {
      if (link.newTab || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      navigate(link.page);
    }
  };
  let wrapped = inner;
  if (hasLink && link.kind !== "none") {
    const href =
      link.kind === "url"
        ? link.url
        : link.kind === "page"
          ? pageHref(link.page)
          : `#section-${link.section}`;
    const newTab = link.kind === "url" || link.kind === "page" ? !!link.newTab : false;
    wrapped = (
      <a
        className="fx-link"
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        onClick={linkTo}
      >
        {inner}
      </a>
    );
  }

  // The card lives in the site (so palette variables apply), above everything else.
  const host = card !== "none" ? ref.current?.closest(".site") || document.body : null;
  const closing = card === "closing";
  return (
    <>
      {wrapped}
      {card !== "none" &&
        createPortal(
          <div
            ref={cardRef}
            className={`fx-card ${closing ? "is-closing" : ""} ${fx.cardShake && !closing ? "fx-card-shake" : ""}`}
            style={{
              "--card-bg": fx.cardBackground ? `var(--color-${fx.cardBackground})` : "transparent",
              "--shake-ms": `${fx.cardShakeMs}ms`,
              "--shake-k": String(fx.cardShakeAmount / 100),
              "--open-ms": `${fx.cardOpenMs}ms`,
              "--close-ms": `${fx.cardCloseMs}ms`,
              "--radius": `${fx.cardRadius}px`,
            }}
          >
            <img
              src={cardMedia.url || base || undefined}
              alt=""
              style={{ objectFit: fx.cardImageFit || "cover" }}
            />
            {/* The band and flash follow the picture's shape, so a transparent PNG is respected */}
            {(fx.cardShine || fx.cardFlash) && !closing && (cardMedia.url || base) && (
              <div className="fx-mask" style={cardMask}>
                {fx.cardShine && (
                  <div
                    className="fx-shine-band fx-card-shine"
                    style={{
                      "--shine": `var(--color-${fx.cardShineColour || 4})`,
                      "--sw": `${fx.cardShineWidth}%`,
                      "--slant": `${fx.shineSlant}deg`,
                      animationDuration: `${fx.cardShineMs}ms`,
                    }}
                  />
                )}
                {fx.cardFlash && (
                  <div
                    className="fx-soft-flash"
                    style={{
                      "--flash-col": `var(--color-${fx.cardFlashColour || 3})`,
                      animationDuration: `${fx.cardFlashMs}ms`,
                    }}
                  />
                )}
              </div>
            )}
          </div>,
          host,
        )}
    </>
  );
}
