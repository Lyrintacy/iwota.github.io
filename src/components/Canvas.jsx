import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BUILTIN_TEXT_STYLES, bandTop, contentLayout, cornerRadius, sectionTop, inlineTokens, isBand, itemStyle, pageHeight, panPos, panShift, styleOf, unitFor } from "../lib/model.js";
import { useMedia } from "../lib/media.js";

// Height / width of a picture (1 until it loads). A texture needs it for its tile's height.
function useImageAspect(url) {
  const [aspect, setAspect] = useState(1);
  useEffect(() => {
    if (!url) return undefined;
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live && img.naturalWidth) setAspect(img.naturalHeight / img.naturalWidth);
    };
    img.src = url;
    return () => {
      live = false;
    };
  }, [url]);
  return aspect;
}
import { ButtonItem, HoverGif, HoverVideo } from "./Interactive.jsx";

// A colour: a palette number, or (older items) a colour role.
const colourOf = (v) => (typeof v === "number" || /^\d+$/.test(String(v)) ? `var(--color-${v})` : `var(--c-${v})`);

// The text styles in use on this tab (set by App).
export const TextStylesContext = createContext(BUILTIN_TEXT_STYLES);

function Text({ item }) {
  const style = styleOf(useContext(TextStylesContext), item.level);
  const Tag = style.tag || "p";
  return (
    <Tag
      className={`text-body level-${Tag}`}
      style={{
        textAlign: item.align || "left",
        color: colourOf(item.color || style.colour),
        // The item's own font, else its style's font, else the site font.
        fontFamily: item.font
          ? `var(--font-${item.font})`
          : style.font
            ? `var(--font-${style.font})`
            : undefined,
        fontSize: `calc(${item.size || style.size} * var(--u, 1px))`,
      }}
    >
      {inlineTokens(item.text).map((t, i) => (
        <span
          key={i}
          style={{
            color: t.color ? `var(--c-${t.color})` : undefined,
            fontWeight: t.bold ? 700 : undefined,
            fontStyle: t.italic ? "italic" : undefined,
          }}
        >
          {t.text}
        </span>
      ))}
    </Tag>
  );
}

function Media({ item }) {
  const main = useMedia(item.type, item.file);
  const poster = useMedia("image", item.poster);
  // A picture with no file is a plain square of the chosen colour, with the same edges.
  if ((item.type === "image" || item.type === "gif") && !String(item.file || "").trim())
    return (
      <div
        className="media plain-square"
        style={{
          background: item.emptyColour ? `var(--color-${item.emptyColour})` : "#ddd",
          borderRadius: cornerRadius(item.radius),
        }}
      />
    );
  if (item.type === "image" && (item.scrollX || item.scrollY)) return <PannedImage item={item} />;
  if (item.type === "video")
    return (
      <video
        className="media"
        src={main.url || undefined}
        poster={poster.url || undefined}
        controls={item.controls !== false}
        loop={!!item.loop}
        autoPlay={!!item.autoplay}
        muted={!!item.autoplay}
        playsInline
        style={{ borderRadius: cornerRadius(item.radius) }}
      />
    );
  return (
    <img
      className="media"
      src={main.url || undefined}
      alt={item.alt || ""}
      style={{ objectFit: item.fit || "contain", borderRadius: cornerRadius(item.radius) }}
    />
  );
}

