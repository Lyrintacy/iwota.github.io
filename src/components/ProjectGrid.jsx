import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import { effectClasses, safeUrl } from "../lib/config.js";
import { portalLayout } from "../lib/layout.js";
import { useMedia, useDialog } from "../lib/hooks.js";

function CardFace({ page, visuals, cardRef }) {
  return (
    <div
      className="collectible-card"
      ref={cardRef}
      style={{
        borderImageSource: `url("${safeUrl(visuals.cardFrame, true).replaceAll('"', "%22")}")`,
        borderImageSlice: `${page.project.cardSlice.join(" ")} fill`,
        borderWidth: page.project.cardSlice
          .map((x) => Math.min(x, 32) + "px")
          .join(" "),
      }}
    >
      <div className="card-topline">
        <span>FIELD NOTES / {String(page.project.index).padStart(2, "0")}</span>
        <span>✳</span>
      </div>
      <img className="card-art" src={safeUrl(page.project.thumbnail)} alt="" />
      <div className="card-copy">
        <span className="eyebrow">
          {page.demo ? "DEMO EXPEDITION" : page.project.engine}
        </span>
        <h3>{page.title}</h3>
        <p>{page.subtitle}</p>
        <div className="card-rule" />
        <span>
          {page.project.team === "Not specified"
            ? "Team not specified"
            : `${page.project.team} project`}
        </span>
        <span className="card-signature">
          OW / {String(page.project.index).padStart(3, "0")}
        </span>
      </div>
    </div>
  );
}
function MobileCard({ page, visuals, global, reduced, onClose, navigate }) {
  const ref = useRef(null),
    card = useRef(null),
    [gyro, setGyro] = useState(false),
    [notice, setNotice] = useState("");
  useDialog(ref, onClose);
  useEffect(() => {
    if (!gyro || reduced) return;
    const orient = (e) => {
      const x = Math.max(
        -global.motion.tilt,
        Math.min(global.motion.tilt, (e.gamma || 0) / 3),
      );
      const y = Math.max(
        -global.motion.tilt,
        Math.min(global.motion.tilt, ((e.beta || 0) - 40) / 4),
      );
      if (card.current)
        card.current.style.transform = `perspective(900px) rotateX(${-y}deg) rotateY(${x}deg)`;
    };
    window.addEventListener("deviceorientation", orient);
    return () => window.removeEventListener("deviceorientation", orient);
  }, [gyro, reduced, global.motion.tilt]);
  async function enable() {
    try {
      if (!window.DeviceOrientationEvent) {
        setNotice("Device rotation is not supported in this browser.");
        return;
      }
      if (
        typeof window.DeviceOrientationEvent.requestPermission === "function" &&
        (await window.DeviceOrientationEvent.requestPermission()) !== "granted"
      ) {
        setNotice("Rotation permission was not granted.");
        return;
      }
      setGyro(true);
      setNotice(
        "Rotation enabled. Availability depends on your device and iframe permissions.",
      );
    } catch {
      setNotice(
        "Rotation is unavailable here. The card still works without it.",
      );
    }
  }
  return (
    <div
      className="card-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="card-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${page.title} project card`}
      >
        <button className="card-close" onClick={onClose}>
          Close ×
        </button>
        <CardFace page={page} visuals={visuals} cardRef={card} />
        <button
          className="primary-button"
          onClick={(e) => {
            onClose();
            navigate(page.id, e);
          }}
        >
          Enter this world ↗
        </button>
        {global.motion.deviceTilt && !reduced && (
          <button className="text-button" onClick={enable} disabled={gyro}>
            {gyro ? "Rotation enabled" : "Enable device rotation"}
          </button>
        )}
        <p role="status">{notice}</p>
      </div>
    </div>
  );
}
export default function ProjectGrid({
  section,
  pages,
  global,
  visuals,
  reduced,
  navigate,
}) {
  const projects = (section.projectIds || [])
    .map((id) => pages[id])
    .filter(Boolean)
    .sort((a, b) => a.project.index - b.project.index);
  const wide = useMedia(`(min-width: ${global.layout.gridBreakpoint}px)`),
    fine = useMedia(
      "(hover: hover) and (pointer: fine) and (min-width: 900px)",
    );
  const columns = wide ? 3 : 2;
  const [cardOrigin, setCardOrigin] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(-1),
    [direction, setDirection] = useState("right"),
    [inspect, setInspect] = useState(null),
    [hover, setHover] = useState(false);
  const grid = useRef(null),
    previous = useRef(new Map()),
    card = useRef(null);
  const { positions, description } = portalLayout(
    projects.length,
    columns,
    active,
    direction,
  );
  useEffect(() => {
    setActive(-1);
    setHover(false);
  }, [columns, section.id]);
  useLayoutEffect(() => {
    const next = new Map();
    grid.current?.querySelectorAll("[data-portal]").forEach((el) => {
      const rect = { x: el.offsetLeft, y: el.offsetTop },
        old = previous.current.get(el.dataset.portal);
      next.set(el.dataset.portal, rect);
      if (old && !reduced && (old.x !== rect.x || old.y !== rect.y))
        el.animate(
          [
            {
              transform: `translate(${old.x - rect.x}px, ${old.y - rect.y}px)`,
            },
            { transform: "translate(0,0)" },
          ],
          { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" },
        );
    });
    previous.current = next;
  }, [active, columns, direction, reduced]);
  function select(index, pointer = false) {
    const rect = grid.current
      ?.querySelector(`[data-portal="${projects[index]?.id}"]`)
      ?.getBoundingClientRect();
    if (rect)
      setCardOrigin({
        x:
          rect.left +
          rect.width / 2 -
          (window.innerWidth - (window.innerWidth > 1100 ? 170 : 132)),
        y:
          rect.top +
          rect.height / 2 -
          (window.innerHeight - (window.innerWidth > 1100 ? 220 : 200)),
      });
    if (index !== active) {
      const col = index % columns;
      setDirection(
        col === 0
          ? "right"
          : col === columns - 1
            ? "left"
            : Math.random() > 0.5
              ? "right"
              : "left",
      );
      setActive(index);
    }
    setHover(pointer);
  }
  function tilt(e) {
    if (!card.current || reduced) return;
    const x = (e.clientX / window.innerWidth - 0.5) * global.motion.tilt * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * global.motion.tilt * 2;
    card.current.style.transform = `perspective(850px) rotateX(${-y}deg) rotateY(${x}deg) rotateZ(-4deg)`;
  }
  const selected = projects[active];
  return (
    <section
      className="projects-section section-wrap"
      id={section.id}
      data-section={section.id}
    >
      <div className="section-label">
        <span>{section.eyebrow}</span>
        <span>
          {String(projects.length).padStart(2, "0")} WORLDS TO EXPLORE
        </span>
      </div>
      <div className="projects-heading">
        <h2>{section.title}</h2>
        <p>
          {section.intro}
          <br />
          <span className="small-note">
            {fine
              ? "HOVER TO DISCOVER · CLICK TO ENTER"
              : "TAP THE ARROW TO DISCOVER"}
          </span>
        </p>
      </div>
      <div
        className="portal-grid"
        ref={grid}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        onPointerMove={tilt}
        onPointerLeave={() => setHover(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setActive(-1);
            setHover(false);
          }
        }}
      >
        {projects.map((page, i) => (
          <article
            key={page.id}
            data-portal={page.id}
            className={`portal ${active === i ? "selected" : ""}`}
            style={{ gridColumn: positions[i].col, gridRow: positions[i].row }}
            onPointerEnter={(e) => {
              if (fine && e.pointerType !== "touch") select(i, true);
            }}
          >
            <button
              className={`portal-visual ${effectClasses(page.project.effects, global.motion.effects)}`}
              onClick={(e) => navigate(page.id, e)}
              aria-label={`Enter ${page.title}`}
              onFocus={() => select(i)}
            >
              <img
                className="portal-still"
                src={safeUrl(page.project.thumbnail)}
                alt={page.title}
                loading="lazy"
              />
              {page.project.preview && !reduced && active === i && (
                <img
                  className="portal-preview"
                  src={safeUrl(page.project.preview)}
                  alt=""
                />
              )}
              <span className="portal-number">
                EXP. {String(page.project.index).padStart(2, "0")}
              </span>
              <span className="portal-symbol">↗</span>
              <span className="portal-name">
                <small>
                  {page.demo
                    ? "DEMO PROJECT"
                    : page.project.engine.toUpperCase() + " / ARCADE"}
                </small>
                <strong>{page.title}</strong>
                <span>{page.subtitle}</span>
              </span>
            </button>
            <div className="portal-caption">
              <span>
                {page.project.team === "Not specified"
                  ? "Team —"
                  : page.project.team}
                <i> / </i>
                {page.project.engine}
              </span>
              <button
                aria-label={`${active === i ? "Collapse" : "Expand"} ${page.title} details`}
                aria-expanded={active === i}
                aria-controls={`details-${section.id}`}
                onClick={() => {
                  if (active === i) {
                    setActive(-1);
                    setHover(false);
                  } else select(i);
                }}
              >
                {active === i ? "−" : "+"}
              </button>
            </div>
            <p className="portal-tease">{page.project.description}</p>
          </article>
        ))}
        {selected && description && (
          <div
            className="portal-description"
            id={`details-${section.id}`}
            style={{
              gridColumn: `${description.col} / span 2`,
              gridRow: description.row,
            }}
            aria-live="polite"
          >
            <div className="description-eyebrow">
              <span>
                FIELD NOTES / {String(selected.project.index).padStart(2, "0")}
              </span>
              <button
                onClick={() => {
                  setActive(-1);
                  setHover(false);
                }}
                aria-label="Close project details"
              >
                ×
              </button>
            </div>
            <h3>{selected.title}</h3>
            <p>{selected.project.description}</p>
            <ul className="tags">
              {selected.project.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <div className="description-actions">
              <button
                className="text-button"
                onClick={(e) => navigate(selected.id, e)}
              >
                Enter this world ↗
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setHover(false);
                  setInspect(selected.id);
                }}
              >
                Inspect card ◇
              </button>
            </div>
          </div>
        )}
      </div>
      {fine && hover && selected && (
        <div
          className="floating-card"
          aria-hidden="true"
          style={{
            "--card-from-x": `${cardOrigin.x}px`,
            "--card-from-y": `${cardOrigin.y}px`,
          }}
        >
          <CardFace page={selected} visuals={visuals} cardRef={card} />
        </div>
      )}
      {inspect && pages[inspect] && (
        <MobileCard
          page={pages[inspect]}
          visuals={visuals}
          global={global}
          reduced={reduced}
          onClose={() => setInspect(null)}
          navigate={navigate}
        />
      )}
      <div className="project-footnote">
        <span>✳ Small experiments. Big possibilities.</span>
        <a href="https://oskarwota.itch.io" target="_blank" rel="noreferrer">
          More on itch.io ↗
        </a>
      </div>
    </section>
  );
}
