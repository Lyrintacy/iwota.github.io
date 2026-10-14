import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { loadConfig, resolvePage, safeUrl } from "./lib/config.js";
import { usePaletteVisuals } from "./lib/art.js";
import { useMedia } from "./lib/hooks.js";
import {
  Header,
  Socials,
  TableOfContents,
  Borders,
} from "./components/Chrome.jsx";
import { ContentSection } from "./components/Content.jsx";
import ProjectGrid from "./components/ProjectGrid.jsx";
import Contact from "./components/Contact.jsx";
import { Scene } from "./components/Scene.jsx";
const Editor = lazy(() => import("./components/Editor.jsx"));
const route = () =>
  window.location.hash.replace(/^#\/?/, "").split("/")[0] || "main";

function Portfolio({ initial }) {
  const [bundle, setBundle] = useState(initial.current),
    [pageId, setPageId] = useState(() =>
      initial.current.pages[route()] ? route() : "main",
    );
  const [editor, setEditor] = useState(false),
    [contentsOpen, setContentsOpen] = useState(false),
    [compact, setCompact] = useState(false),
    [draft, setDraft] = useState(initial.hasDraft),
    [notice, setNotice] = useState(initial.notice);
  const [transition, setTransition] = useState(null),
    [motionPaused, setMotionPaused] = useState(false);
  const reducedPreference = useMedia("(prefers-reduced-motion: reduce)");
  const global = bundle.global,
    page = bundle.pages[pageId] || bundle.pages.main;
  const reduced = reducedPreference || !global.motion.enabled || motionPaused;
  const { theme, visuals: visualPaths } = resolvePage(
    global,
    page,
    bundle.pages.main,
  );
  const visuals = usePaletteVisuals(visualPaths, theme);
  const roof = useRef(null),
    world = useRef(null),
    navigating = useRef(false);
  useEffect(() => {
    const hash = () => {
      setPageId(bundle.pages[route()] ? route() : "main");
      setContentsOpen(false);
    };
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, [bundle.pages]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        setEditor((v) => !v);
        setContentsOpen(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!transition) return;
    const enter = setTimeout(() => {
      window.location.hash = `/${transition.id}${transition.anchor ? "/" + transition.anchor : ""}`;
      setPageId(transition.id);
    }, transition.duration * 0.48);
    const finish = setTimeout(() => {
      setTransition(null);
      navigating.current = false;
    }, transition.duration);
    return () => {
      clearTimeout(enter);
      clearTimeout(finish);
    };
  }, [transition]);
  useEffect(() => {
    if (pageId !== "main") {
      setCompact(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        setCompact(
          entries[0].boundingClientRect.top < global.layout.headerCompactHeight,
        ),
      {
        rootMargin: `-${global.layout.headerCompactHeight}px 0px 0px 0px`,
        threshold: 0,
      },
    );
    if (roof.current) observer.observe(roof.current);
    return () => observer.disconnect();
  }, [pageId, global.layout.headerCompactHeight]);
  useEffect(() => {
    document.title = `${pageId === "main" ? global.identity.name : page.title + " — " + global.identity.name} / Field guide`;
  }, [pageId, page.title, global.identity.name]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const anchor = window.location.hash.split("/")[2];
      if (anchor && document.getElementById(anchor))
        document.getElementById(anchor).scrollIntoView({ behavior: "instant" });
      else window.scrollTo({ top: 0, behavior: "instant" });
      document.querySelector("main h1")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pageId]);
  const jump = useCallback(
    (id) => {
      document.getElementById(id)?.scrollIntoView({
        behavior: reduced ? "instant" : "smooth",
        block: "start",
      });
      window.history.replaceState(null, "", `#/${pageId}/${id}`);
    },
    [pageId, reduced],
  );
  function navigate(id, event, small = false, anchor = "") {
    if (!bundle.pages[id] || navigating.current) return;
    if (id === pageId) {
      if (anchor) jump(anchor);
      else
        window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" });
      return;
    }
    const rect = event?.currentTarget?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const duration = reduced ? 180 : global.motion.duration;
    navigating.current = true;
    setTransition({ id, anchor, x, y, small, duration });
    setContentsOpen(false);
  }
  function contact(e) {
    const contactId = bundle.pages.main.sections.find(
      (s) => s.type === "contact",
    )?.id;
    if (contactId) {
      if (pageId === "main") jump(contactId);
      else navigate("main", e, true, contactId);
    } else window.location.href = `mailto:${global.identity.email}`;
  }
  const socials = <Socials global={global} onContact={contact} />;
  const vars = {
    ...Object.fromEntries(
      Object.entries(theme).map(([key, value]) => [`--${key}`, value]),
    ),
    "--font-display": `'${global.fonts.display}', Impact, sans-serif`,
    "--font-body": `'${global.fonts.body}', sans-serif`,
    "--font-mono": `'${global.fonts.mono}', monospace`,
    "--content-width": `${global.layout.contentWidth}px`,
    "--border-width": `${global.layout.borderWidth}px`,
    "--mobile-border-width": `${global.layout.mobileBorderWidth}px`,
    "--media-offset": `${global.layout.mediaOffset}px`,
    "--compact-height": `${global.layout.headerCompactHeight}px`,
  };
  return (
    <div
      className={`portfolio ${reduced ? "reduce-motion" : ""} ${pageId !== "main" ? "project-page" : ""}`}
      style={vars}
    >
      <a
        className="skip-link"
        href={`#${pageId === "main" ? "myself" : page.sections[0].id}`}
        onClick={(e) => {
          e.preventDefault();
          jump(pageId === "main" ? "myself" : page.sections[0].id);
          document.querySelector("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <Header
        global={global}
        pages={bundle.pages}
        compact={compact}
        navigate={navigate}
        pageId={pageId}
        contentsOpen={contentsOpen}
        setContentsOpen={setContentsOpen}
        socials={socials}
        visuals={visuals}
      />
      <TableOfContents
        sections={page.sections}
        pageId={pageId}
        open={contentsOpen}
        onClose={() => setContentsOpen(false)}
        onJump={jump}
      />
      {global.layout.sharedBorders && (
        <Borders
          global={global}
          visuals={visuals}
          startRef={world}
          reduced={reduced}
          pageId={pageId}
        />
      )}
      <main tabIndex={-1}>
        {pageId === "main" ? (
          <>
            <section
              className="hero section-wrap"
              id="myself"
              data-section="myself"
            >
              <div className="hero-copy">
                <div className="eyebrow hero-eyebrow">
                  <span className="status-dot" />
                  {page.hero.eyebrow}
                </div>
                <h1 tabIndex={-1}>
                  {page.hero.firstName}
                  <span>
                    {page.hero.lastName}
                    <i className="name-star" aria-hidden="true">
                      ✳
                    </i>
                  </span>
                </h1>
                <p className="hero-subtitle">{page.hero.subtitle}</p>
                <p className="hero-description">{page.hero.description}</p>
                <button
                  className="primary-button hero-cta"
                  onClick={() =>
                    jump(
                      page.sections.find((s) => s.type === "projects")?.id ||
                        page.sections[0].id,
                    )
                  }
                >
                  {page.hero.button}
                  <span>↘</span>
                </button>
              </div>
              <div
                className={`hero-art ${page.hero.artMode === "photo" ? "is-photo" : ""}`}
              >
                <span className="art-coordinate">
                  {page.hero.artLabel || ""}
                </span>
                <img
                  src={safeUrl(visuals.hero, true)}
                  alt={page.hero.artAlt || ""}
                />
                <span className="art-annotation">
                  {page.hero.artNote || ""}
                  <svg viewBox="0 0 100 50" aria-hidden="true">
                    <path d="M4 40Q73 48 84 9M72 15L85 7L90 22" />
                  </svg>
                </span>
                <span className="art-caption">
                  {page.hero.artCaption || ""}
                </span>
              </div>
              <div className="hero-bottom">
                <span>{global.identity.availability}</span>
                <span className="hero-scroll">
                  {page.hero.note}
                  <b>↓</b>
                </span>
              </div>
            </section>
            <div className="roof-anchor" ref={roof}>
              <div className={`roof-bar ${compact ? "is-docked" : ""}`}>
                <div className="roof-inner section-wrap">
                  {socials}
                  <span className="roof-note">
                    <span>✳</span> {page.hero.roofNote || ""}
                  </span>
                </div>
                <img
                  className="roof-art"
                  src={safeUrl(visuals.roof, true)}
                  alt=""
                />
              </div>
            </div>
          </>
        ) : (
          <section className="project-intro section-wrap">
            <button
              className="text-button"
              onClick={(e) => navigate("main", e, true)}
            >
              ← Back to the field guide
            </button>
            <div className="eyebrow">
              EXPEDITION {String(page.project.index).padStart(2, "0")}{" "}
              {page.demo
                ? "/ DEMO PROJECT"
                : "/ " + page.project.engine.toUpperCase()}
            </div>
            <h1 tabIndex={-1}>
              {page.title}
              <span>✳</span>
            </h1>
            <p className="project-subtitle">{page.subtitle}</p>
            <div className="project-metadata">
              {[
                ["Team", page.project.team],
                ["Timeframe", page.project.timeframe],
                ["Engine", page.project.engine],
                ["Role", page.project.role],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <span>{value}</span>
                </div>
              ))}
              {page.project.url && (
                <a
                  className="primary-button"
                  href={safeUrl(page.project.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Play on itch.io ↗
                </a>
              )}
            </div>
          </section>
        )}
        <div className="world-content" ref={world}>
          {page.sections.map((section) =>
            section.type === "projects" ? (
              <ProjectGrid
                key={section.id}
                section={section}
                pages={bundle.pages}
                global={global}
                visuals={visuals}
                reduced={reduced}
                navigate={navigate}
              />
            ) : section.type === "contact" ? (
              <Contact
                key={section.id}
                section={section}
                global={global}
                visuals={visuals}
              />
            ) : section.type === "ending" ? (
              <section
                key={section.id}
                className="ending project-ending"
                id={section.id}
                data-section={section.id}
              >
                <img
                  className="ending-art"
                  src={safeUrl(visuals.ending, true)}
                  alt=""
                />
                <div className="ending-content section-wrap">
                  <span className="eyebrow">{section.eyebrow}</span>
                  <h2>{section.title}</h2>
                  <button
                    className="primary-button"
                    onClick={(e) => navigate("main", e)}
                  >
                    Back to the field guide ↗
                  </button>
                </div>
              </section>
            ) : section.type === "scene" ? (
              <Scene
                key={section.id}
                section={section}
                visuals={visuals}
                reduced={reduced}
              />
            ) : (
              <ContentSection
                key={section.id}
                section={section}
                effects={global.motion.effects}
              />
            ),
          )}
        </div>
      </main>
      <div className="utility-controls">
        <button
          onClick={() => setEditor(true)}
          title="Open the config editor (F2)"
        >
          <span>⚒</span> <kbd>F2</kbd>
          <span className="utility-label"> WORKSHOP</span>
        </button>
        <button
          onClick={() => setMotionPaused((v) => !v)}
          aria-pressed={motionPaused}
          aria-label={motionPaused ? "Enable motion" : "Pause motion"}
          title={
            reducedPreference
              ? "Your system prefers reduced motion"
              : "Toggle motion"
          }
        >
          {reduced ? "Ⅱ" : "≈"}
        </button>
        {draft && <span className="draft-badge">LOCAL DRAFT</span>}
      </div>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss notice">
            ×
          </button>
        </div>
      )}
      {transition && (
        <div
          className={`portal-transition ${transition.small ? "small" : ""}`}
          aria-label="Entering a new world"
          role="status"
          style={{
            "--origin-x": `${transition.x}px`,
            "--origin-y": `${transition.y}px`,
            "--transition-duration": `${transition.duration}ms`,
          }}
        >
          <img src={safeUrl(visuals.portal, true)} alt="" />
          <span>VENTURING FURTHER</span>
        </div>
      )}
      {editor && (
        <Suspense
          fallback={
            <div className="loading-overlay">Opening the workshop…</div>
          }
        >
          <Editor
            bundle={bundle}
            published={initial.published}
            pageId={pageId}
            onClose={() => setEditor(false)}
            onApply={(data, local) => {
              setBundle(data);
              setDraft(local);
              if (!data.pages[pageId]) {
                setPageId("main");
                window.history.replaceState(null, "", "#/main");
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
export default function App() {
  const [loaded, setLoaded] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    loadConfig()
      .then((data) => {
        if (live) setLoaded(data);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  if (error)
    return (
      <div className="boot-screen">
        <h1>The field guide couldn’t open.</h1>
        <p>
          Check the files in public/config. Your configuration may need a
          correction.
        </p>
        <pre>{error}</pre>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("iwota-field-guide-draft-v1");
            } catch {}
            window.location.reload();
          }}
        >
          Clear local draft & retry
        </button>
      </div>
    );
  if (!loaded)
    return (
      <div className="boot-screen">
        <img src="./art/mark.svg" alt="" />
        <p>OPENING THE FIELD GUIDE…</p>
      </div>
    );
  return <Portfolio initial={loaded} />;
}
