import React, { useLayoutEffect, useRef, useState } from "react";
import { bandTop, inlineTokens, isBand, itemStyle, pageHeight, panPos, unitFor } from "../lib/model.js";
import { useMedia } from "../lib/media.js";
import { ButtonItem, HoverGif, HoverVideo } from "./Interactive.jsx";

function Text({ item }) {
  const Tag = ["h1", "h2", "h3"].includes(item.level) ? item.level : "p";
  return (
    <Tag
      className={`text-body level-${Tag}`}
      style={{
        textAlign: item.align || "left",
        color: `var(--c-${item.color || "text"})`,
        fontFamily: item.font ? `var(--font-${item.font})` : undefined,
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
      />
    );
  return (
    <img
      className="media"
      src={main.url || undefined}
      alt={item.alt || ""}
      style={{ objectFit: item.fit || "contain" }}
    />
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
  return (
    <div ref={ref} className="media animated">
      <div
        className="animated-tex"
        style={{
          width: diagonal,
          height: diagonal,
          backgroundImage: media.url ? `url("${media.url}")` : undefined,
          backgroundSize: `calc(${tile} * var(--u, 1px)) calc(${tile} * var(--u, 1px))`,
          backgroundRepeat: `${item.repeatX ? "repeat" : "no-repeat"} ${item.repeatY ? "repeat" : "no-repeat"}`,
          backgroundPosition: `${panPos(item.offsetX, item.scrollX, item.speedX)} ${panPos(item.offsetY, item.scrollY, item.speedY)}`,
          transform: `translate(-50%, -50%) rotate(${Number(item.textureRotate) || 0}deg)`,
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
            backgroundImage: `url("${texture.url}")`,
            backgroundSize: `${Math.max(1, tex.size || 0)}px auto`,
            backgroundPosition: `${panPos(tex.offsetX, tex.scrollX, tex.speedX)} ${panPos(tex.offsetY, tex.scrollY, tex.speedY)}`,
            transform: `translate(-50%, -50%) rotate(${tex.rotate || 0}deg)`,
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

/**
 * Layers, bottom to top: band backgrounds, band frames (items parented to a
 * band, clipped to it), the page items, then screen overlays fixed to the
 * viewport. A frame's percentages refer to that frame.
 */
export function Canvas({ page, editing, selectedId, onSelect, selectedSectionId }) {
  const P = pageHeight(page);
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
      {item.type === "gif" && item.hoverOnly && !item.button && <HoverGif item={item} />}
      {item.type === "video" && item.hoverOnly && <HoverVideo item={item} />}
      {(item.type === "image" || item.type === "gif" || item.type === "video") &&
        !(item.hoverOnly || item.button) && <Media item={item} />}
    </div>
  );
  return (
    <>
      <main className={`canvas ${editing ? "editing" : ""}`} style={{ height: P }}>
        {bands.map((s) => (
          <BandBackground
            key={s.id}
            section={s}
            top={bandTop(s, P)}
            selected={editing && selectedSectionId === s.id}
          />
        ))}
        {bands.map((s) => (
          <div
            key={`${s.id}-frame`}
            className="frame band-frame"
            style={{ top: bandTop(s, P), height: s.height }}
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
