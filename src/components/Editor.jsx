import React, { useEffect, useRef, useState } from "react";
import {
  ANCHORS,
  COLORS,
  DEFAULT_TEXT,
  ROLES,
  SIZE_UNITS,
  TYPES,
  UNITS,
  formatAt,
  newItem,
  newSection,
  toggleFormat,
  uid,
} from "../lib/model.js";
import { hasExt, useMedia } from "../lib/media.js";

const TYPE_LABEL = { text: "Text", image: "Image", gif: "GIF", video: "Video" };
const HORIZONTAL = { start: "Left", center: "Centre", end: "Right", stretch: "Left + right" };
const VERTICAL = { start: "Top", center: "Middle", end: "Bottom", stretch: "Top + bottom" };
const PIVOTS = [
  [0, 0], [50, 0], [100, 0],
  [0, 50], [50, 50], [100, 50],
  [0, 100], [50, 100], [100, 100],
];
const TEXT_SIZE_LABELS = { body: "Body text", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3" };

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

const parseNumber = (t) => (t.trim() === "" || t === "-" ? NaN : Number(t));

// Free typing (the field can be empty while editing). The − button adds or
// removes the minus sign at the start. Only valid numbers reach the config.
function NumberField({ label, value, onChange }) {
  const [text, setText] = useState(String(value ?? 0));
  useEffect(() => {
    if (parseNumber(text) !== value) setText(String(value ?? 0));
  }, [value]);
  const update = (t) => {
    setText(t);
    const n = parseNumber(t);
    if (!Number.isNaN(n)) onChange(n);
  };
  return (
    <Field label={label}>
      <span className="num">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => update(e.target.value)}
          onBlur={() => setText(String(value ?? 0))}
        />
        <button
          type="button"
          aria-label="Toggle minus sign"
          title="Add or remove the minus sign"
          onClick={() => update(text.startsWith("-") ? text.slice(1) : `-${text}`)}
        >
          −
        </button>
      </span>
    </Field>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </Field>
  );
}

// Keeps partial typing local; only valid #RRGGBB values reach the config.
function HexField({ value, onValid }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onValid(e.target.value);
      }}
    />
  );
}

function AxisFields({ title, axisValue = {}, labels, onChange }) {
  const a = axisValue;
  return (
    <fieldset className="axis">
      <legend>{title}</legend>
      <Select
        label="Pin to"
        value={a.anchor}
        options={ANCHORS.map((v) => [v, labels[v]])}
        onChange={(anchor) => onChange({ anchor })}
      />
      <NumberField
        label={a.anchor === "center" ? "Shift (− = left/up, + = right/down)" : "Offset"}
        value={a.offset}
        onChange={(offset) => onChange({ offset })}
      />
      {a.anchor === "stretch" && (
        <NumberField
          label="Offset from the other edge"
          value={a.offsetEnd}
          onChange={(offsetEnd) => onChange({ offsetEnd })}
        />
      )}
      <Select
        label="Offset unit"
        value={a.unit}
        options={UNITS.map((u) => [u, u === "%" ? "% of canvas" : "px"])}
        onChange={(unit) => onChange({ unit })}
      />
      {a.anchor !== "stretch" && (
        <>
          <NumberField label="Size" value={a.size} onChange={(size) => onChange({ size })} />
          <Select
            label="Size unit"
            value={a.sizeUnit}
            options={SIZE_UNITS.map((u) => [u, u === "%" ? "% of canvas" : u])}
            onChange={(sizeUnit) => onChange({ sizeUnit })}
          />
        </>
      )}
    </fieldset>
  );
}

const FORMATS = [
  ["bold", "Bold", (f) => f.bold],
  ["italic", "Italic", (f) => f.italic],
  ["s", "Secondary", (f) => f.colour === "secondary"],
  ["h", "Highlight", (f) => f.colour === "highlight"],
];

