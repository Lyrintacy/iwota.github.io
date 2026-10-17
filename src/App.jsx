import React, { useEffect, useState } from "react";
import siteConfig from "./config/site.json";
import {
  DEFAULT_TEXT,
  GENERAL_KEYS,
  applyPhone,
  fontFamily,
  generalOf,
  newPage,
  pageSlug,
  validatePage,
  validateSite,
} from "./lib/model.js";
import { NavContext, pageHref } from "./lib/nav.js";
import { Canvas } from "./components/Canvas.jsx";
import { Editor } from "./components/Editor.jsx";
import { setPanSmoothing, startScrollEffects } from "./lib/scroll.js";

// Every tab is a JSON file in src/config/pages (named after its id). The main
// tab is main.json. site.json holds the defaults, the tab order and the fonts.
const pageFiles = import.meta.glob("./config/pages/*.json", {
  eager: true,
  import: "default",
});

function loadSaved() {
  const pages = {};
  for (const page of Object.values(pageFiles))
    if (page?.id) pages[page.id] = page;
  const tabs = (siteConfig.tabs || []).filter((id) => pages[id]);
  for (const id of Object.keys(pages)) if (!tabs.includes(id)) tabs.push(id);
  return { site: { ...siteConfig, tabs }, pages };
}
const SAVED = loadSaved();
const DRAFT_KEY = "site-editor-draft-v3";

// Short fingerprint of the saved config. A draft only applies to the config it
// was made from, so an updated config file is never hidden by an old draft.
function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++)
    h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return String(h);
}
const BASE = hash(JSON.stringify(SAVED));

// The general settings a tab keeps of its own (when it does not use the defaults).
const pickGeneral = (site) =>
  Object.fromEntries(GENERAL_KEYS.map((k) => [k, site[k]]));
const ownsSettings = (page) => page.id !== "main" && page.useDefaults === false;

function validateAll(data) {
  const errors = validateSite(data.site);
  for (const page of Object.values(data.pages)) {
    const general = generalOf(data.site, page);
    if (ownsSettings(page)) errors.push(...validateSite(general));
    errors.push(...validatePage(page, general));
  }
  return errors;
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { data: SAVED, notice: "" };
    const draft = JSON.parse(raw);
    if (draft.base !== BASE)
      return {
        data: SAVED,
        notice:
          "The saved config changed since your last draft, so the draft was discarded.",
      };
    const errors = validateAll(draft.data);
    if (errors.length) throw new Error(errors.join("; "));
    return { data: draft.data, notice: "" };
  } catch (e) {
    return { data: SAVED, notice: `Local draft ignored: ${e.message}` };
  }
}

// True when the viewport is at or below the phone breakpoint.
function usePhoneViewport(breakpoint) {
  const query = `(max-width: ${breakpoint}px)`;
  const [small, setSmall] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setSmall(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return small;
}

const tabFromUrl = (pages, tabs) => {
  const id = new URLSearchParams(window.location.search).get("page");
  return id && tabs.includes(id) ? id : "main";
};

// A @font-face for each font that comes from a file in public/fonts.
function fontFaces(fonts) {
  return fonts
    .filter((f) => f.file)
    .map((f) => {
      const file = String(f.file).replace(/^\/+/, "").replace(/^fonts\//, "");
      return `@font-face { font-family: "${f.name || f.id}"; src: url("fonts/${file}"); font-display: swap; }`;
    })
    .join("\n");
}

function TabBar({ tabs, pages, active, onPick }) {
  return (
    <nav className="page-tabs" aria-label="Tabs">
      {tabs.map((id) => (
        <a
          key={id}
          href={pageHref(id)}
          className={id === active ? "on" : ""}
          aria-current={id === active ? "page" : undefined}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
            e.preventDefault();
            onPick(id);
          }}
        >
          {pages[id].title || id}
        </a>
      ))}
    </nav>
  );
}

