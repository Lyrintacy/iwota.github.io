import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import siteConfig from "./config/site.json";
import phoneConfig from "./config/phone.json";
import {
  DEFAULT_TEXT,
  textStyles,
  DEFAULT_UI,
  GENERAL_KEYS,
  applyPhone,
  fontFamily,
  fontFormat,
  generalOf,
  newPage,
  pageSlug,
  validatePage,
  validateSite,
} from "./lib/model.js";
import { NavContext, pageHref } from "./lib/nav.js";
import { Canvas, TextStylesContext } from "./components/Canvas.jsx";
import { ButtonRulesContext, WaitContext } from "./components/Interactive.jsx";
import { HintWidget } from "./components/HintWidget.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { Editor } from "./components/Editor.jsx";
import { setPanSmoothing, startScrollEffects } from "./lib/scroll.js";

// Every tab is a JSON file in src/config/pages (named after its id). The main
// tab is main.json. site.json holds the defaults, the tab order and the fonts.
const pageFiles = import.meta.glob("./config/pages/*.json", {
  eager: true,
  import: "default",
});

// Phone overrides for every tab, in one file: { "<tab id>": { breakpoint, canvas, items, sections } }.
function loadSaved() {
  const pages = {};
  for (const page of Object.values(pageFiles))
    if (page?.id) pages[page.id] = page;
  for (const id of Object.keys(pages)) {
    const phone = phoneConfig?.[id];
    if (phone && typeof phone === "object") pages[id] = { ...pages[id], mobile: phone };
  }
  const tabs = (siteConfig.tabs || []).filter((id) => pages[id]);
  for (const id of Object.keys(pages)) if (!tabs.includes(id)) tabs.push(id);
  return { site: { ...siteConfig, tabs }, pages };
}
const SAVED = loadSaved();

// Which files differ from the saved config (shown on the Export tab).
const pageFileOf = (page) => {
  const { mobile: _phone, ...rest } = page || {};
  return JSON.stringify(rest);
};
const phoneOf = (pages) =>
  JSON.stringify(
    Object.fromEntries(
      Object.keys(pages)
        .sort()
        .map((id) => [id, pages[id].mobile || {}]),
    ),
  );
function editedFiles(data) {
  const out = { "site.json": JSON.stringify(data.site) !== JSON.stringify(SAVED.site) };
  for (const [id, page] of Object.entries(data.pages))
    out[`${id}.json`] = pageFileOf(page) !== pageFileOf(SAVED.pages[id]);
  out["phone.json"] = phoneOf(data.pages) !== phoneOf(SAVED.pages);
  const removed = SAVED.site.tabs.filter((id) => !data.site.tabs.includes(id));
  return { changed: out, removed: removed.map((id) => `${id}.json`) };
}
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

