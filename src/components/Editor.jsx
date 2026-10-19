import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import images from "virtual:images";
import { ANCHORS, COLORS, DEFAULT_DESIGN, DEFAULT_UI, DEFAULT_LINK, DEFAULT_MOBILE, DEFAULT_SPEED, DEFAULT_TEXT, ROLES, SIZE_UNITS, TYPES, UNITS, formatAt, isBand, newItem, newSection, pageSlug, removeColour, toggleFormat, uid, DEFAULT_CARD, cardsOf, textStyles, TEXT_TAGS, styleOf, BUILTIN_TEXT_STYLES } from "../lib/model.js";
import { hasExt, useMedia } from "../lib/media.js";
import { fontFamily } from "../lib/model.js";

const TYPE_LABEL = {
  button: "Button",
  text: "Text",
  image: "Image",
  gif: "GIF",
  video: "Video",
  animated: "Animated image",
};
const HORIZONTAL = {
  start: "Left",
  center: "Centre",
  end: "Right",
  stretch: "Left + right",
};
const VERTICAL = {
  start: "Top",
  center: "Middle",
  end: "Bottom",
  stretch: "Top + bottom",
};
const PIVOTS = [
  [0, 0],
  [50, 0],
  [100, 0],
  [0, 50],
  [50, 50],
  [100, 50],
  [0, 100],
  [50, 100],
  [100, 100],
];
const TEXT_SIZE_LABELS = {
  body: "Body text",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
};
// [value, label, colour]: the colour is shown as a swatch next to the picker.
const paletteOptions = (site) =>
  site.palette.map((c, i) => [String(i + 1), `${i + 1} · ${c}`, c]);

function download(name, text) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
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
          onClick={() =>
            update(text.startsWith("-") ? text.slice(1) : `-${text}`)
          }
        >
          −
        </button>
      </span>
    </Field>
  );
}

// Optional panning. The checkbox is per axis; the speed (px moved per px scrolled)
// can be negative, which reverses the direction.
function PanControl({ axis, pan, speed, onChange }) {
  return (
    <>
      <label className="check">
        <input
          type="checkbox"
          checked={!!pan}
          onChange={(e) => onChange({ [`scroll${axis}`]: e.target.checked })}
        />
        Pan when scrolling ({axis})
      </label>
      {pan && (
        <NumberField
          label={`Pan speed ${axis} (− = opposite way)`}
          value={speed ?? DEFAULT_SPEED}
          onChange={(v) => onChange({ [`speed${axis}`]: v })}
        />
      )}
    </>
  );
}

