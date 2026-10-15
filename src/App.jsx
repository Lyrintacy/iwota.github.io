import React, { useEffect, useState } from "react";
import siteConfig from "./config/site.json";
import pageConfig from "./config/pages/main.json";
import { DEFAULT_TEXT, validatePage, validateSite } from "./lib/model.js";
import { Canvas } from "./components/Canvas.jsx";
import { Editor } from "./components/Editor.jsx";

const DRAFT_KEY = "site-editor-draft-v2";
const SAVED = { site: siteConfig, page: pageConfig };

// Short fingerprint of the saved config. A draft only applies to the config it
// was made from, so an updated site.json is never hidden by an old draft.
function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
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
        notice: "The saved config changed since your last draft, so the draft was discarded.",
      };
    const errors = [...validateSite(draft.data.site), ...validatePage(draft.data.page)];
    if (errors.length) throw new Error(errors.join("; "));
    return { data: draft.data, notice: "" };
  } catch (e) {
    return { data: SAVED, notice: `Local draft ignored: ${e.message}` };
  }
}

export default function App() {
  const [initial] = useState(loadDraft);
  const [data, setData] = useState(initial.data);
  const [notice, setNotice] = useState(initial.notice);
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const { site, page } = data;

  const draft = JSON.stringify(data) !== JSON.stringify(SAVED);
  useEffect(() => {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify({ base: BASE, data }));
    else localStorage.removeItem(DRAFT_KEY);
  }, [data, draft]);

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
    setNotice("");
  };

  // Palette values become CSS variables; roles point at palette numbers.
  const vars = {};
  site.palette.forEach((c, i) => (vars[`--color-${i + 1}`] = c));
  for (const [role, n] of Object.entries(site.roles))
    vars[`--c-${role}`] = `var(--color-${n})`;
  const sizes = { ...DEFAULT_TEXT, ...(site.text || {}) };
  for (const [key, px] of Object.entries(sizes)) vars[`--size-${key}`] = `${px}px`;

  return (
    <div className={`site ${editing ? "editing" : ""}`} style={vars}>
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <Canvas
        page={page}
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
          site={site}
          page={page}
          setSite={setSite}
          setPage={setPage}
          draft={draft}
          onReset={reset}
          onClose={() => setEditing(false)}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          selectedSectionId={selectedSectionId}
          setSelectedSectionId={setSelectedSectionId}
        />
      )}
    </div>
  );
}
