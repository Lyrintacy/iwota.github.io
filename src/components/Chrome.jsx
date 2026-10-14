import React, { useEffect, useRef, useState } from "react";
import { effectClasses, safeUrl } from "../lib/config.js";

export function Header({
  global,
  pages,
  compact,
  navigate,
  pageId,
  setContentsOpen,
  contentsOpen,
  socials,
  visuals,
}) {
  return (
    <header className={`site-header ${compact ? "compact" : ""}`}>
      <button
        className="brand"
        onClick={(e) => navigate("main", e)}
        aria-label="Oskar Wota — home"
      >
        <img src="./art/mark.svg" alt="" />
        <span>
          {global.identity.name}
          <small>{global.identity.role}</small>
        </span>
      </button>
      {compact && <div className="docked-socials">{socials}</div>}
      <nav className="featured-nav" aria-label="Featured projects">
        {global.featured.map((id, i) => {
          const page = pages[id];
          if (!page?.project) return null;
          return (
            <button
              key={id}
              onClick={(e) => navigate(id, e, true)}
              aria-current={pageId === id ? "page" : undefined}
              className={`featured-project ${effectClasses(page.project.headerEffects || page.project.effects, global.motion.effects)}`}
            >
              <span className="featured-index">0{i + 1}</span>
              <span className="featured-info">
                <span className="featured-title">
                  {page.title}
                  <span className="diagonal">↗</span>
                </span>
                <span className="team">
                  <span aria-hidden="true">♧</span>{" "}
                  {page.project.team === "Not specified"
                    ? "Team —"
                    : page.project.team}
                </span>
                <span className="featured-extra">
                  {page.project.timeframe === "Not specified"
                    ? "Timeframe —"
                    : page.project.timeframe}
                  <i> / </i>
                  {page.project.engine}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
      <button
        className="contents-toggle"
        aria-label="Contents"
        onClick={() => setContentsOpen(!contentsOpen)}
        aria-expanded={contentsOpen}
        aria-controls="contents"
      >
        <span>{contentsOpen ? "×" : "☷"}</span> Contents
      </button>
      {compact && (
        <img className="docked-roof" src={safeUrl(visuals.roof, true)} alt="" />
      )}
    </header>
  );
}
export function Socials({ global, onContact }) {
  return (
    <nav className="socials" aria-label="Social links">
      {global.socials.map((link, i) =>
        link.url ? (
          <a key={i} href={safeUrl(link.url)} target="_blank" rel="noreferrer">
            {link.label} <span>↗</span>
          </a>
        ) : (
          <span
            className="unconfigured-link"
            key={i}
            title={`${link.label} link hasn't been configured`}
          >
            {link.label} <span>—</span>
          </span>
        ),
      )}
      <button onClick={onContact}>
        Let’s talk <span>↗</span>
      </button>
    </nav>
  );
}
export function TableOfContents({ sections, pageId, open, onClose, onJump }) {
  const [active, setActive] = useState(
    pageId === "main" ? "myself" : sections[0]?.id,
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: 0 },
    );
    document
      .querySelectorAll("[data-section]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, pageId]);
  const items =
    pageId === "main"
      ? [
          { id: "myself", title: "Myself", tocImage: "images/profile.JPEG" },
          ...sections,
        ]
      : sections;
  return (
    <>
      <button
        className={`contents-backdrop ${open ? "visible" : ""}`}
        onClick={onClose}
        aria-label="Close contents"
        tabIndex={open ? 0 : -1}
      />
      <aside
        id="contents"
        className={`toc ${open ? "open" : ""}`}
        aria-label="Table of contents"
      >
        <span className="toc-label">INDEX</span>
        {items.map((section, i) => (
          <button
            key={section.id}
            onClick={() => {
              onJump(section.id);
              onClose();
            }}
            className={active === section.id ? "active" : ""}
            aria-label={section.title}
            aria-current={active === section.id ? "location" : undefined}
          >
            <span className="toc-thumb">
              {section.tocImage ? (
                <img src={safeUrl(section.tocImage)} alt="" />
              ) : (
                <span>✳</span>
              )}
              <b>{String(i).padStart(2, "0")}</b>
            </span>
            <span className="toc-tooltip">{section.title}</span>
          </button>
        ))}
        <span className="toc-line" />
      </aside>
    </>
  );
}
export function Borders({ global, visuals, startRef, reduced, pageId }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!ref.current) return;
      const top = startRef.current?.getBoundingClientRect().top || 0;
      ref.current.style.clipPath = `inset(${Math.max(0, top)}px 0 0)`;
      ref.current.style.setProperty(
        "--border-scroll",
        `${reduced ? 0 : window.scrollY * global.layout.borderSpeed}px`,
      );
    };
    const scroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
    };
  }, [global.layout.borderSpeed, startRef, reduced, pageId]);
  return (
    <div className="borders" ref={ref} aria-hidden="true">
      <div
        className="border-left"
        style={{
          backgroundImage: `url("${safeUrl(visuals.leftBorder, true).replaceAll('"', "%22")}")`,
        }}
      />
      <div
        className="border-right"
        style={{
          backgroundImage: `url("${safeUrl(visuals.rightBorder, true).replaceAll('"', "%22")}")`,
        }}
      />
    </div>
  );
}
