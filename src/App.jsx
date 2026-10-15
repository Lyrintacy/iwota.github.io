import React, { useEffect, useState } from "react";
import siteConfig from "./config/site.json";
import pageConfig from "./config/pages/main.json";
import { validatePage, validateSite } from "./lib/model.js";
import { Canvas } from "./components/Canvas.jsx";
import { Editor } from "./components/Editor.jsx";

const DRAFT_KEY = "site-editor-draft-v1";
const SAVED = { site: siteConfig, page: pageConfig };

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { data: SAVED, notice: "" };
    const draft = JSON.parse(raw);
    const errors = [...validateSite(draft.site), ...validatePage(draft.page)];
    if (errors.length) throw new Error(errors.join("; "));
    return { data: draft, notice: "" };
  } catch (e) {
    return {
      data: SAVED,
      notice: `Local draft ignored: ${e.message}. Saved config is shown.`,
    };
  }
}

export default function App() {
  const [initial] = useState(loadDraft);
  const [data, setData] = useState(initial.data);
  const [notice, setNotice] = useState(initial.notice);
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const { site, page } = data;

  const draft = JSON.stringify(data) !== JSON.stringify(SAVED);
  useEffect(() => {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
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
        />
      )}
    </div>
  );
}