export default function App() {
  const [initial] = useState(loadDraft);
  const [data, setData] = useState(initial.data);
  const [notice, setNotice] = useState(initial.notice);
  const [activeId, setActiveId] = useState(() =>
    tabFromUrl(initial.data.pages, initial.data.site.tabs),
  );
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(false); // editor: edit phone overrides
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  // Where the workshop panel sits. Stored in this browser only.
  const [dock, setDock] = useState(() =>
    localStorage.getItem("editor-dock") === "right" ? "right" : "left",
  );
  const [previewWidth, setPreviewWidth] = useState(
    () => Number(localStorage.getItem("preview-width")) || 390,
  );
  useEffect(() => localStorage.setItem("editor-dock", dock), [dock]);
  useEffect(
    () => localStorage.setItem("preview-width", String(previewWidth)),
    [previewWidth],
  );

  const { site, pages } = data;
  const tabs = site.tabs;
  const activeTab = pages[activeId] ? activeId : "main";
  const page = pages[activeTab];
  const own = ownsSettings(page);
  // The general settings in use on this tab: the site's, or the tab's own.
  const general = own ? page.settings || pickGeneral(site) : site;

  const phoneViewport = usePhoneViewport(page.mobile?.breakpoint || 700);
  const previewing = editing && phone;
  const view = previewing || phoneViewport ? applyPhone(page) : page;

  const draft = JSON.stringify(data) !== JSON.stringify(SAVED);
  useEffect(() => {
    if (draft)
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ base: BASE, data }));
    else localStorage.removeItem(DRAFT_KEY);
  }, [data, draft]);

  useEffect(() => startScrollEffects(), []);
  useEffect(() => setPanSmoothing(site.scroll?.panSmoothMs ?? 240), [site.scroll?.panSmoothMs]);

  // Fonts: a @font-face for each font file.
  const fontsKey = JSON.stringify(general.fonts || []);
  useEffect(() => {
    let el = document.getElementById("site-fonts");
    if (!el) {
      el = document.createElement("style");
      el.id = "site-fonts";
      document.head.appendChild(el);
    }
    el.textContent = fontFaces(general.fonts || []);
  }, [fontsKey]);

  useEffect(() => {
    const key = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        setEditing((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  // Back and forward move between tabs.
  useEffect(() => {
    const back = () => {
      setActiveId(tabFromUrl(pages, tabs));
      setSelectedId(null);
      setSelectedSectionId(null);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [pages, tabs]);

  const go = (id, { push = true } = {}) => {
    if (!pages[id]) return;
    setActiveId(id);
    setSelectedId(null);
    setSelectedSectionId(null);
    if (push && id !== activeTab) window.history.pushState(null, "", pageHref(id));
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  // The active tab's page, and the general settings of the site or of the tab.
  const setPage = (fn) =>
    setData((d) => ({
      ...d,
      pages: { ...d.pages, [activeTab]: fn(d.pages[activeTab]) },
    }));
  const setSite = (fn) =>
    setData((d) => {
      const p = d.pages[activeTab];
      if (ownsSettings(p))
        return {
          ...d,
          pages: {
            ...d.pages,
            [activeTab]: {
              ...p,
              settings: fn(p.settings || pickGeneral(d.site)),
            },
          },
        };
      return { ...d, site: fn(d.site) };
    });

  // Tabs: add, rename, reorder, delete, and choose the general settings.
  const pagesApi = {
    tabs,
    pages,
    active: activeTab,
    go,
    add(name) {
      const base = pageSlug(name);
      let id = base;
      for (let n = 2; pages[id]; n++) id = `${base}-${n}`;
      const created = newPage(id, name.trim() || "New tab");
      setData((d) => ({
        ...d,
        site: { ...d.site, tabs: [...d.site.tabs, id] },
        pages: { ...d.pages, [id]: created },
      }));
      go(id);
    },
    rename(id, title) {
      setData((d) => ({
        ...d,
        pages: { ...d.pages, [id]: { ...d.pages[id], title } },
      }));
    },
    move(id, delta) {
      const list = [...tabs];
      const i = list.indexOf(id);
      const to = i + delta;
      if (i < 0 || to < 0 || to >= list.length) return;
      [list[i], list[to]] = [list[to], list[i]];
      setData((d) => ({ ...d, site: { ...d.site, tabs: list } }));
    },
    remove(id) {
      if (id === "main") return;
      if (!window.confirm(`Delete the tab "${pages[id].title}"? Its file is no longer used.`))
        return;
      setData((d) => {
        const { [id]: _gone, ...rest } = d.pages;
        return {
          ...d,
          site: { ...d.site, tabs: d.site.tabs.filter((t) => t !== id) },
          pages: rest,
        };
      });
      if (activeTab === id) go("main");
    },
    // true: use the main tab's general settings. false: this tab gets its own copy.
    setUseDefaults(id, useDefaults) {
      setData((d) => {
        const p = d.pages[id];
        const { settings: _old, ...rest } = p;
        return {
          ...d,
          pages: {
            ...d.pages,
            [id]: useDefaults
              ? { ...rest, useDefaults: true }
              : { ...rest, useDefaults: false, settings: pickGeneral(d.site) },
          },
        };
      });
    },
  };

  const setRootSite = (fn) => setData((d) => ({ ...d, site: fn(d.site) }));

  const reset = () => {
    if (
      !window.confirm(
        "Reset to the saved config? Unexported changes in this browser will be lost.",
      )
    )
      return;
    setData(SAVED);
    setSelectedId(null);
    setSelectedSectionId(null);
    setPhone(false);
    setNotice("");
    setActiveId("main");
  };

  // Palette values become CSS variables; roles point at palette numbers.
  const vars = {};
  general.palette.forEach((c, i) => (vars[`--color-${i + 1}`] = c));
  for (const [role, n] of Object.entries(general.roles))
    vars[`--c-${role}`] = `var(--color-${n})`;
  const sizes = { ...DEFAULT_TEXT, ...(general.text || {}) };
  for (const [key, px] of Object.entries(sizes))
    vars[`--size-${key}`] = String(px); // unitless: scaled by --u in CSS
  for (const f of general.fonts || []) vars[`--font-${f.id}`] = fontFamily(f);
  // Screen width used for scaling: the window, or the phone preview's width.
  vars["--preview-w"] = `${previewWidth}px`;
  vars["--vw"] = previewing ? `${previewWidth}px` : "100vw";

  return (
    <NavContext.Provider value={go}>
      <div
        className={`site dock-${dock} ${editing ? "editing" : ""} ${previewing ? "phone-preview" : ""}`}
        style={vars}
      >
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {tabs.length > 1 && (
          <TabBar tabs={tabs} pages={pages} active={activeTab} onPick={go} />
        )}
        <Canvas
          key={activeTab}
          page={view}
          editing={editing}
          selectedId={selectedId}
          onSelect={setSelectedId}
          selectedSectionId={selectedSectionId}
        />
        <button className="edit-toggle" onClick={() => setEditing((v) => !v)}>
          {editing ? "Close workshop" : "Workshop"} <kbd>F2</kbd>
        </button>
        {editing && (
          <Editor
            site={general}
            rootSite={site}
            setRootSite={setRootSite}
            page={page}
            pagesApi={pagesApi}
            ownSettings={own}
            view={view}
            setSite={setSite}
            setPage={setPage}
            draft={draft}
            onReset={reset}
            onClose={() => setEditing(false)}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
            phone={phone}
            setPhone={setPhone}
            dock={dock}
            setDock={setDock}
            previewWidth={previewWidth}
            setPreviewWidth={setPreviewWidth}
          />
        )}
      </div>
    </NavContext.Provider>
  );
}
