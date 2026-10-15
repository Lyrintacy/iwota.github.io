import React from "react";
import { inlineTokens, itemStyle, mediaUrl } from "../lib/model.js";

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
  if (item.type === "video")
    return (
      <video
        className="media"
        src={mediaUrl(item) || undefined}
        poster={mediaUrl({ type: "image", file: item.poster }) || undefined}
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
      src={mediaUrl(item) || undefined}
      alt={item.alt || ""}
      style={{ objectFit: item.fit || "contain" }}
    />
  );
}

export function Canvas({ page, editing, selectedId, onSelect }) {
  return (
    <main className={`canvas ${editing ? "editing" : ""}`} style={{ height: page.canvas.height }}>
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
