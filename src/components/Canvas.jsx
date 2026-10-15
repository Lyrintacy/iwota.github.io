import React from "react";
import { inlineTokens, itemStyle, pageHeight } from "../lib/model.js";
import { useMedia } from "../lib/media.js";

function Text({ item }) {
  const Tag = ["h1", "h2", "h3"].includes(item.level) ? item.level : "p";
  return (
    <Tag
      className={`text-body level-${Tag}`}
      style={{ textAlign: item.align || "left", color: `var(--c-${item.color || "text"})` }}
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

// Background band: colour, then a tiled texture, then an overlay colour.
// The section clips everything to its own box.
function SectionLayer({ section, selected }) {
  const tex = section.texture || {};
  const overlay = section.overlay || {};
  const texture = useMedia("image", tex.file);
  return (
    <div
      className={`section ${selected ? "selected" : ""}`}
      style={{
        top: section.start,
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
            backgroundPosition: `${tex.offsetX || 0}px ${tex.offsetY || 0}px`,
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

export function Canvas({ page, editing, selectedId, onSelect, selectedSectionId }) {
  return (
    <main className={`canvas ${editing ? "editing" : ""}`} style={{ height: pageHeight(page) }}>
      {(page.sections || []).map((section) => (
        <SectionLayer
          key={section.id}
          section={section}
          selected={editing && selectedSectionId === section.id}
        />
      ))}
      {page.items.map((item) => (
        <div
          key={item.id}
          className={`item item-${item.type} ${selectedId === item.id ? "selected" : ""}`}
          style={itemStyle(item)}
          onClick={
            editing
              ? (e) => {
                  e.stopPropagation();
                  onSelect(item.id);
                }
              : undefined
          }
        >
          {item.type === "text" ? <Text item={item} /> : <Media item={item} />}
        </div>
      ))}
    </main>
  );
}