// A picture that keeps its shape and pans inside its frame. Each panning axis either
// stops at the picture's edges (the room), or repeats endlessly (the picture tiles, and
// the pan wraps). Negative speed moves the other way.
function PannedImage({ item }) {
  const media = useMedia("image", item.file);
  const aspect = useImageAspect(media.url);
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const room = Math.max(0, Number(item.room ?? 20)) / 100;
  // The picture's size on screen (one tile when it repeats).
  const W = Math.max(box.w, box.h / aspect) * (1 + room);
  const H = W * aspect;
  const loopX = !!item.scrollX && !!item.loopX;
  const loopY = !!item.scrollY && !!item.loopY;
  const rangeX = Math.max(0, (W - box.w) / 2);
  const rangeY = Math.max(0, (H - box.h) / 2);
  // The inner layer: one picture across the frame, or one extra tile on each side when it repeats.
  const sizeX = loopX ? box.w + 2 * W : W;
  const sizeY = loopY ? box.h + 2 * H : H;
  // Position on one axis. Repeating: start one tile before the frame, then wrap the pan within a tile.
  // Not repeating: centred, moved by the pan, never past the room.
  const at = (loop, tile, range, offset, pan, speed) =>
    loop
      ? `calc(${-tile}px + ${panShift(offset, pan, speed, `${Math.max(1, tile)}px`)})`
      : `calc(${-range}px + clamp(${-range}px, ${panPos(offset, pan, speed)}, ${range}px))`;
  return (
    <div ref={ref} className="media animated" style={{ borderRadius: cornerRadius(item.radius) }}>
      <div
        className="panned-inner"
        role="img"
        aria-label={item.alt || ""}
        style={{
          width: sizeX,
          height: sizeY,
          backgroundImage: media.url ? `url("${media.url}")` : undefined,
          backgroundSize: `${W}px ${H}px`,
          backgroundRepeat: `${loopX ? "repeat" : "no-repeat"} ${loopY ? "repeat" : "no-repeat"}`,
          backgroundPosition: "0px 0px",
          transform: `translate3d(${at(loopX, W, rangeX, item.offsetX, item.scrollX, item.speedX)}, ${at(loopY, H, rangeY, item.offsetY, item.scrollY, item.speedY)}, 0)`,
          willChange: "transform",
        }}
      />
    </div>
  );
}

// A square box tiled with the image, like a section texture: tile size, offset,
// rotation, per-axis repeat and panning. The tiled layer is sized to the box's
// diagonal and rotated, so the box is always fully covered.
function Animated({ item }) {
  const media = useMedia("image", item.file);
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const tile = Math.max(1, Number(item.tile) || 1);
  const diagonal = Math.ceil(Math.hypot(box.w, box.h));
  // A repeating axis moves by transform (wrapped to one tile); the element is one tile
  // bigger so the wrap never shows an edge. A non-repeating axis keeps the old position.
  const period = `calc(${tile} * var(--u, 1px))`;
  const shiftX = item.repeatX ? panShift(item.offsetX, item.scrollX, item.speedX, period) : "0px";
  const shiftY = item.repeatY ? panShift(item.offsetY, item.scrollY, item.speedY, period) : "0px";
  return (
    <div ref={ref} className="media animated">
      <div
        className="animated-tex"
        style={{
          width: `calc(${diagonal}px + ${2 * tile} * var(--u, 1px))`,
          height: `calc(${diagonal}px + ${2 * tile} * var(--u, 1px))`,
          backgroundImage: media.url ? `url("${media.url}")` : undefined,
          backgroundSize: `${period} ${period}`,
          backgroundRepeat: `${item.repeatX ? "repeat" : "no-repeat"} ${item.repeatY ? "repeat" : "no-repeat"}`,
          backgroundPosition: `${item.repeatX ? "0px" : panPos(item.offsetX, item.scrollX, item.speedX)} ${item.repeatY ? "0px" : panPos(item.offsetY, item.scrollY, item.speedY)}`,
          transform: `translate(-50%, -50%) rotate(${Number(item.textureRotate) || 0}deg) translate(${shiftX}, ${shiftY})`,
          willChange: "transform",
        }}
      />
    </div>
  );
}

// Background band: colour, then a tiled texture, then an overlay colour.
function BandBackground({ section, top, selected }) {
  const tex = section.texture || {};
  const overlay = section.overlay || {};
  const texture = useMedia("image", tex.file);
  const aspect = useImageAspect(texture.url);
  const size = Math.max(1, tex.size || 0);
  // Tiles: `size` wide, and as tall as the picture. Moved by transform, wrapped to one tile.
  const tileW = `${size}px`;
  const tileH = `${size * aspect}px`;
  return (
    <div
      id={`section-${section.id}`}
      className={`section ${selected ? "selected" : ""}`}
      style={{
        top,
        height: section.height,
        background: `var(--color-${section.background})`,
      }}
    >
      {texture.url && (
        <div
          className="section-texture"
          style={{
            width: `calc(150cqmax + ${2 * size}px)`,
            height: `calc(150cqmax + ${2 * size * aspect}px)`,
            backgroundImage: `url("${texture.url}")`,
            backgroundSize: `${tileW} ${tileH}`,
            backgroundPosition: "0px 0px",
            transform: `translate(-50%, -50%) rotate(${tex.rotate || 0}deg) translate(${panShift(tex.offsetX, tex.scrollX, tex.speedX, tileW)}, ${panShift(tex.offsetY, tex.scrollY, tex.speedY, tileH)})`,
            willChange: "transform",
          }}
        />
      )}
      {overlay.colour && (
        <div
          className="section-overlay"
          style={{
            background: `var(--color-${overlay.colour})`,
            opacity: (overlay.opacity || 0) / 100,
          }}
        />
      )}
    </div>
  );
}

