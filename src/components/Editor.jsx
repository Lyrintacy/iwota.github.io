import React, { useEffect, useRef, useState } from "react";
import {
  ANCHORS,
  COLORS,
  ROLES,
  SIZE_UNITS,
  TYPES,
  UNITS,
  newItem,
  uid,
} from "../lib/model.js";

const TYPE_LABEL = { text: "Text", image: "Image", gif: "GIF", video: "Video" };
const HORIZONTAL = { start: "Left", center: "Centre", end: "Right", stretch: "Left + right" };
const VERTICAL = { start: "Top", center: "Middle", end: "Bottom", stretch: "Top + bottom" };
const PIVOTS = [
  [0, 0], [50, 0], [100, 0],
  [0, 50], [50, 50], [100, 50],
  [0, 100], [50, 100], [100, 100],
];

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

function NumberField({ label, value, onChange, step = 1 }) {
  return (
    <Field label={label}>
      <input
        type="number"
        step={step}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
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

function TextEditor({ item, onChange }) {
  const ref = useRef(null);
  // Wraps the selected text in markup, then restores the selection.
  const wrap = (open, close) => {
    const el = ref.current;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const inner = value.slice(s, e) || "text";
    onChange({ text: value.slice(0, s) + open + inner + close + value.slice(e) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + open.length, s + open.length + inner.length);
    });
  };
  const tools = [
    ["Bold", "**", "**"],
    ["Italic", "*", "*"],
    ["Bold italic", "***", "***"],
    ["Normal", "{n:", "}"],
    ["Secondary", "{s:", "}"],
    ["Highlight", "{h:", "}"],
  ];
  return (
    <>
      <div className="toolbar">
        {tools.map(([label, open, close]) => (
          <button key={label} type="button" onClick={() => wrap(open, close)}>
            {label}
          </button>
        ))}
      </div>
      <Field label="Text (select words, then press a button)">
        <textarea
          ref={ref}
          rows={5}
          value={item.text}
          onChange={(e) => onChange({ text: e.target.value })}
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
}) {
  const [tab, setTab] = useState("page");
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

  const setColour = (n, hex) =>
    setSite((s) => ({ ...s, palette: s.palette.map((c, i) => (i === n ? hex : c)) }));
  const setRole = (role, n) => setSite((s) => ({ ...s, roles: { ...s.roles, [role]: n } }));

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
        {[["page", "Page"], ["palette", "Palette"], ["export", "Export"]].map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "page" && (
        <div className="panel">
          <NumberField
            label="Canvas height (px)"
            value={page.canvas.height}
            onChange={(height) => setPage((p) => ({ ...p, canvas: { ...p.canvas, height } }))}
          />
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
            <div className="details">
              <Field label="Name (for you)">
                <input value={item.name} onChange={(e) => patch({ name: e.target.value })} />
              </Field>
              <div className="row">
                <button disabled={index === 0} onClick={() => move(-1)}>↑ Up</button>
                <button disabled={index === page.items.length - 1} onClick={() => move(1)}>↓ Down</button>
                <button onClick={duplicate}>Duplicate</button>
                <button className="danger" onClick={remove}>Delete</button>
              </div>

              {item.type === "text" && <TextEditor item={item} onChange={patch} />}
              {(item.type === "image" || item.type === "gif") && (
                <>
                  <Field label="File path (put the file in public/images/)">
                    <input
                      placeholder="images/my-picture.png"
                      value={item.src}
                      onChange={(e) => patch({ src: e.target.value })}
                    />
                  </Field>
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
                  <Field label="File path (mp4 or webm in public/images/)">
                    <input
                      placeholder="images/clip.mp4"
                      value={item.src}
                      onChange={(e) => patch({ src: e.target.value })}
                    />
                  </Field>
                  <Field label="Poster image (optional)">
                    <input value={item.poster} onChange={(e) => patch({ poster: e.target.value })} />
                  </Field>
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

      {tab === "palette" && (
        <div className="panel">
          <p className="hint">
            Edit a hex value and the whole page updates. Roles choose which palette number is used for
            the background and text colours.
          </p>
          {site.palette.map((c, i) => (
            <div className="swatch" key={i}>
              <span className="num">{i + 1}</span>
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
