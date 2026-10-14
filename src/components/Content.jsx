import React from "react";
import { safeUrl, effectClasses } from "../lib/config.js";

// Deliberately small rich-text syntax. No raw HTML or scriptable links.
export function RichText({ text = "" }) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link)
        return safeUrl(link[2]) ? (
          <a
            key={i}
            href={safeUrl(link[2])}
            target={/^https?:/.test(link[2]) ? "_blank" : undefined}
            rel="noreferrer"
          >
            {link[1]}
          </a>
        ) : (
          <span key={i}>{link[1]}</span>
        );
      return part;
    });
}
export function Media({ block, effects }) {
  const sliced =
    block.kind !== "video" && block.slice?.mode && block.slice.mode !== "none";
  const slice = [...(block.slice?.insets || [24, 24, 24, 24])];
  if (block.slice?.mode === "three-horizontal") slice[0] = slice[2] = 0;
  if (block.slice?.mode === "three-vertical") slice[1] = slice[3] = 0;
  const style = {
    "--media-max": `${block.maxWidth || 760}px`,
    "--media-height": `${block.maxHeight || 480}px`,
    "--media-ratio": `${block.maxWidth || 760} / ${block.maxHeight || 480}`,
    marginTop: block.margin?.[0],
    marginBottom: block.margin?.[2],
    paddingRight: block.margin?.[1],
    paddingLeft: block.margin?.[3],
  };
  return (
    <figure
      className={`media media-${block.align || "center"} ${effectClasses(block.effects, effects)}`}
      style={style}
    >
      {sliced ? (
        <div
          className="sliced-image"
          role="img"
          aria-label={block.alt || ""}
          style={{
            borderStyle: "solid",
            borderColor: "transparent",
            borderWidth: slice.map((n) => `${n}px`).join(" "),
            borderImageSource: `url("${safeUrl(block.src).replaceAll('"', "%22")}")`,
            borderImageSlice: `${slice.join(" ")} fill`,
            borderImageRepeat: block.slice.repeat,
          }}
        />
      ) : block.kind === "video" ? (
        <video
          src={safeUrl(block.src)}
          poster={safeUrl(block.poster)}
          controls
          playsInline
          preload="metadata"
          aria-label={block.alt || "Project video"}
        />
      ) : (
        <img src={safeUrl(block.src)} alt={block.alt || ""} loading="lazy" />
      )}
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}
export function Blocks({ blocks = [], effects }) {
  return (
    <div className="blocks">
      {blocks.map((block) => {
        if (block.type === "media")
          return <Media key={block.id} block={block} effects={effects} />;
        if (block.type === "tags")
          return (
            <ul className="tags" key={block.id}>
              {block.items.map((tag, i) => (
                <li key={i}>{tag}</li>
              ))}
            </ul>
          );
        return (
          <div
            key={block.id}
            className={`text-block ${effectClasses(block.effects, effects)}`}
          >
            {block.mode === "big" ? (
              <h3>
                <RichText text={block.text} />
              </h3>
            ) : block.mode === "pointed" ? (
              <ul className="pointed">
                {block.text
                  .split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <li key={i}>
                      <span className="point-star">✳</span>
                      <RichText text={line} />
                    </li>
                  ))}
              </ul>
            ) : (
              <p>
                <RichText text={block.text} />
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
export function ContentSection({ section, effects }) {
  const firstMedia = section.blocks.findIndex(
    (block) => block.type === "media",
  );
  const introBlocks =
    firstMedia < 0 ? section.blocks : section.blocks.slice(0, firstMedia);
  const remaining = firstMedia < 0 ? [] : section.blocks.slice(firstMedia);
  return (
    <section
      className="content-section section-wrap"
      id={section.id}
      data-section={section.id}
    >
      <div className="section-label">
        <span>{section.eyebrow || section.title}</span>
        <span className="cross">+</span>
      </div>
      <div className="content-columns">
        <div className="section-heading">
          <h2>{section.intro || section.title}</h2>
          <span className="hand-star" aria-hidden="true">
            ✳
          </span>
          <p className="small-note">{section.title}</p>
        </div>
        <Blocks blocks={introBlocks} effects={effects} />
      </div>
      {remaining.map((block) =>
        block.type === "media" ? (
          <Media key={block.id} block={block} effects={effects} />
        ) : (
          <div key={block.id} className="content-continuation">
            <Blocks blocks={[block]} effects={effects} />
          </div>
        ),
      )}
    </section>
  );
}