// Hidden tabs opened through a link. "kept" tabs stay in this browser's bar for good;
// "temp" ones hold the temporary slots at the end of the bar (this session only).
const KEPT_KEY = "site-tabs-kept";
const TEMP_KEY = "site-tabs-temp";
function readList(store, key) {
  try {
    const v = JSON.parse(store.getItem(key) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const tabFromUrl = (pages, tabs) => {
  const id = new URLSearchParams(window.location.search).get("page");
  return id && tabs.includes(id) ? id : "main";
};

// A @font-face for each font that comes from a file in public/fonts.
function fontFaces(fonts) {
  const seen = new Map();
  for (const f of fonts) if (f.file && !seen.has(f.name || f.id)) seen.set(f.name || f.id, f);
  return [...seen.values()]
    .map((f) => {
      const file = String(f.file).replace(/^\/+/, "").replace(/^fonts\//, "");
      const format = fontFormat(file);
      const src = `url("fonts/${encodeURI(file)}")${format ? ` format("${format}")` : ""}`;
      return `@font-face { font-family: "${f.name || f.id}"; src: ${src}; font-display: swap; }`;
    })
    .join("\n");
}

function TabBar({ ids, pages, active, onPick }) {
  return (
    <nav className="page-tabs" aria-label="Tabs">
      {ids.map((id) => (
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
  const [kept, setKept] = useState(() => readList(localStorage, KEPT_KEY));
  const [temp, setTemp] = useState(() => readList(sessionStorage, TEMP_KEY));
  // Tab switch (PC only): a frozen copy of the old page, and the stage that holds the new one.
  const stageRef = useRef(null);
  const pendingSlide = useRef(null);
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

  // After a tab switch: the old copy slides out and the new page slides in, from the
  // side of the tab it replaces. Web Animations, so React does not re-render.
  useLayoutEffect(() => {
    const p = pendingSlide.current;
    if (!p) return;
    pendingSlide.current = null;
    const enter = stageRef.current?.querySelector(":scope > .tab-current");
    const timing = { duration: 450, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
    // The frozen old page stays where it was; the new page slides in on top of it.
    const done = () => {
      p.frozen.remove();
      if (enter) {
        enter.style.position = "";
        enter.style.zIndex = "";
      }
    };
    if (enter) {
      enter.style.position = "relative";
      enter.style.zIndex = "901";
    }
    const anim = enter?.animate(
      [{ transform: `translateX(${p.dir * 100}vw)` }, { transform: "translateX(0)" }],
      { ...timing, fill: "both" },
    );
    if (anim) anim.addEventListener("finish", done);
    else done();
  }, [activeTab]);

  useEffect(() => localStorage.setItem(KEPT_KEY, JSON.stringify(kept)), [kept]);
  useEffect(() => sessionStorage.setItem(TEMP_KEY, JSON.stringify(temp)), [temp]);

  // Buttons waiting for a second press (the hint shows while there are any).
  const waitSet = useRef(new Map());
  const [waitCount, setWaitCount] = useState(0);
  const [waitEl, setWaitEl] = useState(null); // the button the hint points at (the latest one waiting)
  const waitApi = useMemo(
    () => ({
      add: (k, el) => {
        waitSet.current.set(k, el);
        setWaitEl(el || null);
        setWaitCount(waitSet.current.size);
      },
      remove: (k) => {
        if (!waitSet.current.delete(k)) return;
        setWaitEl([...waitSet.current.values()].pop() || null);
        setWaitCount(waitSet.current.size);
      },
    }),
    [],
  );
  // The tab bar: visible tabs (and kept ones), then up to maxTemporary opened hidden tabs.
  const ui = {
    tabs: { ...DEFAULT_UI.tabs, ...(site.ui?.tabs || {}) },
    workshop: { ...DEFAULT_UI.workshop, ...(site.ui?.workshop || {}) },
    toggle: { ...DEFAULT_UI.toggle, ...(site.ui?.toggle || {}) },
    buttons: { ...DEFAULT_UI.buttons, ...(site.ui?.buttons || {}) },
    hint: { ...DEFAULT_UI.hint, ...(site.ui?.hint || {}) },
  };
  const cap = Math.max(0, Math.floor(Number(ui.tabs.maxTemporary) || 0));
  const fixedIds = tabs.filter((id) => pages[id].showInBar !== false || kept.includes(id));
  const tempIds = cap ? temp.filter((id) => pages[id] && !fixedIds.includes(id)).slice(-cap) : [];
  const barIds = [...fixedIds, ...tempIds];

  // Opening a hidden tab gives it a temporary slot, or keeps it for good if the tab says so.
  const noteOpened = (id) => {
    const p = pages[id];
    if (!p || p.showInBar !== false) return;
    if (p.keepWhenOpened) {
      setKept((k) => (k.includes(id) ? k : [...k, id]));
      setTemp((t) => t.filter((x) => x !== id));
    } else if (!kept.includes(id) && cap) {
      setTemp((t) => [...t.filter((x) => x !== id), id].slice(-cap));
    }
  };
  useEffect(() => noteOpened(activeTab), []);

  const draft = JSON.stringify(data) !== JSON.stringify(SAVED);
  useEffect(() => {
    if (draft)
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ base: BASE, data }));
    else localStorage.removeItem(DRAFT_KEY);
  }, [data, draft]);

  useEffect(() => startScrollEffects(), []);
  useEffect(() => setPanSmoothing(site.scroll?.panSmoothMs ?? 240), [site.scroll?.panSmoothMs]);

  // Fonts: a @font-face for each font file.
  const fontsKey = JSON.stringify([...(site.fonts || []), ...(general.fonts || [])]);
  useEffect(() => {
    let el = document.getElementById("site-fonts");
    if (!el) {
      el = document.createElement("style");
      el.id = "site-fonts";
      document.head.appendChild(el);
    }
    el.textContent = fontFaces([...(site.fonts || []), ...(general.fonts || [])]);
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
      const next = tabFromUrl(pages, tabs);
      setActiveId(next);
      noteOpened(next);
      setSelectedId(null);
      setSelectedSectionId(null);
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [pages, tabs, kept, temp]);

  const go = (id, { push = true } = {}) => {
    if (!pages[id]) return;
    if (id !== activeTab) {
      const dir = tabs.indexOf(id) > tabs.indexOf(activeTab) ? 1 : -1;
      // PC only: a fine pointer with hover, outside the phone layout, not reduced motion.
      // Phones only with the "slide on phones" test option.
      const canSlide =
        (phoneViewport
          ? ui.tabs.slidePhone === true
          : ui.tabs.slide !== false && window.matchMedia("(hover: hover) and (pointer: fine)").matches) &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const current = stageRef.current?.querySelector(":scope > .tab-current > .canvas");
      if (canSlide && current) {
        // Frozen copy of the old page, at the same place on screen. It is a plain copy:
        // it no longer updates, and its videos are removed.
        const r = current.getBoundingClientRect();
        const frozen = current.cloneNode(true);
        frozen.querySelectorAll("video, iframe").forEach((n) => n.remove());
        Object.assign(frozen.style, {
          position: "fixed",
          top: `${r.top}px`,
          left: `${r.left}px`,
          width: `${r.width}px`,
          height: `${r.height}px`,
          margin: "0",
          zIndex: "900",
          pointerEvents: "none",
        });
        frozen.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id")); // no duplicate ids
        stageRef.current.closest(".site").appendChild(frozen);
        pendingSlide.current = { frozen, dir };
      }
      noteOpened(id);
    }
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
    setFlags(id, values) {
      setData((d) => ({
        ...d,
        pages: { ...d.pages, [id]: { ...d.pages[id], ...values } },
      }));
    },
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
  // The tab bar's look: palette colours and a font from the site settings.
  const rootHex = (n) => (n ? site.palette[n - 1] : undefined);
  const rootFont = (id) => {
    const f = (site.fonts || []).find((x) => x.id === id);
    return f ? fontFamily(f) : undefined;
  };
  const toggleVars = {};
  if (rootHex(ui.toggle.text)) toggleVars["--tb-text"] = rootHex(ui.toggle.text);
  if (rootHex(ui.toggle.background)) toggleVars["--tb-bg"] = rootHex(ui.toggle.background);
  if (rootFont(ui.toggle.font)) toggleVars["--tb-font"] = rootFont(ui.toggle.font);
  const hintVars = {};
  if (rootHex(ui.hint.background)) hintVars["--hint-bg"] = rootHex(ui.hint.background);
  if (rootHex(ui.hint.text)) hintVars["--hint-fg"] = rootHex(ui.hint.text);
  if (rootFont(ui.hint.font)) hintVars["--hint-font"] = rootFont(ui.hint.font);
  const setVar = (key, value) => {
    if (value) vars[key] = value;
  };
  setVar("--tab-font", rootFont(ui.tabs.font));
  setVar("--tab-text", rootHex(ui.tabs.text));
  setVar("--tab-bg", rootHex(ui.tabs.background));
  setVar("--tab-active", rootHex(ui.tabs.active));
  // Screen width used for scaling: the window, or the phone preview's width.
  vars["--preview-w"] = `${previewWidth}px`;
  vars["--vw"] = previewing ? `${previewWidth}px` : "100vw";

  return (
    <NavContext.Provider value={go}>
      <TextStylesContext.Provider value={textStyles(general)}>
      <ButtonRulesContext.Provider value={ui.buttons}>
      <WaitContext.Provider value={waitApi}>
      <div
        className={`site dock-${dock} ${editing ? "editing" : ""} ${previewing ? "phone-preview" : ""} ${ui.toggle.hidePhone ? "hide-toggle-phone" : ""}`}
        style={{ ...vars, ...toggleVars }}
      >
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {barIds.length > 1 && (
          <TabBar ids={barIds} pages={pages} active={activeTab} onPick={go} />
        )}
        <HintWidget hint={ui.hint} count={waitCount} el={waitEl} style={hintVars} />
        <div className="tab-stage" ref={stageRef}>
          <div key={activeTab} className="tab-current">
            <Canvas
              page={view}
              editing={editing}
              selectedId={selectedId}
              onSelect={setSelectedId}
              selectedSectionId={selectedSectionId}
            />
          </div>
        </div>
        <button className="edit-toggle" onClick={() => setEditing((v) => !v)}>
          {editing ? "Close workshop" : "Workshop"} <kbd>F2</kbd>
        </button>
        {editing && (
          <ErrorBoundary onClose={() => setEditing(false)}>
          <Editor
            site={general}
            rootSite={site}
            setRootSite={setRootSite}
            edited={editedFiles(data)}
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
          </ErrorBoundary>
        )}
      </div>
      </WaitContext.Provider>
      </ButtonRulesContext.Provider>
      </TextStylesContext.Provider>
    </NavContext.Provider>
  );
}