// A tick box with a label (searchable, like the other fields).
function Check({ label, checked, onChange }) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Select({ label, value, options, onChange }) {
  // A palette option has a colour: show it as a small square beside the picker.
  const swatch = options.find(([v]) => v === String(value))?.[2];
  return (
    <Field label={label}>
      <span className="select-row">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {swatch && <span className="swatch" style={{ background: swatch }} aria-hidden="true" />}
      </span>
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
        label={
          a.anchor === "center"
            ? "Shift (− = left/up, + = right/down)"
            : "Offset"
        }
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
        options={UNITS.map((u) => [u, u === "%" ? "% of frame" : "px"])}
        onChange={(unit) => onChange({ unit })}
      />
      {a.anchor !== "stretch" && (
        <>
          <NumberField
            label="Size"
            value={a.size}
            onChange={(size) => onChange({ size })}
          />
          <Select
            label="Size unit"
            value={a.sizeUnit}
            options={SIZE_UNITS.map((u) => [u, u === "%" ? "% of frame" : u])}
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

function TextEditor({ item, onChange, setStatus, fonts = [], styles = [], palette = [] }) {
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
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => apply("n")}
        >
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
        label="Font"
        value={item.font || ""}
        options={[["", "Style default (see Text styles)"], ...fonts.map((f) => [f.id, f.name || f.id])]}
        onChange={(font) => onChange({ font })}
      />
      <Select
        label="Text family"
        value={item.level}
        options={(styles.length ? styles : textStyles({})).map((s) => [s.id === "body" ? "p" : s.id, s.name])}
        onChange={(level) => onChange({ level })}
      />
      <Select
        label="Alignment"
        value={item.align}
        options={[
          ["left", "Left"],
          ["center", "Centre"],
          ["right", "Right"],
        ]}
        onChange={(align) => onChange({ align })}
      />
      {(() => {
        const list = styles.length ? styles : textStyles({});
        const fam = styleOf(list, item.level);
        const ownSize = item.size !== undefined && item.size !== null && item.size !== "";
        return (
          <>
            <Check
              label={`Own size (otherwise the family's ${fam.size}px)`}
              checked={ownSize}
              onChange={(on) => onChange({ size: on ? fam.size : undefined })}
            />
            {ownSize && (
              <NumberField label="Size (px)" value={item.size} onChange={(v) => onChange({ size: Math.max(1, v) })} />
            )}
            <Select
              label="Colour"
              value={item.color === undefined || item.color === null ? "" : String(item.color)}
              options={[
                ["", `Family colour (palette ${fam.colour})`],
                ...palette,
                ...(COLORS.includes(item.color) ? [[item.color, `${item.color} (older setting)`]] : []),
              ]}
              onChange={(v) => onChange({ color: v === "" ? "" : COLORS.includes(v) ? v : Number(v) })}
            />
          </>
        );
      })()}
    </>
  );
}

// Every file under public/images (any folder, and the top level too), offered as
// suggestions. Without an extension, the first existing file of the type is used.
const KINDS = {
  image: /\.(png|jpe?g|gif)$/i,
  gif: /\.gif$/i,
  video: /\.(mp4|webm)$/i,
};
function imageChoices(type) {
  const files = images.filter((f) => KINDS[type]?.test(f));
  const base = (f) => f.replace(/\.[^./]+$/, "");
  const count = {};
  files.forEach((f) => (count[base(f)] = (count[base(f)] || 0) + 1));
  // A name shared by two files keeps its extension, so the choice is exact.
  return files.map((f) => (count[base(f)] > 1 ? f : base(f)));
}

// Typing without an extension: the first existing file (png, jpeg, jpg; mp4,
// webm for video) is found and its extension is written into the config.
function FilePath({ label, value: rawValue, type, onChange, placeholder }) {
  const value = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
  const { url, ext } = useMedia(type, value);
  const listId = `files-${type}`;
  useEffect(() => {
    if (ext && value.trim() && !hasExt(value))
      onChange(`${value.trim()}.${ext}`);
  }, [ext]);
  return (
    <>
      <Field label={label}>
        <input
          list={listId}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
      <datalist id={listId}>
        {imageChoices(type).map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="file-preview">
        {url && type !== "video" && <img src={url} alt="" />}
        <span className="hint">
          {value.trim() ? (
            <>
              Uses <code>{url}</code>
            </>
          ) : (
            "Pick from the list or type folder/name. Extension optional."
          )}
        </span>
      </div>
    </>
  );
}

// Round corners: one radius, or each corner on its own (images, GIFs, videos).
function CornerFields({ value, onChange }) {
  const separate = !!value && typeof value === "object";
  const uniform = separate ? value.tl || 0 : Number(value) || 0;
  const corners = separate ? value : { tl: uniform, tr: uniform, br: uniform, bl: uniform };
  const each = (key) => (v) => onChange({ ...corners, [key]: Math.max(0, v) });
  return (
    <fieldset className="axis">
      <legend>Round corners</legend>
      {!separate && (
        <NumberField label="Radius (px, all corners)" value={uniform} onChange={(v) => onChange(Math.max(0, v))} />
      )}
      <Check
        label="Set each corner separately"
        checked={separate}
        onChange={(on) => onChange(on ? { ...corners } : uniform)}
      />
      {separate && (
        <>
          <NumberField label="Top left (px)" value={corners.tl} onChange={each("tl")} />
          <NumberField label="Top right (px)" value={corners.tr} onChange={each("tr")} />
          <NumberField label="Bottom right (px)" value={corners.br} onChange={each("br")} />
          <NumberField label="Bottom left (px)" value={corners.bl} onChange={each("bl")} />
        </>
      )}
    </fieldset>
  );
}

// Where a button goes when clicked: nothing, a web address, or a section's top.
function LinkFields({ value, sections, pages = [], onChange }) {
  const set = (v) => onChange({ ...value, ...v });
  return (
    <fieldset className="axis">
      <legend>Link when clicked</legend>
      <Select
        label="Action"
        value={value.kind || "none"}
        options={[
          ["none", "Nothing"],
          ["url", "Open a web address"],
          ["section", "Go to the top of a section"],
          ["page", "Open another tab"],
        ]}
        onChange={(kind) => set({ kind })}
      />
      {value.kind === "url" && (
        <>
          <Field label="Web address (https://…)">
            <input
              value={value.url || ""}
              onChange={(e) => set({ url: e.target.value })}
            />
          </Field>
          <Check
            label="Open in a new tab"
            checked={value.newTab}
            onChange={(newTab) => set({ newTab })}
          />
        </>
      )}
      {value.kind === "page" && (
        <>
          <Select
            label="Tab"
            value={value.page || ""}
            options={[["", "Choose a tab"], ...pages]}
            onChange={(page) => set({ page })}
          />
          <Check
            label="Open in a new tab"
            checked={value.newTab}
            onChange={(newTab) => set({ newTab })}
          />
        </>
      )}
      {value.kind === "section" && (
        <Select
          label="Section"
          value={value.section || ""}
          options={[
            ["", "Choose a section"],
            ...sections.filter(isBand).map((x) => [x.id, x.name || "Section"]),
          ]}
          onChange={(section) => set({ section })}
        />
      )}
    </fieldset>
  );
}

// The cards that open over a button. A button can have several; each has its own
// look. They open together, later ones on top. Clickable: clicking the card counts as a
// click on the button. A card that is not clickable lets clicks pass through it.
function CardsFields({ fx = {}, palette, onChange }) {
  const cards = cardsOf(fx);
  // Saves the list and drops the older card fields, so they are not kept in the file.
  const legacy = Object.fromEntries(
    Object.keys(fx)
      .filter((k) => k === "card" || k === "waitFlash" || /^card[A-Z]/.test(k))
      .map((k) => [k, undefined]),
  );
  const save = (next) => onChange({ ...legacy, cards: next });
  const patch = (i, p) => save(cards.map((c, k) => (k === i ? { ...c, ...p } : c)));
  const num = (i, key) => (v) => patch(i, { [key]: Math.max(0, v) });
  const move = (i, d) => {
    const next = [...cards];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  };
  const remove = (i) => save(cards.filter((_, k) => k !== i));
  const add = () => save([...cards, { ...DEFAULT_CARD }]);
  return (
    <div className="cards-list">
      {cards.length === 0 && <p className="hint">No cards: hovering the button opens nothing.</p>}
      {cards.map((c, i) => (
        <details className="group card-edit" key={i}>
          <summary>
            Card {i + 1}
            {c.clickable ? " (clickable)" : ""}
          </summary>
          <div className="group-body">
          <Check
            label="Wait for the button's flash to finish before this card opens"
            checked={c.waitFlash}
            onChange={(waitFlash) => patch(i, { waitFlash })}
          />
          <Check
            label="Clicking this card counts as a click on the button (its link runs, the button flashes)"
            checked={c.clickable}
            onChange={(clickable) => patch(i, { clickable })}
          />
          <NumberField label="Card size (times the button)" value={c.scale} onChange={(v) => patch(i, { scale: Math.max(1, v) })} />
          <Select
            label="Keep the card on screen by"
            value={c.fit || "both"}
            options={[
              ["none", "Not at all"],
              ["x", "Width"],
              ["y", "Height"],
              ["both", "Width and height"],
            ]}
            onChange={(fit) => patch(i, { fit })}
          />
          <FilePath
            label="Card picture (optional, else the button image)"
            value={c.file || ""}
            type="image"
            placeholder="0/card"
            onChange={(file) => patch(i, { file })}
          />
          <Select
            label="Card background"
            value={String(c.background ?? 0)}
            options={[["0", "Transparent (a PNG shows its own shape)"], ...palette]}
            onChange={(n) => patch(i, { background: Number(n) })}
          />
          <Select
            label="Card picture fit"
            value={c.imageFit || "cover"}
            options={[
              ["cover", "Fill the card (crops the picture)"],
              ["contain", "Fit inside (keeps the whole picture)"],
            ]}
            onChange={(imageFit) => patch(i, { imageFit })}
          />
          <NumberField label="Open duration (ms)" value={c.openMs} onChange={num(i, "openMs")} />
          <NumberField label="Close duration (ms)" value={c.closeMs} onChange={num(i, "closeMs")} />
          <NumberField label="Corner radius (px)" value={c.radius} onChange={num(i, "radius")} />
          <Check label="Tilt with the cursor" checked={c.tilt} onChange={(tilt) => patch(i, { tilt })} />
          {c.tilt && <NumberField label="Tilt strength (%)" value={c.tiltStrength} onChange={num(i, "tiltStrength")} />}
          <Check label="Shake when it opens" checked={c.shake} onChange={(shake) => patch(i, { shake })} />
          {c.shake && (
            <>
              <NumberField label="Shake duration (ms)" value={c.shakeMs} onChange={num(i, "shakeMs")} />
              <NumberField label="Shake strength (%)" value={c.shakeAmount} onChange={num(i, "shakeAmount")} />
            </>
          )}
          <Check label="Moving band across the card" checked={c.shine} onChange={(shine) => patch(i, { shine })} />
          {c.shine && (
            <>
              <Select
                label="Band colour"
                value={String(c.shineColour ?? 4)}
                options={palette}
                onChange={(n) => patch(i, { shineColour: Number(n) })}
              />
              <NumberField label="Band width (% of the card)" value={c.shineWidth} onChange={num(i, "shineWidth")} />
              <NumberField label="Band speed: time to cross (ms)" value={c.shineMs} onChange={num(i, "shineMs")} />
              <NumberField label="Band slant (degrees)" value={c.slant} onChange={num(i, "slant")} />
            </>
          )}
          <Check label="Colour flash when it opens" checked={c.flash} onChange={(flash) => patch(i, { flash })} />
          {c.flash && (
            <>
              <Select
                label="Flash colour (also the click flash colour)"
                value={String(c.flashColour ?? 3)}
                options={palette}
                onChange={(n) => patch(i, { flashColour: Number(n) })}
              />
              <NumberField label="Flash duration (ms)" value={c.flashMs} onChange={num(i, "flashMs")} />
            </>
          )}
          <div className="row">
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)}>
              Move up
            </button>
            <button type="button" disabled={i === cards.length - 1} onClick={() => move(i, 1)}>
              Move down
            </button>
            <button type="button" onClick={() => remove(i)}>
              Remove card {i + 1}
            </button>
          </div>
          </div>
        </details>
      ))}
      <div className="row">
        <button type="button" onClick={add}>
          Add a card
        </button>
      </div>
    </div>
  );
}

// Text families: each has a default size, font and colour. A text item uses its family's
// settings unless it sets its own. Each family folds away; any family can be removed.
function TextFamiliesFields({ site, setSite, palette = [] }) {
  const [name, setName] = useState("");
  const [newTag, setNewTag] = useState("p");
  const styles = textStyles(site);
  const hidden = BUILTIN_TEXT_STYLES.filter((x) => site.textFamilies?.[x.id]?.removed === true);
  const fontOptions = (site.fonts || []).map((f) => [f.id, f.name || f.id]);
  // Writes one setting of a family; the family's other settings are kept as they are.
  const edit = (id, patch) =>
    setSite((s) => {
      const cur = textStyles(s).find((x) => x.id === id) || {};
      return {
        ...s,
        textFamilies: {
          ...(s.textFamilies || {}),
          [id]: {
            name: cur.name,
            tag: cur.tag,
            size: cur.size,
            colour: cur.colour,
            ...(s.textFamilies?.[id] || {}),
            ...patch,
          },
        },
      };
    });
  const add = () => {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "family";
    setSite((s) => {
      const ids = textStyles(s).map((x) => x.id);
      let id = base;
      for (let n = 2; ids.includes(id); n++) id = `${base}-${n}`;
      const label = name.trim() || "Family";
      return {
        ...s,
        textStyles: [...(s.textStyles || []), { id, name: label, tag: newTag }],
        textFamilies: {
          ...(s.textFamilies || {}),
          [id]: { name: label, tag: newTag, size: 16, colour: palette[0] ? Number(palette[0][0]) : 1, font: "" },
        },
      };
    });
    setName("");
  };
  // A built-in family is hidden (restorable); a family added by you is deleted.
  const remove = (id) => {
    if (BUILTIN_TEXT_STYLES.some((x) => x.id === id)) return edit(id, { removed: true });
    setSite((s) => {
      const text = { ...(s.text || {}) };
      const textFonts = { ...(s.textFonts || {}) };
      const textFamilies = { ...(s.textFamilies || {}) };
      delete text[id];
      delete textFonts[id];
      delete textFamilies[id];
      return { ...s, text, textFonts, textFamilies, textStyles: (s.textStyles || []).filter((x) => x.id !== id) };
    });
  };
  return (
    <>
      <p className="hint">
        Text items use their family's size, font and colour unless they set their own (in the
        workshop, under the text). A family with no font uses the body text's font. Items of a
        removed family fall back to body text.
      </p>
      {styles.map((st) => (
        <details className="group" key={st.id}>
          <summary>{st.name}</summary>
          <div className="group-body">
            <Field label="Name">
              <input value={st.name} onChange={(e) => edit(st.id, { name: e.target.value })} />
            </Field>
            <NumberField label="Default size (px)" value={st.size} onChange={(px) => edit(st.id, { size: Math.max(1, px) })} />
            <Select
              label="Default font"
              value={st.font || ""}
              options={[["", st.id === "body" ? "Site font" : "Body text's font"], ...fontOptions]}
              onChange={(font) => edit(st.id, { font })}
            />
            <Select
              label="Default colour"
              value={String(st.colour)}
              options={palette}
              onChange={(v) => edit(st.id, { colour: Number(v) })}
            />
            <Select label="Tag" value={st.tag} options={TEXT_TAGS.map((t) => [t, t])} onChange={(tag) => edit(st.id, { tag })} />
            {st.id !== "body" && (
              <button type="button" onClick={() => remove(st.id)}>
                Remove family
              </button>
            )}
          </div>
        </details>
      ))}
      {hidden.length > 0 && (
        <div className="row">
          <span className="hint">Removed:</span>
          {hidden.map((x) => (
            <button key={x.id} type="button" onClick={() => edit(x.id, { removed: false })}>
              Restore {x.name}
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <input placeholder="New family name, e.g. Quote" value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Tag" value={newTag} options={TEXT_TAGS.map((t) => [t, t])} onChange={setNewTag} />
        <button type="button" onClick={add}>
          Add a text family
        </button>
      </div>
    </>
  );
}

// Hover sequence for buttons. Each group is a step of the sequence; every
// number is a variable, stored per item in fx.
function EffectFields({ fx = {}, site, onChange }) {
  const palette = paletteOptions(site);
  const set = (key) => (v) => onChange({ [key]: v });
  const num = (key) => (v) => onChange({ [key]: Math.max(0, v) });
  const colours = [["0", "White"], ...palette];
  return (
    <>
      <fieldset className="axis">
        <legend>Button: shake</legend>
        <Check label="Shake once on hover" checked={fx.shake} onChange={set("shake")} />
        {fx.shake && (
          <>
            <NumberField label="Shake duration (ms)" value={fx.shakeMs ?? 600} onChange={num("shakeMs")} />
            <NumberField label="Shake strength (%)" value={fx.shakeAmount ?? 100} onChange={num("shakeAmount")} />
          </>
        )}
      </fieldset>
      <fieldset className="axis">
        <legend>Button: flash</legend>
        <Check label="Flash the picture" checked={fx.flash} onChange={set("flash")} />
        {fx.flash && (
          <>
            <NumberField label="Flash duration (ms)" value={fx.flashMs ?? 300} onChange={num("flashMs")} />
            <Select
              label="Flash colour"
              value={String(fx.flashColour ?? 0)}
              options={colours}
              onChange={(n) => onChange({ flashColour: Number(n) })}
            />
            <NumberField label="Flash strength (% opacity)" value={fx.flashStrength ?? 95} onChange={num("flashStrength")} />
          </>
        )}
      </fieldset>
      <fieldset className="axis">
        <legend>Button: moving band (shine)</legend>
        <Check label="Moving band across the button" checked={fx.shine} onChange={set("shine")} />
        {fx.shine && (
          <>
            <NumberField
              label="Band starts after (ms from hover, 0 = at once)"
              value={fx.shineDelayMs ?? 0}
              onChange={num("shineDelayMs")}
            />
            <NumberField label="Band speed: time to cross (ms)" value={fx.shineMs ?? 700} onChange={num("shineMs")} />
            <NumberField label="Band width (% of the button)" value={fx.shineWidth ?? 70} onChange={num("shineWidth")} />
            <Select
              label="Band colour"
              value={String(fx.shineColour ?? 4)}
              options={palette}
              onChange={(n) => onChange({ shineColour: Number(n) })}
            />
            <NumberField label="Band slant (degrees)" value={fx.shineSlant ?? 18} onChange={num("shineSlant")} />
          </>
        )}
      </fieldset>
      <fieldset className="axis">
        <legend>Click</legend>
        <Check
          label="Colour flash on click (when there is a link or card)"
          checked={fx.clickFlash}
          onChange={set("clickFlash")}
        />
        <p className="hint">
          Colour for the click flash is the first card's flash colour. On a touch screen a button with no
          link acts as hover on a tap; another tap, a tap elsewhere, or scrolling ends it.
          A button with a link follows the link on the first tap.
        </p>
      </fieldset>
    </>
  );
}

// A collapsible section of the workshop. Searching opens every group.
function Group({ title, open = false, children }) {
  return (
    <details className="group" open={open}>
      <summary>{title}</summary>
      <div className="group-body">{children}</div>
    </details>
  );
}

// One file to copy or download, with its text in a read-only box.
function ExportFile({ name, file = name, text, edited, copy }) {
  return (
    <>
      <div className="row">
        {edited && <span className="badge">edited</span>}
        <button onClick={() => copy(text, name)}>Copy {name}</button>
        <button onClick={() => download(file, text)}>Download {file}</button>
      </div>
      <textarea readOnly rows={6} value={text} onFocus={(e) => e.target.select()} />
    </>
  );
}

// Adds a tab by name. Its file is the lower-case name with dashes.
function NewTab({ onAdd }) {
  const [name, setName] = useState("");
  const add = () => {
    if (!name.trim()) return;
    onAdd(name);
    setName("");
  };
  return (
    <div className="row">
      <input
        value={name}
        placeholder="Tab name, e.g. Projects"
        aria-label="New tab name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
      />
      <button onClick={add} disabled={!pageSlug(name) || !name.trim()}>
        + Add tab
      </button>
    </div>
  );
}

export function Editor({
  site,
  rootSite,
  edited = { changed: {}, removed: [] },
  setRootSite,
  ownSettings,
  pagesApi,
  page,
  view,
  setSite,
  setPage,
  draft,
  onReset,
  onClose,
  selectedId,
  setSelectedId,
  selectedSectionId,
  setSelectedSectionId,
  phone,
  setPhone,
  dock,
  setDock,
  previewWidth,
  setPreviewWidth,
}) {
  const [tab, setTab] = useState("page");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(-1);
  const rootRef = useRef(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [jsonText, setJsonText] = useState(null);
  const [jsonError, setJsonError] = useState("");

  const sections = page.sections || [];
  const sIdx = sections.findIndex((x) => x.id === selectedSectionId);
  const section = sIdx >= 0 ? sections[sIdx] : null;
  const sectionView = section
    ? view.sections.find((x) => x.id === section.id)
    : null;
  const iIdx = page.items.findIndex((i) => i.id === selectedId);
  const item = iIdx >= 0 ? page.items[iIdx] : null;
  const itemView = item ? view.items.find((i) => i.id === item.id) : null;
  const mobile = { ...DEFAULT_MOBILE, ...(page.mobile || {}) };

  // Edits go to the base page, or to the phone overrides in Phone mode.
  const writeOverride = (kind, id, values) =>
    setPage((p) => {
      const m = { ...DEFAULT_MOBILE, ...(p.mobile || {}) };
      return {
        ...p,
        mobile: {
          ...m,
          [kind]: { ...m[kind], [id]: { ...m[kind][id], ...values } },
        },
      };
    });
  const writeItem = (id, values) =>
    phone
      ? writeOverride("items", id, values)
      : setPage((p) => ({
          ...p,
          items: p.items.map((i) => (i.id === id ? { ...i, ...values } : i)),
        }));
  const writeSection = (id, values) =>
    phone
      ? writeOverride("sections", id, values)
      : setPage((p) => ({
          ...p,
          sections: (p.sections || []).map((s) =>
            s.id === id ? { ...s, ...values } : s,
          ),
        }));
  const writeCanvas = (values) =>
    phone
      ? setPage((p) => {
          const m = { ...DEFAULT_MOBILE, ...(p.mobile || {}) };
          return { ...p, mobile: { ...m, canvas: { ...m.canvas, ...values } } };
        })
      : setPage((p) => ({ ...p, canvas: { ...p.canvas, ...values } }));

  const patch = (values) => writeItem(item.id, values);
  const patchAxis = (axis, values) =>
    writeItem(item.id, { [axis]: { ...itemView[axis], ...values } });
  const patchSection = (values) => writeSection(section.id, values);
  const patchTexture = (values) =>
    patchSection({ texture: { ...sectionView.texture, ...values } });
  const patchOverlay = (values) =>
    patchSection({ overlay: { ...sectionView.overlay, ...values } });

  // Structure (adding, moving, deleting) always happens on the base page.
  const add = (type) => {
    const created = newItem(type, uid(type));
    setPage((p) => ({ ...p, items: [...p.items, created] }));
    setSelectedId(created.id);
  };
  const moveItem = (delta) =>
    setPage((p) => {
      const list = [...p.items];
      const to = iIdx + delta;
      if (to < 0 || to >= list.length) return p;
      [list[iIdx], list[to]] = [list[to], list[iIdx]];
      return { ...p, items: list };
    });
  const duplicateItem = () => {
    const copy = { ...structuredClone(item), id: uid(item.type) };
    setPage((p) => {
      const list = [...p.items];
      list.splice(iIdx + 1, 0, copy);
      return { ...p, items: list };
    });
    setSelectedId(copy.id);
  };
  const removeItem = () => {
    if (!window.confirm(`Delete "${item.name || TYPE_LABEL[item.type]}"?`))
      return;
    setPage((p) => ({
      ...p,
      items: p.items.filter((i) => i.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const addSection = (kind) => {
    const bottom = Math.max(
      0,
      ...sections.filter(isBand).map((x) => x.start + x.height),
    );
    const created = newSection(
      kind,
      uid("section"),
      kind === "band" ? bottom : 0,
    );
    setPage((p) => ({ ...p, sections: [...(p.sections || []), created] }));
    setSelectedSectionId(created.id);
  };
  const moveSection = (delta) =>
    setPage((p) => {
      const list = [...(p.sections || [])];
      const to = sIdx + delta;
      if (to < 0 || to >= list.length) return p;
      [list[sIdx], list[to]] = [list[to], list[sIdx]];
      return { ...p, sections: list };
    });
  const duplicateSection = () => {
    const copy = {
      ...structuredClone(section),
      id: uid("section"),
      start: isBand(section) ? section.start + section.height : 0,
    };
    setPage((p) => {
      const list = [...(p.sections || [])];
      list.splice(sIdx + 1, 0, copy);
      return { ...p, sections: list };
    });
    setSelectedSectionId(copy.id);
  };
  const removeSection = () => {
    if (
      !window.confirm(
        `Delete "${section.name || "this section"}"? Items inside it move to the page.`,
      )
    )
      return;
    setPage((p) => {
      const { [section.id]: _s, ...sectionOverrides } =
        p.mobile?.sections || {};
      return {
        ...p,
        sections: (p.sections || []).filter((x) => x.id !== section.id),
        items: p.items.map((i) =>
          i.parent === section.id ? { ...i, parent: "" } : i,
        ),
        mobile: p.mobile
          ? { ...p.mobile, sections: sectionOverrides }
          : p.mobile,
      };
    });
    setSelectedSectionId(null);
  };

  // Clicking the selected item or section again closes its panel.
  const toggleItem = (id) => setSelectedId((cur) => (cur === id ? null : id));
  const toggleSection = (id) =>
    setSelectedSectionId((cur) => (cur === id ? null : id));

  const addColour = () =>
    setSite((s) => ({ ...s, palette: [...s.palette, "#808080"] }));
  const dropColour = (n) => {
    if (site.palette.length <= 1) return;
    if (
      !window.confirm(
        `Remove colour ${n + 1}? Anything using it switches to colour 1.`,
      )
    )
      return;
    const next = removeColour(site, page, n + 1);
    setSite(() => next.site);
    setPage(() => next.page);
  };
  const setColour = (n, hex) =>
    setSite((s) => ({
      ...s,
      palette: s.palette.map((c, i) => (i === n ? hex : c)),
    }));
  const setRole = (role, n) =>
    setSite((s) => ({ ...s, roles: { ...s.roles, [role]: n } }));
  const sizes = { ...DEFAULT_TEXT, ...(site.text || {}) };
  const setFont = (i, values) =>
    setSite((s) => ({
      ...s,
      fonts: s.fonts.map((f, n) => (n === i ? { ...f, ...values } : f)),
    }));
  const dropFont = (i) =>
    setSite((s) => ({ ...s, fonts: s.fonts.filter((_, n) => n !== i) }));
  const addFont = () =>
    setSite((s) => {
      let id = "font";
      for (let n = 1; s.fonts.some((f) => f.id === id); n++) id = `font-${n + 1}`;
      return { ...s, fonts: [...s.fonts, { id, name: "New font", family: "sans-serif", file: "" }] };
    });
  const setSize = (key, px) =>
    setSite((s) => ({ ...s, text: { ...sizes, [key]: px } }));

  const applyPhoneJson = () => {
    try {
      const parsed = JSON.parse(jsonText ?? "");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("Expected an object.");
      setPage((p) => ({ ...p, mobile: { ...DEFAULT_MOBILE, ...parsed } }));
      setJsonText(null);
      setJsonError("");
    } catch (e) {
      setJsonError(`Not applied: ${e.message}`);
    }
  };
  const clearPhone = () => {
    if (
      !window.confirm(
        "Remove all phone overrides? The desktop layout stays as it is.",
      )
    )
      return;
    setPage((p) => ({
      ...p,
      mobile: { ...DEFAULT_MOBILE, breakpoint: mobile.breakpoint },
    }));
    setJsonText(null);
  };

  const siteText = JSON.stringify(rootSite, null, 2) + "\n";
  // A tab's page file has no phone overrides; they are in phone.json.
  const pageFile = (id) => {
    const { mobile: _phone, ...rest } = pagesApi.pages[id];
    return JSON.stringify(rest, null, 2) + "\n";
  };
  const exportTabs = pagesApi.active === "main" ? ["main"] : ["main", pagesApi.active];
  const phoneText =
    JSON.stringify(
      Object.fromEntries(
        pagesApi.tabs.map((id) => [id, { ...DEFAULT_MOBILE, ...(pagesApi.pages[id].mobile || {}) }]),
      ),
      null,
      2,
    ) + "\n";
  const editedNames = [
    ...Object.entries(edited.changed)
      .filter(([, on]) => on)
      .map(([name]) => name),
  ];
  const mobileText = JSON.stringify(mobile, null, 2) + "\n";
  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${label} copied.`);
    } catch {
      setCopied(
        "Copy blocked by the browser. Select the text and copy it manually.",
      );
    }
  };

  // Search hides the fields that don't match, then any group left empty.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = query.trim().toLowerCase();
    let visible = 0;
    root.querySelectorAll(".field, .check").forEach((el) => {
      const text = el.matches(".field")
        ? el.querySelector(":scope > span")?.textContent || ""
        : el.textContent;
      el.hidden = !!q && !text.toLowerCase().includes(q);
      if (!el.hidden) visible++;
    });
    root.querySelectorAll("details.group").forEach((d) => {
      if (q) d.open = true;
    });
    root.querySelectorAll("fieldset.axis, .details, .advanced, details.group").forEach((g) => {
      const kids = g.querySelectorAll(".field, .check");
      g.hidden = !!q && (kids.length === 0 || [...kids].every((k) => k.hidden));
    });
    root.querySelectorAll(".panel h4").forEach((h) => (h.hidden = !!q));
    setShown(q ? visible : -1);
  });

  // Look of the workshop panel (site-wide): font, text and background colour.
  const ui = { ...DEFAULT_UI, ...(rootSite.ui || {}) };
  const rootHex = (n) => (n ? rootSite.palette[n - 1] : undefined);
  const rootFont = (id) => {
    const f = (rootSite.fonts || []).find((x) => x.id === id);
    return f ? fontFamily(f) : undefined;
  };
  const workshopVars = {};
  if (rootFont(ui.workshop.font)) workshopVars["--ws-font"] = rootFont(ui.workshop.font);
  if (rootHex(ui.workshop.text)) workshopVars["--ws-text"] = rootHex(ui.workshop.text);
  if (rootHex(ui.workshop.background)) workshopVars["--ws-bg"] = rootHex(ui.workshop.background);
  // Site-wide settings in rootSite.ui: changed here, saved to site.json.
  const setUi = (group, values) =>
    setRootSite((r) => ({
      ...r,
      ui: {
        ...DEFAULT_UI,
        ...(r.ui || {}),
        [group]: { ...DEFAULT_UI[group], ...(r.ui?.[group] || {}), ...values },
      },
    }));
  const rootColourOptions = [["0", "Default"], ...paletteOptions(rootSite)];
  const rootFontOptions = [["", "Site font"], ...(rootSite.fonts || []).map((f) => [f.id, f.name || f.id])];

  const parentOptions = [
    ["", "Page"],
    ...sections.map((s) => [
      s.id,
      `${s.name || "Section"}${isBand(s) ? "" : " (screen overlay)"}`,
    ]),
  ];

  return (
    <aside
      className={`editor dock-${dock}`}
      aria-label="Workshop"
      ref={rootRef}
      style={workshopVars}
    >
      <header>
        <strong>Workshop</strong>
        {draft && <span className="badge">Unsaved draft</span>}
        <button
          className="dock-toggle"
          onClick={() => setDock(dock === "left" ? "right" : "left")}
          title="Move the workshop panel to the other side"
        >
          Dock {dock === "left" ? "right" : "left"}
        </button>
      </header>
      <div className="search">
        <input
          type="search"
          placeholder="Search options, e.g. size, colour, pan"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search options"
        />
        {query && (
          <span className="hint">
            {shown === 0
              ? "No options match on this tab."
              : `${shown} match${shown === 1 ? "" : "es"} on this tab`}
          </span>
        )}
      </div>
      <div className="seg" role="group" aria-label="Edit target">
        <button className={!phone ? "on" : ""} onClick={() => setPhone(false)}>
          Desktop
        </button>
        <button className={phone ? "on" : ""} onClick={() => setPhone(true)}>
          Phone
        </button>
      </div>
      <nav className="tabs">
        {[
          ["page", "Page"],
          ["general", "General"],
          ["pages", "Tabs"],
          ["phone", "Phone"],
          ["export", "Export"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "on" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "page" && (
        <div className="panel">
          {phone && (
            <p className="banner">
              Phone mode: changes apply only on phones (screens{" "}
              {mobile.breakpoint}px wide or less). Adding, moving and deleting
              are locked here.
            </p>
          )}
          <div className="add-bar">
            {TYPES.map((t) => (
              <button key={t} disabled={phone} onClick={() => add(t)}>
                + {TYPE_LABEL[t]}
              </button>
            ))}
            <button disabled={phone} onClick={() => addSection("band")}>
              + Section
            </button>
            <button disabled={phone} onClick={() => addSection("fixed")}>
              + Screen overlay
            </button>
          </div>

          <NumberField
            label="Page height (px) — grows to fit sections"
            value={view.canvas.height}
            onChange={(height) => writeCanvas({ height })}
          />
          <div className="axis-grid">
            <NumberField
              label="Design width (px)"
              value={view.canvas.designWidth ?? DEFAULT_DESIGN.designWidth}
              onChange={(designWidth) =>
                writeCanvas({ designWidth: Math.max(1, designWidth) })
              }
            />
            <NumberField
              label="Design height (px)"
              value={view.canvas.designHeight ?? DEFAULT_DESIGN.designHeight}
              onChange={(designHeight) =>
                writeCanvas({ designHeight: Math.max(1, designHeight) })
              }
            />
          </div>
          <p className="hint">
            Items with Shrink on scale down when the screen is smaller than
            these sizes.
          </p>

          <h4>Sections</h4>
          <ul className="items">
            {sections.map((x, n) => (
              <li key={x.id}>
                <button
                  className={x.id === selectedSectionId ? "on" : ""}
                  onClick={() => toggleSection(x.id)}
                >
                  {n + 1}. {x.name || "Section"}{" "}
                  <small>
                    {isBand(x)
                      ? `${x.anchor === "bottom" ? "bottom" : "top"} · ${x.start}px · ${x.height}px`
                      : "screen overlay"}
                  </small>
                </button>
              </li>
            ))}
          </ul>

          {section && sectionView && (
            <div className="details" key={section.id}>
              <div className="row between">
                <strong>{section.name || "Section"}</strong>
                <button onClick={() => setSelectedSectionId(null)}>
                  Close ×
                </button>
              </div>
              <Field label="Name (for you)">
                <input
                  value={section.name}
                  onChange={(e) => patchSection({ name: e.target.value })}
                />
              </Field>
              <div className="row">
                <button
                  disabled={phone || sIdx === 0}
                  onClick={() => moveSection(-1)}
                >
                  ↑ Up
                </button>
                <button
                  disabled={phone || sIdx === sections.length - 1}
                  onClick={() => moveSection(1)}
                >
                  ↓ Down
                </button>
                <button disabled={phone} onClick={duplicateSection}>
                  Duplicate
                </button>
                <button
                  className="danger"
                  disabled={phone}
                  onClick={removeSection}
                >
                  Delete
                </button>
              </div>

              {isBand(section) ? (
                <>
                  <Select
                    label="Align to"
                    value={sectionView.anchor || "top"}
                    options={[
                      ["top", "Top of the page"],
                      ["bottom", "Bottom of the page"],
                    ]}
                    onChange={(anchor) => patchSection({ anchor })}
                  />
                  <div className="axis-grid">
                    <NumberField
                      label={
                        sectionView.anchor === "bottom"
                          ? "Distance from bottom (px)"
                          : "Start height from top (px)"
                      }
                      value={sectionView.start}
                      onChange={(start) =>
                        patchSection({ start: Math.max(0, start) })
                      }
                    />
                    <NumberField
                      label="Height (px)"
                      value={sectionView.height}
                      onChange={(height) =>
                        patchSection({ height: Math.max(1, height) })
                      }
                    />
                  </div>
                  <Select
                    label="Background colour"
                    value={String(sectionView.background)}
                    options={paletteOptions(site)}
                    onChange={(n) => patchSection({ background: Number(n) })}
                  />
                  <fieldset className="axis">
                    <legend>Texture (tiled)</legend>
                    <FilePath
                      label="File (in public/images/, extension optional)"
                      value={sectionView.texture.file}
                      type="image"
                      placeholder="0/texture"
                      onChange={(file) => patchTexture({ file })}
                    />
                    <NumberField
                      label="Tile size (px wide)"
                      value={sectionView.texture.size}
                      onChange={(size) =>
                        patchTexture({ size: Math.max(1, size) })
                      }
                    />
                    <NumberField
                      label="Offset X (px)"
                      value={sectionView.texture.offsetX}
                      onChange={(offsetX) => patchTexture({ offsetX })}
                    />
                    <PanControl
                      axis="X"
                      pan={sectionView.texture.scrollX}
                      speed={sectionView.texture.speedX}
                      onChange={patchTexture}
                    />
                    <NumberField
                      label="Offset Y (px)"
                      value={sectionView.texture.offsetY}
                      onChange={(offsetY) => patchTexture({ offsetY })}
                    />
                    <PanControl
                      axis="Y"
                      pan={sectionView.texture.scrollY}
                      speed={sectionView.texture.speedY}
                      onChange={patchTexture}
                    />
                    <NumberField
                      label="Rotation (degrees)"
                      value={sectionView.texture.rotate}
                      onChange={(rotate) => patchTexture({ rotate })}
                    />
                  </fieldset>
                  <fieldset className="axis">
                    <legend>Overlay tint</legend>
                    <Select
                      label="Overlay colour"
                      value={String(sectionView.overlay.colour)}
                      options={paletteOptions(site)}
                      onChange={(n) => patchOverlay({ colour: Number(n) })}
                    />
                    <NumberField
                      label="Overlay opacity (%)"
                      value={sectionView.overlay.opacity}
                      onChange={(opacity) =>
                        patchOverlay({
                          opacity: Math.min(100, Math.max(0, opacity)),
                        })
                      }
                    />
                  </fieldset>
                </>
              ) : (
                <p className="hint">
                  A screen overlay is always the size of the screen and stays in
                  place while you scroll. Put items in it with their Parent
                  setting.
                </p>
              )}
            </div>
          )}

          <h4>Items</h4>
          <ul className="items">
            {page.items.map((it, n) => (
              <li key={it.id}>
                <button
                  className={it.id === selectedId ? "on" : ""}
                  onClick={() => toggleItem(it.id)}
                >
                  {n + 1}. {it.name || TYPE_LABEL[it.type]}{" "}
                  <small>
                    {it.type}
                    {it.parent ? " · in section" : ""}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {!item && (
            <p className="hint">
              Select an item on the page or in this list to edit it.
            </p>
          )}

          {item && itemView && (
            <div className="details" key={item.id}>
              <div className="row between">
                <strong>{item.name || TYPE_LABEL[item.type]}</strong>
                <button onClick={() => setSelectedId(null)}>Close ×</button>
              </div>
              <Field label="Name (for you)">
                <input
                  value={item.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>
              <Select
                label="Parent (positions are measured from it)"
                value={itemView.parent || ""}
                options={parentOptions}
                onChange={(parent) => patch({ parent })}
              />
              <div className="row">
                <button
                  disabled={phone || iIdx === 0}
                  onClick={() => moveItem(-1)}
                >
                  ↑ Up
                </button>
                <button
                  disabled={phone || iIdx === page.items.length - 1}
                  onClick={() => moveItem(1)}
                >
                  ↓ Down
                </button>
                <button disabled={phone} onClick={duplicateItem}>
                  Duplicate
                </button>
                <button
                  className="danger"
                  disabled={phone}
                  onClick={removeItem}
                >
                  Delete
                </button>
              </div>

              {item.type === "text" && (
                <TextEditor
                  item={itemView}
                  onChange={patch}
                  setStatus={setStatus}
                  fonts={site.fonts || []}
                  styles={textStyles(site)}
                  palette={paletteOptions(site)}
                />
              )}
              {status && <p className="hint warn">{status}</p>}
              {(item.type === "image" ||
                item.type === "gif" ||
                item.type === "button") && (
                <>
                  <FilePath
                    label="File (in public/images/, extension optional)"
                    value={itemView.file}
                    type={item.type === "gif" ? "gif" : "image"}
                    placeholder="0/profile"
                    onChange={(file) => patch({ file })}
                  />
                  <Field label="Description (alt text)">
                    <input
                      value={itemView.alt}
                      onChange={(e) => patch({ alt: e.target.value })}
                    />
                  </Field>
                  <Select
                    label="Fit"
                    value={itemView.fit}
                    options={[
                      ["contain", "Contain"],
                      ["cover", "Cover"],
                      ["fill", "Fill"],
                    ]}
                    onChange={(fit) => patch({ fit })}
                  />
                  <Select
                    label="Colour when there is no picture (plain square)"
                    value={String(itemView.emptyColour || 0)}
                    options={[["0", "Light grey"], ...paletteOptions(site)]}
                    onChange={(n) => patch({ emptyColour: Number(n) })}
                  />
                </>
              )}
              {item.type === "video" && (
                <>
                  <FilePath
                    label="File (in public/images/, extension optional)"
                    value={itemView.file}
                    type="video"
                    placeholder="0/clip"
                    onChange={(file) => patch({ file })}
                  />
                  <FilePath
                    label="Poster image (optional)"
                    value={itemView.poster}
                    type="image"
                    placeholder="0/poster"
                    onChange={(poster) => patch({ poster })}
                  />
                  {[
                    ["controls", "Show controls"],
                    ["loop", "Loop"],
                    ["autoplay", "Autoplay (muted)"],
                  ].map(([key, label]) => (
                    <label className="check" key={key}>
                      <input
                        type="checkbox"
                        checked={!!itemView[key]}
                        onChange={(e) => patch({ [key]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </>
              )}

              {item.type === "animated" && (
                <>
                  <FilePath
                    label="Image (tiled in the square, extension optional)"
                    value={itemView.file}
                    type="image"
                    placeholder="0/pattern"
                    onChange={(file) => patch({ file })}
                  />
                  <NumberField
                    label="Tile size (px, square)"
                    value={itemView.tile}
                    onChange={(tile) => patch({ tile: Math.max(1, tile) })}
                  />
                  <NumberField
                    label="Offset X (px)"
                    value={itemView.offsetX}
                    onChange={(offsetX) => patch({ offsetX })}
                  />
                  <PanControl
                    axis="X"
                    pan={itemView.scrollX}
                    speed={itemView.speedX}
                    onChange={patch}
                  />
                  <NumberField
                    label="Offset Y (px)"
                    value={itemView.offsetY}
                    onChange={(offsetY) => patch({ offsetY })}
                  />
                  <PanControl
                    axis="Y"
                    pan={itemView.scrollY}
                    speed={itemView.speedY}
                    onChange={patch}
                  />
                  <NumberField
                    label="Texture rotation (degrees)"
                    value={itemView.textureRotate}
                    onChange={(textureRotate) => patch({ textureRotate })}
                  />
                  <fieldset className="axis">
                    <legend>Repeat (off = one tile only)</legend>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!!itemView.repeatX}
                        onChange={(e) => patch({ repeatX: e.target.checked })}
                      />
                      Repeat along X
                    </label>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!!itemView.repeatY}
                        onChange={(e) => patch({ repeatY: e.target.checked })}
                      />
                      Repeat along Y
                    </label>
                  </fieldset>
                </>
              )}

              {item.type === "video" && (
                <>
                  <Check
                    label="Play only while hovered"
                    checked={itemView.hoverOnly}
                    onChange={(hoverOnly) => patch({ hoverOnly })}
                  />
                  {itemView.hoverOnly && (
                    <FilePath
                      label="Thumbnail (shown until hovered, optional)"
                      value={itemView.thumbnail}
                      type="image"
                      placeholder="0/thumb"
                      onChange={(thumbnail) => patch({ thumbnail })}
                    />
                  )}
                </>
              )}
              {item.type === "gif" && (
                <>
                  <Check
                    label="Play only while hovered"
                    checked={itemView.hoverOnly}
                    onChange={(hoverOnly) => patch({ hoverOnly })}
                  />
                  {itemView.hoverOnly && (
                    <FilePath
                      label="Thumbnail (shown until hovered, optional)"
                      value={itemView.thumbnail}
                      type="image"
                      placeholder="0/thumb"
                      onChange={(thumbnail) => patch({ thumbnail })}
                    />
                  )}
                  <Check
                    label="Make it a button (flash, shine, card, then play)"
                    checked={itemView.button}
                    onChange={(button) => patch({ button })}
                  />
                </>
              )}
              {(item.type === "button" ||
                (item.type === "gif" && itemView.button)) && (
                <>
                  <LinkFields
                    value={itemView.link || DEFAULT_LINK}
                    sections={sections}
                    pages={pagesApi.tabs.map((id) => [id, pagesApi.pages[id].title || id])}
                    onChange={(link) => patch({ link })}
                  />
                  <Group title="Hover effects">
                  <EffectFields
                    fx={itemView.fx}
                    site={site}
                    onChange={(fx) => patch({ fx: { ...itemView.fx, ...fx } })}
                  />
                  </Group>
                  <Group title="Cards over the button">
                    <CardsFields
                      fx={itemView.fx}
                      palette={paletteOptions(site)}
                      onChange={(fx) => patch({ fx: { ...itemView.fx, ...fx } })}
                    />
                  </Group>
                </>
              )}

              {(item.type === "image" || item.type === "video" || (item.type === "gif" && !item.button)) && (
                <CornerFields value={item.radius} onChange={(radius) => patch({ radius })} />
              )}
              {item.type === "image" && (
                <details className="group">
                  <summary>Panning (moves the picture inside its frame)</summary>
                      <p className="hint">
                        Pan moves the picture inside its frame, keeping its shape (no tiling). While
                        panning, Fit is not used.
                      </p>
                      <PanControl
                        axis="X"
                        pan={itemView.scrollX}
                        speed={itemView.speedX}
                        onChange={patch}
                      />
                      {itemView.scrollX && (
                        <Check
                          label="Repeat endlessly on X (no edges)"
                          checked={!!itemView.loopX}
                          onChange={(loopX) => patch({ loopX })}
                        />
                      )}
                      <PanControl
                        axis="Y"
                        pan={itemView.scrollY}
                        speed={itemView.speedY}
                        onChange={patch}
                      />
                      {itemView.scrollY && (
                        <Check
                          label="Repeat endlessly on Y (no edges)"
                          checked={!!itemView.loopY}
                          onChange={(loopY) => patch({ loopY })}
                        />
                      )}
                      <NumberField
                        label="Offset X (px)"
                        value={itemView.offsetX}
                        onChange={(offsetX) => patch({ offsetX })}
                      />
                      <NumberField
                        label="Offset Y (px)"
                        value={itemView.offsetY}
                        onChange={(offsetY) => patch({ offsetY })}
                      />
                      <NumberField
                        label="Room to move (% bigger than the frame)"
                        value={itemView.room ?? 20}
                        onChange={(room) => patch({ room: Math.max(0, room) })}
                      />
                </details>
              )}

              <fieldset className="axis">
                <legend>Scale with the screen</legend>
                {item.type === "text" ? (
                  <Check
                    label="Auto size: grow and shrink with the screen width"
                    checked={!!itemView.shrink?.on}
                    onChange={(on) =>
                      patch({
                        shrink: {
                          axis: "x",
                          ...itemView.shrink,
                          on,
                          grow: true,
                        },
                      })
                    }
                  />
                ) : (
                  <>
                    <Check
                      label="Scale down on smaller screens"
                      checked={!!itemView.shrink?.on}
                      onChange={(on) =>
                        patch({ shrink: { ...itemView.shrink, on } })
                      }
                    />
                    {itemView.shrink?.on && (
                      <Select
                        label="Fit to"
                        value={itemView.shrink.axis || "x"}
                        options={[
                          ["x", "Fit width"],
                          ["y", "Fit height"],
                          ["both", "Fit both"],
                        ]}
                        onChange={(axis) =>
                          patch({ shrink: { ...itemView.shrink, axis } })
                        }
                      />
                    )}
                  </>
                )}
              </fieldset>

              <AxisFields
                title="Horizontal constraint"
                axisValue={itemView.h}
                labels={HORIZONTAL}
                onChange={(v) => patchAxis("h", v)}
              />
              <AxisFields
                title="Vertical constraint"
                axisValue={itemView.v}
                labels={VERTICAL}
                onChange={(v) => patchAxis("v", v)}
              />

              <details className="advanced">
                <summary>Advanced: pivot &amp; rotation</summary>
                <fieldset className="axis">
                  <legend>Pivot & rotation</legend>
                  <div className="pivot">
                    {PIVOTS.map(([x, y]) => (
                      <button
                        key={`${x}-${y}`}
                        className={
                          itemView.pivot[0] === x && itemView.pivot[1] === y
                            ? "on"
                            : ""
                        }
                        onClick={() => patch({ pivot: [x, y] })}
                        title={`Pivot ${x}% ${y}%`}
                      >
                        ·
                      </button>
                    ))}
                  </div>
                  <NumberField
                    label="Pivot X (% of item)"
                    value={itemView.pivot[0]}
                    onChange={(x) => patch({ pivot: [x, itemView.pivot[1]] })}
                  />
                  <NumberField
                    label="Pivot Y (% of item)"
                    value={itemView.pivot[1]}
                    onChange={(y) => patch({ pivot: [itemView.pivot[0], y] })}
                  />
                  <NumberField
                    label="Rotation (degrees)"
                    value={itemView.rotate}
                    onChange={(rotate) => patch({ rotate })}
                  />
                </fieldset>
              </details>
            </div>
          )}
        </div>
      )}

      {tab === "general" && (
        <div className="panel">
          <p className="hint">
            {ownSettings
              ? "These settings belong to this tab only."
              : "These are the main tab's settings. Tabs that use the defaults follow them."}{" "}
            Change a tab's settings on the Tabs tab.
          </p>
          <Group title="Tab bar (site-wide)">
          <NumberField
            label="Temporary slots for hidden tabs opened by a link"
            value={ui.tabs.maxTemporary}
            onChange={(v) => setUi("tabs", { maxTemporary: Math.max(0, Math.floor(v)) })}
          />
          <Select
            label="Font"
            value={ui.tabs.font || ""}
            options={rootFontOptions}
            onChange={(font) => setUi("tabs", { font })}
          />
          <Select
            label="Text colour"
            value={String(ui.tabs.text)}
            options={rootColourOptions}
            onChange={(n) => setUi("tabs", { text: Number(n) })}
          />
          <Select
            label="Background colour"
            value={String(ui.tabs.background)}
            options={rootColourOptions}
            onChange={(n) => setUi("tabs", { background: Number(n) })}
          />
          <Select
            label="Open tab colour"
            value={String(ui.tabs.active)}
            options={rootColourOptions}
            onChange={(n) => setUi("tabs", { active: Number(n) })}
          />
          <Check
            label="Slide between tabs on a PC (the new page slides in over the old one)"
            checked={ui.tabs.slide !== false}
            onChange={(slide) => setUi("tabs", { slide })}
          />
          <Check
            label="Slide between tabs on phones"
            checked={ui.tabs.slidePhone === true}
            onChange={(slidePhone) => setUi("tabs", { slidePhone })}
          />

          </Group>
          <Group title="Workshop look (site-wide)">
          <Select
            label="Font"
            value={ui.workshop.font || ""}
            options={rootFontOptions}
            onChange={(font) => setUi("workshop", { font })}
          />
          <Select
            label="Text colour"
            value={String(ui.workshop.text)}
            options={rootColourOptions}
            onChange={(n) => setUi("workshop", { text: Number(n) })}
          />
          <Select
            label="Background colour"
            value={String(ui.workshop.background)}
            options={rootColourOptions}
            onChange={(n) => setUi("workshop", { background: Number(n) })}
          />

          </Group>
          <Group title="Workshop button (bottom corner)">
          <Select
            label="Text colour"
            value={String(ui.toggle.text)}
            options={rootColourOptions}
            onChange={(n) => setUi("toggle", { text: Number(n) })}
          />
          <Select
            label="Background colour"
            value={String(ui.toggle.background)}
            options={rootColourOptions}
            onChange={(n) => setUi("toggle", { background: Number(n) })}
          />
          <Select
            label="Font"
            value={ui.toggle.font || ""}
            options={rootFontOptions}
            onChange={(font) => setUi("toggle", { font })}
          />
          <Check
            label="Hide the button on phones (while the workshop is closed)"
            checked={ui.toggle.hidePhone}
            onChange={(hidePhone) => setUi("toggle", { hidePhone })}
          />
          </Group>
          <Group title="Text families (default size, font and colour for each)">
          <TextFamiliesFields site={site} setSite={setSite} palette={paletteOptions(site)} />
          </Group>
          <Group title="Buttons: two presses (site-wide)">
          <p className="hint">
            With two presses, the first press on a button opens its card and the second press
            clicks it (follows its link, flashes). Hover does not open the card on that device.
          </p>
          <Check
            label="Two presses on touch screens"
            checked={ui.buttons.touch}
            onChange={(touch) => setUi("buttons", { touch })}
          />
          <Check
            label="Two presses on PC (mouse)"
            checked={ui.buttons.pc}
            onChange={(pc) => setUi("buttons", { pc })}
          />
          </Group>
          <Group title="Hint for a second press (round badge under the button)">
          <Check
            label="Show the hint while a card waits for its second press"
            checked={ui.hint.on}
            onChange={(on) => setUi("hint", { on })}
          />
          <Select
            label="Arrow points (when there is no picture or message)"
            value={ui.hint.side || "right"}
            options={[
              ["right", "Right"],
              ["left", "Left"],
            ]}
            onChange={(side) => setUi("hint", { side })}
          />
          <NumberField
            label="Distance below the centre of the button (px)"
            value={ui.hint.distance ?? 12}
            onChange={(v) => setUi("hint", { distance: Math.max(0, Math.round(v)) })}
          />
          <Select
            label="Font"
            value={ui.hint.font || ""}
            options={rootFontOptions}
            onChange={(font) => setUi("hint", { font })}
          />
          <Select
            label="Background colour (no picture)"
            value={String(ui.hint.background ?? 0)}
            options={rootColourOptions}
            onChange={(n) => setUi("hint", { background: Number(n) })}
          />
          <Select
            label="Text colour (no picture)"
            value={String(ui.hint.text ?? 0)}
            options={rootColourOptions}
            onChange={(n) => setUi("hint", { text: Number(n) })}
          />
          <FilePath
            label="Round picture (optional)"
            value={ui.hint.image || ""}
            type="image"
            placeholder="0/hint"
            onChange={(image) => setUi("hint", { image })}
          />
          <Field label="Message (used when there is no picture; empty = an arrow)">
            <input value={ui.hint.message || ""} onChange={(e) => setUi("hint", { message: e.target.value })} />
          </Field>
          </Group>
          <Group title="Palette">
          <p className="hint">
            Edit a hex value and the whole page updates. Add or remove colours;
            roles and sections keep their colours when a colour is removed.
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
              <button
                className="danger"
                disabled={site.palette.length <= 1}
                onClick={() => dropColour(i)}
                aria-label={`Remove colour ${i + 1}`}
                title="Remove colour"
              >
                ×
              </button>
            </div>
          ))}
          <div className="row">
            <button onClick={addColour}>+ Add colour</button>
          </div>

          </Group>
          <Group title="Fonts (for text items, chosen on each text item)">
          <p className="hint">
            A font is a CSS font family, such as <code>Georgia, serif</code>. Or name a
            file in <code>public/fonts/</code>: WOFF2, WOFF, TrueType (<code>.ttf</code>) or OpenType (<code>.otf</code>), for example <code>Display.ttf</code>
            and it is loaded from there. Removing a font makes text that used it fall back
            to the site font.
          </p>
          {site.fonts.map((f, i) => (
            <div className="font-row" key={f.id}>
              <input
                value={f.name}
                aria-label={`Font ${i + 1} name`}
                placeholder="Name"
                onChange={(e) => setFont(i, { name: e.target.value })}
              />
              <input
                value={f.family}
                aria-label={`Font ${i + 1} family`}
                placeholder="CSS family, e.g. Georgia, serif"
                onChange={(e) => setFont(i, { family: e.target.value })}
              />
              <input
                value={f.file || ""}
                aria-label={`Font ${i + 1} file`}
                placeholder="or file in public/fonts (.woff2, .ttf, .otf)"
                onChange={(e) => setFont(i, { file: e.target.value })}
              />
              <button className="danger" onClick={() => dropFont(i)} aria-label={`Remove font ${i + 1}`} title="Remove font">
                ×
              </button>
            </div>
          ))}
          <div className="row">
            <button onClick={addFont}>+ Add font</button>
          </div>

          </Group>
          <Group title="Scrolling">
          <NumberField
            label="Texture panning smoothing (ms, 0 = instant)"
            value={rootSite.scroll?.panSmoothMs ?? 240}
            onChange={(ms) =>
              setRootSite((r) => ({ ...r, scroll: { ...(r.scroll || {}), panSmoothMs: Math.max(0, ms) } }))
            }
          />
          <p className="hint">
            How long the panning textures take to catch up with a scroll. Applies to the whole
            site, every tab.
          </p>

          </Group>
          <Group title="Roles">
          {ROLES.map((role) => (
            <Select
              key={role}
              label={role[0].toUpperCase() + role.slice(1)}
              value={String(site.roles?.[role] ?? 1)}
              options={paletteOptions(site)}
              onChange={(n) => setRole(role, Number(n))}
            />
          ))}
          </Group>
        </div>
      )}

      {tab === "pages" && (
        <div className="panel">
          <p className="hint">
            Each tab is its own page, with its own items and sections. The first tab is
            shown first in the bar at the top of the site. Each tab is a file: the main
            tab is <code>main.json</code>, and a tab named Projects is{" "}
            <code>projects.json</code> in <code>src/config/pages/</code>.
          </p>
          <ul className="page-list">
            {pagesApi.tabs.map((id, i, all) => (
              <li key={id} className={id === pagesApi.active ? "on" : ""}>
                <button
                  className="page-pick"
                  onClick={() => pagesApi.go(id)}
                  aria-current={id === pagesApi.active ? "true" : undefined}
                >
                  {pagesApi.pages[id].title || id}
                </button>
                <span className="hint">
                  {id}.json{pagesApi.pages[id].showInBar === false ? " · hidden" : ""}
                </span>
                <button onClick={() => pagesApi.move(id, -1)} disabled={i === 0} aria-label="Move tab left">
                  ↑
                </button>
                <button
                  onClick={() => pagesApi.move(id, 1)}
                  disabled={i === all.length - 1}
                  aria-label="Move tab right"
                >
                  ↓
                </button>
                {id !== "main" && (
                  <button className="danger" onClick={() => pagesApi.remove(id)} aria-label="Delete tab">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Field label="Name of the open tab">
            <input
              value={page.title || ""}
              onChange={(e) => pagesApi.rename(page.id, e.target.value)}
            />
          </Field>
          <Check
            label="Show in the tab bar"
            checked={page.showInBar !== false}
            onChange={(on) => pagesApi.setFlags(page.id, { showInBar: on })}
          />
          <Check
            label="Once opened, keep it in the bar for that browser"
            checked={!!page.keepWhenOpened}
            onChange={(on) => pagesApi.setFlags(page.id, { keepWhenOpened: on })}
          />
          <p className="hint">
            A tab hidden from the bar can still be opened by a link or a button. Opened that
            way, it takes a temporary slot at the end of the bar (the number of slots is set on
            the General tab; the oldest drops out). With "keep it" ticked, it stays in the bar
            for that visitor's browser instead.
          </p>
          {page.id !== "main" && (
            <Check
              label="Use the main tab's general settings (palette, roles, text sizes, fonts)"
              checked={!ownSettings}
              onChange={(on) => pagesApi.setUseDefaults(page.id, on)}
            />
          )}
          {ownSettings && (
            <p className="hint">
              This tab has its own general settings. Edit them on the General tab. Untick
              the box above to go back to the main tab's settings.
            </p>
          )}
          <h4>New tab</h4>
          <NewTab onAdd={pagesApi.add} />
        </div>
      )}

      {tab === "phone" && (
        <div className="panel">
          <p className="hint">
            Phone overrides apply only on phones. Use the <b>Phone</b> switch at
            the top and edit on the Page tab: those edits are saved here. You
            can also edit the JSON by hand.
          </p>
          <NumberField
            label="Breakpoint (phone width in px, or less)"
            value={mobile.breakpoint}
            onChange={(b) =>
              setPage((p) => ({
                ...p,
                mobile: {
                  ...DEFAULT_MOBILE,
                  ...(p.mobile || {}),
                  breakpoint: Math.max(200, b),
                },
              }))
            }
          />
          <Select
            label="Phone preview width (px)"
            value={String(previewWidth)}
            options={[
              ["320", "320 (small phone)"],
              ["360", "360"],
              ["390", "390 (design)"],
              ["430", "430 (large phone)"],
            ]}
            onChange={(v) => setPreviewWidth(Number(v))}
          />
          <p className="hint">
            The preview is shown at this width, so you can check how items
            shrink. The real phone width is used on actual phones.
          </p>
          <div className="paste-guide">
            <p className="hint">
              <b>Saving phone overrides:</b> one file for every tab,{" "}
              <code>src/config/phone.json</code>. It has an entry per tab, named by the tab's
              id. Download it, or copy it, and replace the file. This tab's box below shows only
              the current tab's entry.
            </p>
            <div className="row">
              <button onClick={() => copy(phoneText, "phone.json")}>Copy phone.json</button>
              <button onClick={() => download("phone.json", phoneText)}>Download phone.json</button>
            </div>
          </div>
          <Field label="Phone overrides (JSON)">
            <textarea
              rows={14}
              value={jsonText ?? JSON.stringify(mobile, null, 2)}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError("");
              }}
            />
          </Field>
          {jsonError && <p className="hint warn">{jsonError}</p>}
          <div className="row">
            <button onClick={applyPhoneJson} disabled={jsonText === null}>
              Apply JSON
            </button>
            <button
              onClick={() => setJsonText(null)}
              disabled={jsonText === null}
            >
              Discard edits
            </button>
            <button className="danger" onClick={clearPhone}>
              Clear all phone overrides…
            </button>
          </div>
        </div>
      )}

      {tab === "export" && (
        <div className="panel">
          <p className="hint">
            Copy each file and paste it over the matching file in GitHub, then commit. The
            site settings go in <code>src/config/site.json</code>, each tab in{" "}
            <code>src/config/pages/&lt;tab&gt;.json</code>, and all phone overrides in{" "}
            <code>src/config/phone.json</code>.
          </p>
          {editedNames.length ? (
            <p className="hint warn">Edited since the saved config: {editedNames.join(", ")}</p>
          ) : (
            <p className="hint">Nothing is edited yet.</p>
          )}
          {edited.removed.length > 0 && (
            <p className="hint warn">
              Deleted tabs (remove these files from GitHub): {edited.removed.join(", ")}
            </p>
          )}
          <ExportFile name="site.json" text={siteText} edited={edited.changed["site.json"]} copy={copy} />
          {exportTabs.map((id) => (
            <ExportFile
              key={id}
              name={`${id}.json`}
              text={pageFile(id)}
              edited={edited.changed[`${id}.json`]}
              copy={copy}
            />
          ))}
          <ExportFile name="phone.json" text={phoneText} edited={edited.changed["phone.json"]} copy={copy} />
          <p className="hint">
            Icon: put one image in <code>public/icon/</code>, named <code>icon.png</code> (or
            <code>.svg</code>, <code>.ico</code>, <code>.jpg</code>, <code>.webp</code>). Fonts:
            files go in <code>public/fonts/</code>.
          </p>
          {copied && <p className="hint">{copied}</p>}
        </div>
      )}

      <footer>
        <button className="danger" onClick={onReset}>
          Reset to saved config…
        </button>
        <button onClick={onClose}>Close</button>
      </footer>
    </aside>
  );
}