// The picture, video or GIF of an item (hover-only and button GIFs are handled apart).
function MediaBody({ item }) {
  return (
    <>
      {item.type === "gif" && item.hoverOnly && !item.button && <HoverGif item={item} />}
      {item.type === "video" && item.hoverOnly && <HoverVideo item={item} />}
      {(item.type === "image" || item.type === "gif" || item.type === "video") &&
        !(item.hoverOnly || item.button) && <Media item={item} />}
    </>
  );
}

// A caption below, above or over the bottom of a picture. Without a caption the
// picture is rendered exactly as before.
function Captioned({ item, children }) {
  const text = String(item.caption || "").trim();
  const picture = item.type === "image" || item.type === "gif" || item.type === "video";
  if (!picture || item.button || !text) return <>{children}</>;
  const pos = item.captionPosition || "below";
  const automatic = item.captionColour === "" || item.captionColour == null;
  const colour = automatic ? (pos === "over" ? "#fff" : undefined) : `var(--color-${item.captionColour})`;
  const caption = (
    <div
      className={`caption caption-${pos}`}
      style={{ color: colour, "--caption-size": Number(item.captionSize) || 14 }}
    >
      {text}
    </div>
  );
  if (pos === "over")
    return (
      <>
        {children}
        {caption}
      </>
    );
  return (
    <div className="captioned">
      {pos === "above" && caption}
      <div className="captioned-media">{children}</div>
      {pos === "below" && caption}
    </div>
  );
}

/**
 * Layers, bottom to top: band backgrounds, band frames (items parented to a
 * band, clipped to it), the page items, then screen overlays fixed to the
 * viewport. A frame's percentages refer to that frame.
 */
export function Canvas({ page, editing, selectedId, onSelect, selectedSectionId }) {
  const P = pageHeight(page);
  const layout = contentLayout(page.sections || []);
  const sections = page.sections || [];
  const bands = sections.filter(isBand);
  const fixed = sections.filter((s) => !isBand(s));
  const itemsIn = (parent) => page.items.filter((i) => (i.parent || "") === parent);
  const renderItem = (item) => (
    <div
      key={item.id}
      className={`item item-${item.type} ${selectedId === item.id ? "selected" : ""}`}
      style={{ ...itemStyle(item), "--u": unitFor(item, page.canvas) }}
      onClick={
        editing
          ? (e) => {
              e.stopPropagation();
              onSelect(item.id);
            }
          : undefined
      }
    >
      {item.type === "text" && <Text item={item} />}
      {item.type === "animated" && <Animated item={item} />}
      {(item.type === "button" || (item.type === "gif" && item.button)) && (
        <ButtonItem item={item} editing={editing} />
      )}
      <Captioned item={item}>
        <MediaBody item={item} />
      </Captioned>
    </div>
  );
  return (
    <>
      <main className={`canvas ${editing ? "editing" : ""}`} style={{ height: P }}>
        {bands.map((s) => (
          <BandBackground
            key={s.id}
            section={s}
            top={sectionTop(s, P, layout.tops)}
            selected={editing && selectedSectionId === s.id}
          />
        ))}
        {bands.map((s) => (
          <div
            key={`${s.id}-frame`}
            className="frame band-frame"
            style={{ top: sectionTop(s, P, layout.tops), height: s.height }}
          >
            {itemsIn(s.id).map(renderItem)}
          </div>
        ))}
        <div className="frame page-frame" style={{ height: P }}>
          {itemsIn("").map(renderItem)}
        </div>
      </main>
      {fixed.map((s) => (
        <div
          key={`${s.id}-frame`}
          className={`frame fixed-frame ${editing && selectedSectionId === s.id ? "selected" : ""}`}
        >
          {itemsIn(s.id).map(renderItem)}
        </div>
      ))}
    </>
  );
}
