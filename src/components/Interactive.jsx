import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMedia } from "../lib/media.js";
import { onPointer, refreshHover, useHoverRegion } from "../lib/hover.js";
import { DEFAULT_CARD, DEFAULT_FX, DEFAULT_LINK, cardsOf, cornerRadius } from "../lib/model.js";
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
      {poster && (
        <img
          className="media layer"
          src={poster}
          alt={item.alt || ""}
          style={{ objectFit: fit, borderRadius: cornerRadius(item.radius) }}
        />
      )}
      {/* Mounted only while hovered, so the GIF does not run the rest of the time. */}
      {hovered && main.url && (
        <img
          className="media layer fade-in"
          src={main.url}
          alt={item.alt || ""}
          style={{ objectFit: fit, borderRadius: cornerRadius(item.radius) }}
        />
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
        style={{ borderRadius: cornerRadius(item.radius) }}
        loop={!!item.loop}
        muted
        playsInline
        preload="auto"
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {thumb.url && (
        <img
          className={`media layer poster ${playing ? "is-hidden" : ""}`}
          src={thumb.url}
          alt=""
          style={{ borderRadius: cornerRadius(item.radius) }}
        />
      )}
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

// Site-wide two-press setting: { touch, pc }. Set by App from General settings.
export const ButtonRulesContext = createContext({ touch: false, pc: false });
// Buttons that wait for a second press register here, so the hint can show. Set by App.
export const WaitContext = createContext({ add() {}, remove() {} }); // add(key, element)

// The union of several rectangles (the open cards), for hover.
function unionRect(rects) {
  if (!rects.length) return undefined;
  return {
    left: Math.min(...rects.map((r) => r.left)),
    top: Math.min(...rects.map((r) => r.top)),
    right: Math.max(...rects.map((r) => r.right)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
  };
}

/**
 * A button: an image (or a GIF made into a button) with a hover sequence.
 * Hover (or, on touch screens, a tap) starts it: the picture shakes once, flashes,
 * and a band sweeps across inside its shape, independently of the flash. The cards
 * (fx.cards) open over the button together, wobble and shine, tilt with the cursor,
 * and shrink back on unhover. A clickable card counts as a click on the button; a
 * card that is not clickable lets clicks pass through to what is under it.
 * On touch, a tap acts as hover; another tap, or a tap elsewhere, or scrolling, ends it.
 */
export function ButtonItem({ item, editing }) {
  const navigate = useContext(NavContext);
  const isGif = item.type === "gif";
  const fx = { ...DEFAULT_FX, ...(item.fx || {}) };
  const cards = cardsOf(item.fx || {});
  const clickCard = cards[0] || DEFAULT_CARD; // the button's click flash uses the first card's colour
  const link = item.link || DEFAULT_LINK;
  const hasLink =
    (link.kind === "url" && !!link.url) ||
    (link.kind === "section" && !!link.section) ||
    (link.kind === "page" && !!link.page);
  const hasAction = hasLink || cards.length > 0;
  const img = useMedia(isGif ? "gif" : "image", item.file);
  const thumb = useMedia("image", item.thumbnail || "");
  const still = useStill(img.url, isGif && !thumb.url);
  const base = isGif ? thumb.url || still : img.url;

  const ref = useRef(null);
  const cardEls = useRef(new Set()); // the elements of the open cards
  const cardShown = useRef(false); // the cards count as part of the hover area while open
  const hovered = useHoverRegion(ref, () => {
    if (!cardShown.current || cardEls.current.size === 0) return undefined;
    return unionRect([...cardEls.current].map((el) => el.getBoundingClientRect()));
  });
  const [pinned, setPinned] = useState(false); // touch: tapped on
  const touch = useRef(false); // the last pointer was a finger or pen
  const active = hovered || pinned;
  const rules = useContext(ButtonRulesContext);
  const waiting = useContext(WaitContext);
  const waitKey = useRef({}).current; // this button's entry in the waiting list
  const opening = useRef(false); // this press opened the card: its link must not follow
  // Two presses: the first press opens the card, the second clicks. Per pointer type.
  const twoPressNow = () => (touch.current ? rules.touch : rules.pc) && cards.length > 0;

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
        later(() => setCard("none"), Math.max(0, ...cards.map((c) => c.closeMs)));
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
    // A two-press button opens on its first press, not on hover. Each card waits for the flash itself.
    if (cards.length && !(twoPressNow() && !pinned)) setCard("open");
  }, [active]);

  // Touch: the tap-on stays until another tap elsewhere, a scroll, or a second tap.
  useEffect(() => {
    if (!pinned) return;
    const outside = (e) => {
      if (ref.current?.contains(e.target)) return;
      if ([...cardEls.current].some((el) => el.contains(e.target))) return;
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

  // The first press of a two-press button opens its card, and the hint waits for the second.
  useEffect(() => {
    if (pinned && cards.length) setCard((c) => (c === "open" ? c : "open"));
  }, [pinned]);
  const waitingNow = pinned && twoPressNow();
  useEffect(() => {
    if (waitingNow) waiting.add(waitKey, ref.current);
    else waiting.remove(waitKey);
  }, [waitingNow]);
  useEffect(() => () => waiting.remove(waitKey), []);

  // Runs after the cards have placed themselves, so the hover area includes them.
  useLayoutEffect(() => {
    cardShown.current = card === "open";
    refreshHover();
  }, [card]);

  // A tap in the page: a touch screen has no hover, so a tap acts as hover.
  const onPointerDown = (e) => {
    touch.current = e.pointerType !== "mouse";
  };
  const onTap = (e) => {
    if (editing) return;
    // Two presses: the first opens the card (and its link waits), the second acts.
    if (twoPressNow() && !pinned) {
      opening.current = true;
      setPinned(true);
      return;
    }
    opening.current = false;
    if (hasAction && fx.clickFlash) setClicks((c) => c + 1);
    // A link button follows its link at once. Without a link, a tap acts as hover:
    // the first tap starts it, the next one ends it.
    if (!touch.current || hasLink || twoPressNow()) return;
    e.preventDefault();
    setPinned((p) => !p);
  };
  // A click on a clickable card is a click on the button: the same link, flash and tap.
  const onCardClick = () => {
    if (editing) return;
    ref.current?.click();
  };

  const mask = base ? { WebkitMaskImage: urlCss(base), maskImage: urlCss(base) } : {};
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
            style={{ "--flash-col": `var(--color-${clickCard.flashColour || 3})`, animationDuration: `${clickCard.flashMs}ms` }}
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
    if (opening.current) {
      e.preventDefault(); // the first press of a two-press button only opens the card
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

  // The cards live in the site (so palette variables apply), above everything else.
  // They open in list order, so a later card is on top of an earlier one.
  const host = card !== "none" ? ref.current?.closest(".site") || document.body : null;
  const closing = card === "closing";
  return (
    <>
      {wrapped}
      {card !== "none" &&
        createPortal(
          cards.map((c, i) => (
            <CardView
              key={i}
              c={c}
              base={base}
              buttonRef={ref}
              cardEls={cardEls}
              closing={closing}
              clickFlash={fx.clickFlash}
              waitMs={fx.flash ? fx.flashMs : 0}
              onDown={onPointerDown}
              onClick={onCardClick}
            />
          )),
          host,
        )}
    </>
  );
}

/**
 * One card over a button. Its settings are one entry of the button's fx.cards.
 * Clicks pass through it unless it is clickable; a clickable card flashes on click.
 */
function CardView({ c, base, buttonRef, cardEls, closing, clickFlash, waitMs, onDown, onClick }) {
  const ref = useRef(null);
  // A card that waits for the flash stays hidden until it has finished.
  const wait = c.waitFlash && waitMs > 0;
  const [started, setStarted] = useState(!wait);
  useEffect(() => {
    if (started) return;
    const t = setTimeout(() => setStarted(true), waitMs);
    return () => clearTimeout(t);
  }, []);
  // A card picture can be a still or an animated GIF (an <img> plays a GIF by itself).
  const media = useMedia("picture", c.file || "");
  const picture = media.url || base;
  const mask = picture ? { WebkitMaskImage: urlCss(picture), maskImage: urlCss(picture) } : {};
  const [clicks, setClicks] = useState(0);

  // Sized and kept on its button: it moves on scroll and resize, and fits the
  // screen by the fit setting.
  const place = () => {
    const el = ref.current;
    const r = buttonRef.current?.getBoundingClientRect();
    if (!el || !r) return;
    const pageW = buttonRef.current.closest(".canvas")?.clientWidth || window.innerWidth;
    const { w, h } = cardSize(r, c.scale, c.fit, pageW, window.innerHeight);
    el.style.left = `${r.left + r.width / 2 - w / 2}px`;
    el.style.top = `${r.top + r.height / 2 - h / 2}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.setProperty("--k0", String(Math.min(1, r.width / w)));
    refreshHover();
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    cardEls.current.add(el);
    place();
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      cardEls.current.delete(el);
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [started]);

  // The card tilts toward the cursor's position inside the button.
  useEffect(() => {
    if (!c.tilt) return;
    const k = Math.max(0, c.tiltStrength) / 100;
    return onPointer((e) => {
      const r = buttonRef.current?.getBoundingClientRect();
      const el = ref.current;
      if (!r || !el) return;
      const nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      const ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      el.style.setProperty("--rx", `${(-ny * 10 * k).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(nx * 12 * k).toFixed(2)}deg`);
    });
  }, [c.tilt, c.tiltStrength]);

  const handleClick = () => {
    if (!c.clickable) return;
    if (clickFlash) setClicks((n) => n + 1);
    onClick();
  };

  if (!started) return null;
  return (
    <div
      ref={ref}
      className={`fx-card ${closing ? "is-closing" : ""} ${c.shake && !closing ? "fx-card-shake" : ""}`}
      style={{
        pointerEvents: c.clickable ? "auto" : "none",
        cursor: c.clickable ? "pointer" : undefined,
        "--card-bg": c.background ? `var(--color-${c.background})` : "transparent",
        "--shake-ms": `${c.shakeMs}ms`,
        "--shake-k": String(c.shakeAmount / 100),
        "--open-ms": `${c.openMs}ms`,
        "--close-ms": `${c.closeMs}ms`,
        "--radius": `${c.radius}px`,
      }}
      onPointerDown={onDown}
      onClick={handleClick}
    >
      <img src={picture || undefined} alt="" style={{ objectFit: c.imageFit || "cover" }} />
      {/* The band and flash follow the picture's shape, so a transparent PNG is respected */}
      {(c.shine || c.flash) && !closing && picture && (
        <div className="fx-mask" style={mask}>
          {c.shine && (
            <div
              className="fx-shine-band fx-card-shine"
              style={{
                "--shine": `var(--color-${c.shineColour || 4})`,
                "--sw": `${c.shineWidth}%`,
                "--slant": `${c.slant}deg`,
                animationDuration: `${c.shineMs}ms`,
              }}
            />
          )}
          {c.flash && (
            <div
              className="fx-soft-flash"
              style={{
                "--flash-col": `var(--color-${c.flashColour || 3})`,
                animationDuration: `${c.flashMs}ms`,
              }}
            />
          )}
        </div>
      )}
      {clicks > 0 && picture && (
        <div className="fx-mask" key={clicks} style={mask}>
          <div
            className="fx-soft-flash"
            style={{ "--flash-col": `var(--color-${c.flashColour || 3})`, animationDuration: `${c.flashMs}ms` }}
          />
        </div>
      )}
    </div>
  );
}