function TextEditor({ item, onChange, setStatus }) {
  const ref = useRef(null);
  const [sel, setSel] = useState({ s: 0, e: 0 });
  const flags = formatAt(item.text, sel.s, sel.e);
  const track = (el) => setSel({ s: el.selectionStart, e: el.selectionEnd });

  // Press once to apply to the selection, press again to remove it.
  const apply = (kind) => {
    const el = ref.current;
    const r = toggleFormat(item.text, el.selectionStart, el.selectionEnd, kind);
    if (!r) {
      setStatus("Select some text first, then press a format button.");
      return;
    }
    setStatus("");
    onChange({ text: r.text });
    setSel({ s: r.s, e: r.e });
    requestAnimationFrame(() => el.setSelectionRange(r.s, r.e));
  };

  return (
    <>
      <div className="toolbar">
        {FORMATS.map(([kind, label, on]) => (
          <button
            key={kind}
            type="button"
            className={on(flags) ? "on" : ""}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(kind)}
          >
            {label}
          </button>
        ))}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => apply("n")}>
          Clear colour
        </button>
      </div>
      <Field label="Text (select words, then press a format button)">
        <textarea
          ref={ref}
          rows={5}
          value={item.text}
          onChange={(e) => {
            onChange({ text: e.target.value });
            track(e.target);
          }}
          onSelect={(e) => track(e.target)}
        />
      </Field>
      <Select
        label="Heading"
        value={item.level}
        options={[["p", "Body text"], ["h1", "Heading 1"], ["h2", "Heading 2"], ["h3", "Heading 3"]]}
        onChange={(level) => onChange({ level })}
      />
      <Select
        label="Alignment"
        value={item.align}
        options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]}
        onChange={(align) => onChange({ align })}
      />
      <Select
        label="Base colour"
        value={item.color}
        options={COLORS.map((c) => [c, c[0].toUpperCase() + c.slice(1)])}
        onChange={(color) => onChange({ color })}
      />
    </>
  );
}

// Typing without an extension: the first existing file (png, jpeg, jpg; mp4,
// webm for video) is found and its extension is written into the config.
function FilePath({ label, value = "", type, onChange, placeholder }) {
  const { url, ext } = useMedia(type, value);
  useEffect(() => {
    if (ext && value.trim() && !hasExt(value)) onChange(`${value.trim()}.${ext}`);
  }, [ext]);
  return (
    <>
      <Field label={label}>
        <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </Field>
      <p className="hint">
        {value.trim() ? (
          <>Loads from <code>{url}</code></>
        ) : (
          "Type folder/name, for example 0/profile. The extension is found automatically."
        )}
      </p>
    </>
  );
}

const paletteOptions = (site) => site.palette.map((c, i) => [String(i + 1), `${i + 1} · ${c}`]);

