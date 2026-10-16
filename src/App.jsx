import React, { useEffect, useState } from "react";
import siteConfig from "./config/site.json";
import pageConfig from "./config/pages/main.json";
import {
  DEFAULT_TEXT,
  applyPhone,
  validatePage,
  validateSite,
} from "./lib/model.js";
import { Canvas } from "./components/Canvas.jsx";
import { Editor } from "./components/Editor.jsx";
import { startScrollEffects } from "./lib/scroll.js";

const DRAFT_KEY = "site-editor-draft-v2";
const SAVED = { site: siteConfig, page: pageConfig };

// Short fingerprint of the saved config. A draft only applies to the config it
// was made from, so an updated config file is never hidden by an old draft.
function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++)
    h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return String(h);
}
const BASE = hash(JSON.stringify(SAVED));

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
    const errors = [
      ...validateSite(draft.data.site),
      ...validatePage(draft.data.page, draft.data.site),
    ];
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

export default function App() {
  const [initial] = useState(loadDraft);
  const [data, setData] = useState(initial.data);
  const [notice, setNotice] = useState(initial.notice);
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
  const { site, page } = data;

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

  const setSite = (fn) => setData((d) => ({ ...d, site: fn(d.site) }));
  const setPage = (fn) => setData((d) => ({ ...d, page: fn(d.page) }));
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
  };

  // Palette values become CSS variables; roles point at palette numbers.
  const vars = {};
  site.palette.forEach((c, i) => (vars[`--color-${i + 1}`] = c));
  for (const [role, n] of Object.entries(site.roles))
    vars[`--c-${role}`] = `var(--color-${n})`;
  const sizes = { ...DEFAULT_TEXT, ...(site.text || {}) };
  for (const [key, px] of Object.entries(sizes))
    vars[`--size-${key}`] = `${px}px`;
  vars["--preview-w"] = `${previewWidth}px`;

  return (
    <div
      className={`site dock-${dock} ${editing ? "editing" : ""} ${previewing ? "phone-preview" : ""}`}
      style={vars}
    >
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <Canvas
        page={view}
        editing={editing}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selectedSectionId={selectedSectionId}
        previewWidth={previewing ? previewWidth : 0}
      />
      <button className="edit-toggle" onClick={() => setEditing((v) => !v)}>
        {editing ? "Close workshop" : "Workshop"} <kbd>F2</kbd>
      </button>
      {editing && (
        <Editor
          site={site}
          page={page}
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
  );
}
