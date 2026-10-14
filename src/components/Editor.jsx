import React, { useRef, useState } from "react";
import JSZip from "jszip";
import { validateBundle, DRAFT_KEY, resolvePage } from "../lib/config.js";
import { download, exportConfigs } from "../lib/export.js";
import { useDialog } from "../lib/hooks.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
const label = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
const choices = {
  align: ["center", "left", "right", "stretch"],
  kind: ["image", "video"],
  mode: ["paragraph", "big", "pointed"],
  repeat: ["stretch", "repeat", "round"],
};

/** Recursive field editor keeps every configuration property editable without
 * coupling the editor to presentation components. Structural additions below
 * supply valid templates rather than asking the user to write JSON. */
function Fields({ value, onChange, name = "", path = "" }) {
  const [uploadError, setUploadError] = useState("");
  if (typeof value === "boolean")
    return (
      <label className="editor-check">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label(name)}
      </label>
    );
  if (typeof value === "number")
    return (
      <label className="editor-field">
        {label(name)}
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  if (typeof value === "string") {
    const options =
      name === "mode" && path.includes("slice")
        ? ["none", "three-horizontal", "three-vertical", "nine"]
        : choices[name];
    const color = /^#[0-9a-f]{6}$/i.test(value);
    async function upload(file) {
      if (!file) return;
      if (
        !/^image\/(png|jpeg|gif|webp)$/.test(file.type) ||
        file.size > 6 * 1024 * 1024
      ) {
        setUploadError(
          "Choose PNG, JPEG, GIF, or WebP, up to 6 MB. Use a file path for larger media/videos.",
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result);
        setUploadError("");
      };
      reader.onerror = () => setUploadError("Could not read the image.");
      reader.readAsDataURL(file);
    }
    return (
      <label className={`editor-field ${color ? "color-field" : ""}`}>
        {label(name)}
        {color && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {options ? (
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        ) : value.includes("\n") ||
          value.length > 95 ||
          ["text", "description", "intro"].includes(name) ? (
          <textarea
            value={value}
            rows={value.startsWith("data:") ? 2 : 3}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        {[
          "src",
          "thumbnail",
          "preview",
          "tocImage",
          "roof",
          "hero",
          "ending",
          "leftBorder",
          "rightBorder",
          "cardFrame",
          "portal",
        ].includes(name) && (
          <span className="upload-control">
            Embed image
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={(e) => upload(e.target.files[0])}
            />
          </span>
        )}
        {uploadError && <span role="alert">{uploadError}</span>}
      </label>
    );
  }
  if (Array.isArray(value)) {
    const tuple = ["margin", "insets", "cardSlice"].includes(name);
    return (
      <fieldset className="editor-array">
        <legend>
          {label(name)}
          {tuple ? " (top / right / bottom / left)" : ""}
        </legend>
        {value.map((item, i) => (
          <div className="array-item" key={i}>
            <Fields
              value={item}
              name={`${i + 1}`}
              path={`${path}.${i}`}
              onChange={(v) =>
                onChange(value.map((old, n) => (n === i ? v : old)))
              }
            />
            {!tuple && (
              <button
                type="button"
                className="mini-button"
                aria-label={`Remove ${name} ${i + 1}`}
                onClick={() => onChange(value.filter((_, n) => n !== i))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        {!tuple && (
          <button
            type="button"
            className="mini-button"
            onClick={() =>
              onChange([
                ...value,
                typeof value[0] === "object" ? clone(value[0]) : "",
              ])
            }
          >
            + Add {label(name)}
          </button>
        )}
      </fieldset>
    );
  }
  if (value && typeof value === "object")
    return (
      <div className="editor-fields">
        {Object.entries(value).map(([key, item]) => {
          const nested =
            item && typeof item === "object" && !Array.isArray(item);
          return nested ? (
            <details
              className="editor-group"
              key={key}
              open={["effects", "slice"].includes(key)}
            >
              <summary>{label(key)}</summary>
              <Fields
                name={key}
                path={`${path}.${key}`}
                value={item}
                onChange={(v) => onChange({ ...value, [key]: v })}
              />
            </details>
          ) : (
            <Fields
              key={key}
              name={key}
              path={`${path}.${key}`}
              value={item}
              onChange={(v) => onChange({ ...value, [key]: v })}
            />
          );
        })}
      </div>
    );
  return null;
}
function MoveControls({ index, count, onMove, onDuplicate, onRemove, title }) {
  return (
    <div className="move-controls">
      <button
        disabled={!index}
        onClick={() => onMove(-1)}
        aria-label={`Move ${title} up`}
      >
        ↑
      </button>
      <button
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label={`Move ${title} down`}
      >
        ↓
      </button>
      <button onClick={onDuplicate} aria-label={`Duplicate ${title}`}>
        ⧉
      </button>
      <button onClick={onRemove} aria-label={`Remove ${title}`}>
        ×
      </button>
    </div>
  );
}
function reorder(items, index, delta) {
  const result = [...items];
  [result[index], result[index + delta]] = [
    result[index + delta],
    result[index],
  ];
  return result;
}
const newBlock = (type) =>
  type === "text"
    ? {
        id: uid("text"),
        type,
        mode: "paragraph",
        text: "Write something **worth exploring**.",
        effects: { shake: false, flash: false, wobble: false },
      }
    : type === "tags"
      ? { id: uid("tags"), type, items: ["New tag"] }
      : {
          id: uid("media"),
          type: "media",
          kind: "image",
          src: "art/hero.svg",
          alt: "Describe your image",
          caption: "",
          maxWidth: 760,
          maxHeight: 480,
          align: "center",
          margin: [24, 0, 24, 0],
          slice: { mode: "none", insets: [24, 24, 24, 24], repeat: "stretch" },
          effects: { shake: false, flash: false, wobble: false },
        };
function SectionFields({ section, onChange }) {
  const { blocks, ...meta } = section;
  return (
    <>
      <Fields value={meta} onChange={(v) => onChange({ ...v, blocks })} />
      <div className="block-editor">
        <h4>Content blocks</h4>
        {blocks.map((block, i) => (
          <details key={block.id} className="editor-group">
            <summary>
              {String(i + 1).padStart(2, "0")} / {block.type} — {block.id}
            </summary>
            <MoveControls
              title={`block ${i + 1}`}
              index={i}
              count={blocks.length}
              onMove={(delta) =>
                onChange({ ...section, blocks: reorder(blocks, i, delta) })
              }
              onDuplicate={() => {
                const copy = clone(block);
                copy.id = uid(block.type);
                const next = [...blocks];
                next.splice(i + 1, 0, copy);
                onChange({ ...section, blocks: next });
              }}
              onRemove={() =>
                onChange({
                  ...section,
                  blocks: blocks.filter((_, n) => n !== i),
                })
              }
            />
            <Fields
              value={block}
              onChange={(v) =>
                onChange({
                  ...section,
                  blocks: blocks.map((old, n) => (n === i ? v : old)),
                })
              }
            />
          </details>
        ))}
        <div className="add-buttons">
          {["text", "media", "tags"].map((type) => (
            <button
              key={type}
              onClick={() =>
                onChange({ ...section, blocks: [...blocks, newBlock(type)] })
              }
            >
              + {label(type)}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
export default function Editor({
  bundle,
  published,
  pageId,
  onApply,
  onClose,
}) {
  const [working, setWorking] = useState(() => clone(bundle)),
    [scope, setScope] = useState(pageId),
    [tab, setTab] = useState("content"),
    [raw, setRaw] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const ref = useRef(null);
  useDialog(ref, onClose);
  const current = scope === "global" ? working.global : working.pages[scope];
  function update(value) {
    setWorking((old) =>
      scope === "global"
        ? { ...old, global: value }
        : { ...old, pages: { ...old.pages, [scope]: value } },
    );
    setMessage("Unapplied changes");
    setError("");
  }
  function checked() {
    const candidate =
      tab === "json"
        ? scope === "global"
          ? { ...working, global: JSON.parse(raw) }
          : {
              ...working,
              pages: { ...working.pages, [scope]: JSON.parse(raw) },
            }
        : working;
    return validateBundle(candidate);
  }
  function switchTab(next) {
    try {
      let data = working;
      if (tab === "json") {
        data = checked();
        setWorking(data);
      }
      if (next === "json")
        setRaw(
          JSON.stringify(
            scope === "global" ? data.global : data.pages[scope],
            null,
            2,
          ),
        );
      setTab(next);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  function apply(close = false) {
    try {
      const data = checked();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      onApply(data, true);
      setWorking(data);
      setMessage("Draft saved in this browser. Export to publish.");
      setError("");
      if (close) onClose();
    } catch (e) {
      setError(
        e.name === "QuotaExceededError"
          ? "Browser storage is full. Export your config now; use asset paths instead of large embedded images."
          : e.message,
      );
    }
  }
  async function exportFile(kind) {
    try {
      const data = checked();
      if (kind === "zip") await exportConfigs(data);
      else if (kind === "page")
        download(
          `${scope}.json`,
          JSON.stringify(
            scope === "global" ? data.global : data.pages[scope],
            null,
            2,
          ),
        );
      else download("iwota-config.json", JSON.stringify(data, null, 2));
      setMessage(
        "Exported. Your live site is unchanged until you upload the files.",
      );
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  async function importFile(file) {
    if (!file) return;
    try {
      if (file.size > 30 * 1024 * 1024)
        throw new Error("Import limit is 30 MB.");
      let data;
      if (file.name.endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        const manifest = JSON.parse(
          await zip.file("config/manifest.json").async("string"),
        );
        const global = JSON.parse(
          await zip.file(`config/${manifest.global}`).async("string"),
        );
        const pages = await Promise.all(
          manifest.pages.map(async (path) =>
            JSON.parse(await zip.file(`config/${path}`).async("string")),
          ),
        );
        data = {
          global,
          pages: Object.fromEntries(pages.map((page) => [page.id, page])),
        };
      } else {
        const json = JSON.parse(await file.text());
        data =
          json.global && json.pages
            ? json
            : json.id
              ? { ...working, pages: { ...working.pages, [json.id]: json } }
              : { ...working, global: json };
      }
      setWorking(validateBundle(data));
      setTab("content");
      if (scope !== "global" && !data.pages[scope]) setScope("main");
      setMessage("Imported into the editor. Apply to preview it.");
      setError("");
    } catch (e) {
      setError(`Import failed: ${e.message}`);
    }
  }
  function addPage() {
    const id = uid("project");
    const page = {
      id,
      title: "New expedition",
      subtitle: "A new world to explore",
      theme: {},
      visuals: {},
      project: {
        index:
          Math.max(
            0,
            ...Object.values(working.pages).map((p) => p.project?.index || 0),
          ) + 1,
        team: "Not specified",
        timeframe: "Not specified",
        engine: "Your engine",
        role: "Your role",
        thumbnail: "art/nebula.svg",
        preview: "",
        description: "Tell the story behind your project.",
        url: "",
        tags: [],
        effects: { shake: true, flash: true, wobble: false },
        cardSlice: [24, 24, 24, 24],
      },
      sections: [
        {
          id: "overview",
          type: "content",
          title: "Overview",
          intro: "A new adventure.",
          eyebrow: "01 / OVERVIEW",
          tocImage: "",
          blocks: [newBlock("text")],
        },
        {
          id: "return",
          type: "ending",
          title: "Back to the field guide",
          eyebrow: "END OF EXPEDITION",
          blocks: [],
        },
      ],
    };
    const next = clone(working);
    next.pages[id] = page;
    const gallery = next.pages.main.sections.find((s) => s.type === "projects");
    if (gallery) gallery.projectIds = [...(gallery.projectIds || []), id];
    setWorking(next);
    setScope(id);
    setTab("content");
    setMessage("New tab added to the main project grid.");
  }
  return (
    <div className="editor-backdrop">
      <aside
        ref={ref}
        className="editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="editor-header">
          <div>
            <span className="eyebrow">YOUR WORLD, YOUR RULES</span>
            <h2 id="editor-title">
              The workshop<span>F2</span>
            </h2>
          </div>
          <button
            className="editor-close"
            onClick={onClose}
            aria-label="Close editor"
          >
            ×
          </button>
        </div>
        <p className="editor-notice">
          Local editing only. Nothing is published automatically.{" "}
          <strong>Apply</strong> saves a browser draft; <strong>Export</strong>{" "}
          gives you the files to publish.
        </p>
        <div className="editor-scope">
          <label>
            Editing
            <select
              value={scope}
              onChange={(e) => {
                if (tab === "json") {
                  setError(
                    "Return to Content to validate JSON before switching files.",
                  );
                  return;
                }
                setScope(e.target.value);
              }}
            >
              <option value="global">Global settings</option>
              {Object.values(working.pages).map((page) => (
                <option key={page.id} value={page.id}>
                  {page.id === "main" ? "Main page" : page.title}
                </option>
              ))}
            </select>
          </label>
          <button onClick={addPage}>+ Project tab</button>
        </div>
        <nav className="editor-tabs" aria-label="Editor views">
          {["content", "theme", "json"].map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t === "json" ? "Advanced JSON" : label(t)}
            </button>
          ))}
        </nav>
        <div className="editor-body">
          {tab === "json" ? (
            <>
              <p className="editor-help">
                Schema-validated JSON. IDs must be unique; page IDs must match
                their file keys. Rich text supports **bold** and
                [links](https://example.com).
              </p>
              <textarea
                className="json-editor"
                aria-label="Configuration JSON"
                spellCheck="false"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
              />
            </>
          ) : tab === "theme" ? (
            <>
              <h3>
                {scope === "global"
                  ? "Global palette & illustration"
                  : "Page overrides"}
              </h3>
              <p className="editor-help">
                Empty page overrides inherit the global design. Images use
                relative paths inside the uploaded website, external URLs, or
                embedded images.
              </p>
              {scope !== "global" && (
                <div className="add-buttons">
                  <button
                    onClick={() =>
                      update({
                        ...current,
                        ...resolvePage(
                          working.global,
                          current,
                          working.pages.main,
                        ),
                      })
                    }
                  >
                    Customize this page
                  </button>
                  <button
                    onClick={() =>
                      update({ ...current, theme: {}, visuals: {} })
                    }
                  >
                    Reset to inherited
                  </button>
                </div>
              )}
              <Fields
                value={{
                  theme: current.theme,
                  visuals: current.visuals,
                  ...(scope === "global"
                    ? { fonts: current.fonts, motion: current.motion }
                    : {}),
                }}
                onChange={(v) => update({ ...current, ...v })}
              />
            </>
          ) : scope === "global" ? (
            <Fields
              value={Object.fromEntries(
                Object.entries(current).filter(
                  ([k]) => !["theme", "visuals", "fonts", "motion"].includes(k),
                ),
              )}
              onChange={(v) => update({ ...current, ...v })}
            />
          ) : (
            <>
              <Fields
                value={Object.fromEntries(
                  Object.entries(current).filter(
                    ([k]) => !["sections", "theme", "visuals"].includes(k),
                  ),
                )}
                onChange={(v) => update({ ...current, ...v })}
              />
              <h3 className="editor-section-heading">
                Sections <span>{current.sections.length}</span>
              </h3>
              <p className="editor-help">
                Reorder freely. Every section appears in the contents rail. Add
                text, media, and tags inside a content section.
              </p>
              {current.sections.map((section, i) => (
                <details className="editor-section" key={section.id}>
                  <summary>
                    <span>
                      {String(i + 1).padStart(2, "0")} / {section.title}
                    </span>
                    <small>{section.type}</small>
                  </summary>
                  <MoveControls
                    title={`section ${i + 1}`}
                    index={i}
                    count={current.sections.length}
                    onMove={(delta) =>
                      update({
                        ...current,
                        sections: reorder(current.sections, i, delta),
                      })
                    }
                    onDuplicate={() => {
                      const copy = clone(section);
                      copy.id = uid("section");
                      copy.title += " (copy)";
                      const sections = [...current.sections];
                      sections.splice(i + 1, 0, copy);
                      update({ ...current, sections });
                    }}
                    onRemove={() =>
                      update({
                        ...current,
                        sections: current.sections.filter((_, n) => n !== i),
                      })
                    }
                  />
                  <SectionFields
                    section={section}
                    onChange={(v) =>
                      update({
                        ...current,
                        sections: current.sections.map((old, n) =>
                          n === i ? v : old,
                        ),
                      })
                    }
                  />
                </details>
              ))}
              <div className="add-buttons">
                {["content", "projects", "contact", "ending"].map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      update({
                        ...current,
                        sections: [
                          ...current.sections,
                          {
                            id: uid("section"),
                            type,
                            title: "New section",
                            eyebrow: "FIELD NOTES",
                            intro: "",
                            tocImage: "",
                            blocks:
                              type === "content" ? [newBlock("text")] : [],
                            ...(type === "projects" ? { projectIds: [] } : {}),
                          },
                        ],
                      })
                    }
                  >
                    + {label(type)}
                  </button>
                ))}
              </div>
              {scope !== "main" && (
                <button
                  className="danger-button"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete ${current.title} and remove its references?`,
                      )
                    )
                      return;
                    const next = clone(working);
                    delete next.pages[scope];
                    next.global.featured = next.global.featured.filter(
                      (id) => id !== scope,
                    );
                    Object.values(next.pages).forEach((page) =>
                      page.sections.forEach((s) => {
                        if (s.projectIds)
                          s.projectIds = s.projectIds.filter(
                            (id) => id !== scope,
                          );
                      }),
                    );
                    setWorking(next);
                    setScope("main");
                  }}
                >
                  Delete this project tab
                </button>
              )}
            </>
          )}
        </div>
        <div className="editor-bottom">
          <p role="status" className={error ? "editor-error" : "editor-status"}>
            {error || message || "Ready to make something yours."}
          </p>
          <div className="editor-primary-actions">
            <button className="primary-button" onClick={() => apply(true)}>
              Apply & preview ↗
            </button>
            <button onClick={() => apply(false)}>Save draft</button>
          </div>
          <div className="editor-export">
            <button onClick={() => exportFile("zip")}>
              Export config ZIP ↓
            </button>
            <button onClick={() => exportFile("page")}>This file ↓</button>
            <button onClick={() => exportFile("bundle")}>Backup JSON ↓</button>
            <label className="import-button">
              Import
              <input
                type="file"
                accept=".json,.zip"
                onChange={(e) => {
                  importFile(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={() => {
                if (
                  !window.confirm(
                    "Discard the local draft and reload the published configuration? Export a backup first if needed.",
                  )
                )
                  return;
                try {
                  localStorage.removeItem(DRAFT_KEY);
                  setWorking(clone(published));
                  setScope("main");
                  setTab("content");
                  onApply(published, false);
                  setMessage("Restored the published files.");
                  setError("");
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Reset draft
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