export function Editor({
  site,
  page,
  setSite,
  setPage,
  draft,
  onReset,
  onClose,
  selectedId,
  setSelectedId,
  selectedSectionId,
  setSelectedSectionId,
}) {
  const [tab, setTab] = useState("page");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const index = page.items.findIndex((i) => i.id === selectedId);
  const item = index >= 0 ? page.items[index] : null;

  const updateItem = (fn) =>
    setPage((p) => ({ ...p, items: p.items.map((i) => (i.id === selectedId ? fn(i) : i)) }));
  const patch = (values) => updateItem((i) => ({ ...i, ...values }));
  const patchAxis = (axis, values) =>
    updateItem((i) => ({ ...i, [axis]: { ...i[axis], ...values } }));

  const add = (type) => {
    const created = newItem(type, uid(type));
    setPage((p) => ({ ...p, items: [...p.items, created] }));
    setSelectedId(created.id);
  };
  const move = (delta) =>
    setPage((p) => {
      const list = [...p.items];
      const to = index + delta;
      if (to < 0 || to >= list.length) return p;
      [list[index], list[to]] = [list[to], list[index]];
      return { ...p, items: list };
    });
  const duplicate = () => {
    const copy = { ...structuredClone(item), id: uid(item.type) };
    setPage((p) => {
      const list = [...p.items];
      list.splice(index + 1, 0, copy);
      return { ...p, items: list };
    });
    setSelectedId(copy.id);
  };
  const remove = () => {
    if (!window.confirm(`Delete "${item.name || TYPE_LABEL[item.type]}"?`)) return;
    setPage((p) => ({ ...p, items: p.items.filter((i) => i.id !== selectedId) }));
    setSelectedId(null);
  };

  // Sections: background bands behind the items.
  const sections = page.sections || [];
  const sIndex = sections.findIndex((x) => x.id === selectedSectionId);
  const section = sIndex >= 0 ? sections[sIndex] : null;
  const setSections = (fn) => setPage((p) => ({ ...p, sections: fn(p.sections || []) }));
  const patchSection = (values) =>
    setSections((list) => list.map((x) => (x.id === selectedSectionId ? { ...x, ...values } : x)));
  const patchTexture = (values) =>
    patchSection({ texture: { ...section.texture, ...values } });
  const patchOverlay = (values) =>
    patchSection({ overlay: { ...section.overlay, ...values } });
  const addSection = () => {
    const bottom = Math.max(0, ...sections.map((x) => x.start + x.height));
    const created = newSection(uid("section"), bottom);
    setSections((list) => [...list, created]);
    setSelectedSectionId(created.id);
  };
  const moveSection = (delta) =>
    setSections((list) => {
      const to = sIndex + delta;
      if (to < 0 || to >= list.length) return list;
      const copy = [...list];
      [copy[sIndex], copy[to]] = [copy[to], copy[sIndex]];
      return copy;
    });
  const duplicateSection = () => {
    const copy = { ...structuredClone(section), id: uid("section"), start: section.start + section.height };
    setSections((list) => {
      const next = [...list];
      next.splice(sIndex + 1, 0, copy);
      return next;
    });
    setSelectedSectionId(copy.id);
  };
  const removeSection = () => {
    if (!window.confirm(`Delete "${section.name || "this section"}"?`)) return;
    setSections((list) => list.filter((x) => x.id !== selectedSectionId));
    setSelectedSectionId(null);
  };

  const setColour = (n, hex) =>
    setSite((s) => ({ ...s, palette: s.palette.map((c, i) => (i === n ? hex : c)) }));
  const setRole = (role, n) => setSite((s) => ({ ...s, roles: { ...s.roles, [role]: n } }));
  const sizes = { ...DEFAULT_TEXT, ...(site.text || {}) };
  const setSize = (key, px) => setSite((s) => ({ ...s, text: { ...sizes, [key]: px } }));

  const siteText = JSON.stringify(site, null, 2) + "\n";
  const pageText = JSON.stringify(page, null, 2) + "\n";
  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${label} copied.`);
    } catch {
      setCopied("Copy blocked by the browser. Select the text and copy it manually.");
    }
  };

  return (
    <aside className="editor" aria-label="Workshop">
      <header>
        <strong>Workshop</strong>
        {draft && <span className="badge">Unsaved draft</span>}
      </header>
      <nav className="tabs">
        {[["page", "Page"], ["general", "General"], ["export", "Export"]].map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "page" && (
        <div className="panel">
          <NumberField
            label="Page height (px) — grows to fit sections"
            value={page.canvas.height}
            onChange={(height) => setPage((p) => ({ ...p, canvas: { ...p.canvas, height } }))}
          />

          <h4>Sections (background bands)</h4>
          <ul className="items">
            {sections.map((x, n) => (
              <li key={x.id}>
                <button
                  className={x.id === selectedSectionId ? "on" : ""}
                  onClick={() => setSelectedSectionId(x.id)}
                >
                  {n + 1}. {x.name || "Section"} <small>{x.start}–{x.start + x.height}px</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="row">
            <button onClick={addSection}>+ Section</button>
          </div>

          {section && (
            <div className="details" key={section.id}>
              <Field label="Name (for you)">
                <input value={section.name} onChange={(e) => patchSection({ name: e.target.value })} />
              </Field>
              <div className="row">
                <button disabled={sIndex === 0} onClick={() => moveSection(-1)}>↑ Up</button>
                <button disabled={sIndex === sections.length - 1} onClick={() => moveSection(1)}>↓ Down</button>
                <button onClick={duplicateSection}>Duplicate</button>
                <button className="danger" onClick={removeSection}>Delete</button>
              </div>
              <div className="axis-grid">
                <NumberField
                  label="Start height (px)"
                  value={section.start}
                  onChange={(start) => patchSection({ start: Math.max(0, start) })}
                />
                <NumberField
                  label="Height (px)"
                  value={section.height}
                  onChange={(height) => patchSection({ height: Math.max(1, height) })}
                />
              </div>
              <Select
                label="Background colour (palette number)"
                value={String(section.background)}
                options={paletteOptions(site)}
                onChange={(n) => patchSection({ background: Number(n) })}
              />

              <fieldset className="axis">
                <legend>Texture (tiled)</legend>
                <FilePath
                  label="File (in public/images/, extension optional)"
                  value={section.texture.file}
                  type="image"
                  placeholder="0/texture"
                  onChange={(file) => patchTexture({ file })}
                />
                <NumberField
                  label="Tile size (px wide)"
                  value={section.texture.size}
                  onChange={(size) => patchTexture({ size: Math.max(1, size) })}
                />
                <NumberField
                  label="Offset X (px)"
                  value={section.texture.offsetX}
                  onChange={(offsetX) => patchTexture({ offsetX })}
                />
                <NumberField
                  label="Offset Y (px)"
                  value={section.texture.offsetY}
                  onChange={(offsetY) => patchTexture({ offsetY })}
                />
                <NumberField
                  label="Rotation (degrees)"
                  value={section.texture.rotate}
                  onChange={(rotate) => patchTexture({ rotate })}
                />
              </fieldset>

              <fieldset className="axis">
                <legend>Overlay</legend>
                <Select
                  label="Overlay colour (palette number)"
                  value={String(section.overlay.colour)}
                  options={paletteOptions(site)}
                  onChange={(n) => patchOverlay({ colour: Number(n) })}
                />
                <NumberField
                  label="Overlay opacity (%)"
                  value={section.overlay.opacity}
                  onChange={(opacity) => patchOverlay({ opacity: Math.min(100, Math.max(0, opacity)) })}
                />
              </fieldset>
            </div>
          )}
          <h4>Items</h4>
          <div className="row">
            {TYPES.map((t) => (
              <button key={t} onClick={() => add(t)}>
                + {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <ul className="items">
            {page.items.map((it, n) => (
              <li key={it.id}>
                <button
                  className={it.id === selectedId ? "on" : ""}
                  onClick={() => setSelectedId(it.id)}
                >
                  {n + 1}. {it.name || TYPE_LABEL[it.type]} <small>{it.type}</small>
                </button>
              </li>
            ))}
          </ul>
          {!item && <p className="hint">Select an item on the page or in this list to edit it.</p>}

          {item && (
            <div className="details" key={item.id}>
              <Field label="Name (for you)">
                <input value={item.name} onChange={(e) => patch({ name: e.target.value })} />
              </Field>
              <div className="row">
                <button disabled={index === 0} onClick={() => move(-1)}>↑ Up</button>
                <button disabled={index === page.items.length - 1} onClick={() => move(1)}>↓ Down</button>
                <button onClick={duplicate}>Duplicate</button>
                <button className="danger" onClick={remove}>Delete</button>
              </div>

              {item.type === "text" && (
                <TextEditor item={item} onChange={patch} setStatus={setStatus} />
              )}
              {status && <p className="hint warn">{status}</p>}
              {(item.type === "image" || item.type === "gif") && (
                <>
                  <FilePath
                    label="File (in public/images/, extension optional)"
                    value={item.file}
                    type={item.type}
                    placeholder="0/profile"
                    onChange={(file) => patch({ file })}
                  />
                  <Field label="Description (alt text)">
                    <input value={item.alt} onChange={(e) => patch({ alt: e.target.value })} />
                  </Field>
                  <Select
                    label="Fit"
                    value={item.fit}
                    options={[["contain", "Contain"], ["cover", "Cover"], ["fill", "Fill"]]}
                    onChange={(fit) => patch({ fit })}
                  />
                </>
              )}
              {item.type === "video" && (
                <>
                  <FilePath
                    label="File (in public/images/, extension optional)"
                    value={item.file}
                    type="video"
                    placeholder="0/clip"
                    onChange={(file) => patch({ file })}
                  />
                  <FilePath
                    label="Poster image (optional)"
                    value={item.poster}
                    type="image"
                    placeholder="0/poster"
                    onChange={(poster) => patch({ poster })}
                  />
                  {[["controls", "Show controls"], ["loop", "Loop"], ["autoplay", "Autoplay (muted)"]].map(
                    ([key, label]) => (
                      <label className="check" key={key}>
                        <input
                          type="checkbox"
                          checked={!!item[key]}
                          onChange={(e) => patch({ [key]: e.target.checked })}
                        />
                        {label}
                      </label>
                    ),
                  )}
                </>
              )}

              <AxisFields
                title="Horizontal constraint"
                axisValue={item.h}
                labels={HORIZONTAL}
                onChange={(v) => patchAxis("h", v)}
              />
              <AxisFields
                title="Vertical constraint"
                axisValue={item.v}
                labels={VERTICAL}
                onChange={(v) => patchAxis("v", v)}
              />

              <fieldset className="axis">
                <legend>Pivot & rotation</legend>
                <div className="pivot">
                  {PIVOTS.map(([x, y]) => (
                    <button
                      key={`${x}-${y}`}
                      className={item.pivot[0] === x && item.pivot[1] === y ? "on" : ""}
                      onClick={() => patch({ pivot: [x, y] })}
                      title={`Pivot ${x}% ${y}%`}
                    >
                      ·
                    </button>
                  ))}
                </div>
                <NumberField
                  label="Pivot X (% of item)"
                  value={item.pivot[0]}
                  onChange={(x) => patch({ pivot: [x, item.pivot[1]] })}
                />
                <NumberField
                  label="Pivot Y (% of item)"
                  value={item.pivot[1]}
                  onChange={(y) => patch({ pivot: [item.pivot[0], y] })}
                />
                <NumberField
                  label="Rotation (degrees)"
                  value={item.rotate}
                  onChange={(rotate) => patch({ rotate })}
                />
              </fieldset>
            </div>
          )}
        </div>
      )}

      {tab === "general" && (
        <div className="panel">
          <h4>Text sizes (px, applies to every text item)</h4>
          {Object.entries(TEXT_SIZE_LABELS).map(([key, label]) => (
            <NumberField
              key={key}
              label={label}
              value={sizes[key]}
              onChange={(px) => setSize(key, px)}
            />
          ))}

          <h4>Palette</h4>
          <p className="hint">
            Edit a hex value and the whole page updates. Roles choose which palette number is used for
            the background and text colours.
          </p>
          {site.palette.map((c, i) => (
            <div className="swatch" key={i}>
              <span className="num-label">{i + 1}</span>
              <input
                type="color"
                value={c}
                onChange={(e) => setColour(i, e.target.value)}
                aria-label={`Colour ${i + 1}`}
              />
              <HexField value={c} onValid={(hex) => setColour(i, hex)} />
            </div>
          ))}

          <h4>Roles</h4>
          {ROLES.map((role) => (
            <Select
              key={role}
              label={role[0].toUpperCase() + role.slice(1)}
              value={String(site.roles[role])}
              options={site.palette.map((c, i) => [String(i + 1), `${i + 1} · ${c}`])}
              onChange={(n) => setRole(role, Number(n))}
            />
          ))}
        </div>
      )}

      {tab === "export" && (
        <div className="panel">
          <p className="hint">
            Copy each file and paste it over the matching file in GitHub: <code>src/config/site.json</code>{" "}
            and <code>src/config/pages/main.json</code>. Commit, and the site rebuilds.
          </p>
          <div className="row">
            <button onClick={() => copy(siteText, "site.json")}>Copy site.json</button>
            <button onClick={() => download("site.json", siteText)}>Download site.json</button>
          </div>
          <textarea readOnly rows={8} value={siteText} onFocus={(e) => e.target.select()} />
          <div className="row">
            <button onClick={() => copy(pageText, "main.json")}>Copy main.json</button>
            <button onClick={() => download("main.json", pageText)}>Download main.json</button>
          </div>
          <textarea readOnly rows={8} value={pageText} onFocus={(e) => e.target.select()} />
          {copied && <p className="hint">{copied}</p>}
        </div>
      )}

      <footer>
        <button className="danger" onClick={onReset}>Reset to saved config…</button>
        <button onClick={onClose}>Close</button>
      </footer>
    </aside>
  );
}
