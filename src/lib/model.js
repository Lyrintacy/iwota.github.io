// Pure helpers: constraint -> CSS, text markup, toggling, media paths, validation.

export const TYPES = ["text", "image", "gif", "video"];
export const ANCHORS = ["start", "center", "end", "stretch"];
export const UNITS = ["px", "%"];
export const SIZE_UNITS = ["px", "%", "auto"];
export const COLORS = ["text", "secondary", "highlight"];
export const ROLES = ["background", "text", "secondary", "highlight"];
export const DEFAULT_TEXT = { body: 16, h1: 56, h2: 36, h3: 24 };
const COLOR_CODE = { n: "text", s: "secondary", h: "highlight" };
const DEFAULT_EXT = { image: "png", gif: "gif", video: "mp4" };

export function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Markup: **bold**, *italic*, ***bold italic***,
 * {s:secondary}, {h:highlight}, {n:normal}. Colour spans may contain emphasis.
 */
export function inlineTokens(text = "") {
  const out = [];
  const pushStyled = (chunk, color) => {
    const re = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
    let i = 0,
      m;
    while ((m = re.exec(chunk))) {
      if (m.index > i) out.push({ text: chunk.slice(i, m.index), color });
      if (m[1] !== undefined)
        out.push({ text: m[1], color, bold: true, italic: true });
      else if (m[2] !== undefined) out.push({ text: m[2], color, bold: true });
      else out.push({ text: m[3], color, italic: true });
      i = re.lastIndex;
    }
    if (i < chunk.length) out.push({ text: chunk.slice(i), color });
  };
  const colour = /\{(n|s|h):([^{}]*)\}/g;
  let last = 0,
    m;
  while ((m = colour.exec(text))) {
    if (m.index > last) pushStyled(text.slice(last, m.index), null);
    pushStyled(m[2], COLOR_CODE[m[1]]);
    last = colour.lastIndex;
  }
  if (last < text.length) pushStyled(text.slice(last), null);
  return out;
}

// --- Toggling formats on a selection --------------------------------------
// Bold and italic are asterisk runs around the selection: * = italic,
// ** = bold, *** = both. Toggling flips one bit of that run.
const BOLD = 2,
  ITALIC = 1;

function asteriskRun(text, s, e) {
  let i = s;
  while (i > 0 && text[i - 1] === "*") i--;
  let j = e;
  while (j < text.length && text[j] === "*") j++;
  return { before: s - i, after: j - e };
}

function enclosingColour(text, s, e) {
  const re = /\{(n|s|h):([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const start = m.index,
      end = start + m[0].length;
    const cs = start + 3,
      ce = end - 1;
    if (s >= cs && e <= ce) return { start, end, cs, ce, code: m[1] };
  }
  return null;
}

/** Which formats apply to the current selection (for highlighting buttons). */
export function formatAt(text = "", s = 0, e = 0) {
  if (s === e) return { bold: false, italic: false, colour: null };
  const r = asteriskRun(text, s, e);
  const run = Math.min(r.before, r.after, 3);
  const hit = enclosingColour(text, s, e);
  return {
    bold: !!(run & BOLD),
    italic: !!(run & ITALIC),
    colour: hit ? COLOR_CODE[hit.code] : null,
  };
}

/**
 * kind: "bold" | "italic" | "s" (secondary) | "h" (highlight) | "n" (clear colour).
 * Returns the new text and selection, or null when nothing is selected or the
 * selection would cross a colour boundary.
 */
export function toggleFormat(text, s, e, kind) {
  if (s === e) return null;
  if (kind === "bold" || kind === "italic") {
    const r = asteriskRun(text, s, e);
    const run = Math.min(r.before, r.after, 3);
    const next = run ^ (kind === "bold" ? BOLD : ITALIC);
    const stars = "*".repeat(next);
    const mid = text.slice(s, e);
    const ns = s - run + next;
    return {
      text: text.slice(0, s - run) + stars + mid + stars + text.slice(e + run),
      s: ns,
      e: ns + mid.length,
    };
  }
  if (/[{}]/.test(text.slice(s, e))) return null;
  const wrap = (code, t) => (code && t ? `{${code}:${t}}` : t);
  const code = kind === "n" ? null : kind;
  const hit = enclosingColour(text, s, e);
  const mid = text.slice(s, e);

  if (hit) {
    // Toggle off when the same colour is already applied; otherwise switch.
    const newCode = kind === "n" || hit.code === code ? null : code;
    const pre = wrap(hit.code, text.slice(hit.cs, s));
    const post = wrap(hit.code, text.slice(e, hit.ce));
    const ns = hit.start + pre.length + (newCode ? 3 : 0);
    return {
      text:
        text.slice(0, hit.start) +
        pre +
        wrap(newCode, mid) +
        post +
        text.slice(hit.end),
      s: ns,
      e: ns + mid.length,
    };
  }
  if (!code) return { text, s, e };
  return {
    text: text.slice(0, s) + wrap(code, mid) + text.slice(e),
    s: s + 3,
    e: s + 3 + mid.length,
  };
}

// --- Layout constraints -> CSS ----------------------------------------------
const css = (value, unit) => `${Number(value) || 0}${unit === "%" ? "%" : "px"}`;

// One axis. `lo`/`hi` are the CSS edges (left/right or top/bottom).
function axis(a = {}, lo, hi, size) {
  const style = {};
  let shift = "0";
  if (a.anchor === "end") style[hi] = css(a.offset, a.unit);
  else if (a.anchor === "center") {
    style[lo] = `calc(50% + ${css(a.offset, a.unit)})`;
    shift = "-50%"; // centres the item on the anchor point
  } else style[lo] = css(a.offset, a.unit);
  if (a.anchor === "stretch") style[hi] = css(a.offsetEnd, a.unit);
  else if (a.sizeUnit && a.sizeUnit !== "auto")
    style[size] = css(a.size, a.sizeUnit);
  return { style, shift };
}

/** Converts an item's constraints into CSS. Percent values are of the canvas. */
export function itemStyle(item) {
  const x = axis(item.h, "left", "right", "width");
  const y = axis(item.v, "top", "bottom", "height");
  const [px, py] = item.pivot || [50, 50];
  const transforms = [`translate(${x.shift}, ${y.shift})`];
  if (item.rotate) transforms.push(`rotate(${Number(item.rotate)}deg)`);
  return {
    position: "absolute",
    ...x.style,
    ...y.style,
    transformOrigin: `${px}% ${py}%`,
    transform: transforms.join(" "),
  };
}

// --- Media paths ------------------------------------------------------------
/**
 * "0/profile" -> "images/0/profile.png". The extension is optional; the default
 * depends on the item type. Full http(s) URLs are used as they are.
 */
export function mediaUrl(item) {
  let file = String(item?.file || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;
  file = file.replace(/^images\//i, "");
  if (!/\.[a-z0-9]+$/i.test(file.split("/").pop()))
    file += `.${DEFAULT_EXT[item.type] || "png"}`;
  return `images/${file}`;
}

export function newItem(type, id) {
  const item = {
    id,
    type,
    name: "",
    h: { anchor: "start", offset: 0, offsetEnd: 0, unit: "px", size: 300, sizeUnit: "px" },
    v: { anchor: "start", offset: 0, offsetEnd: 0, unit: "px", size: 0, sizeUnit: "auto" },
    pivot: [50, 50],
    rotate: 0,
  };
  if (type === "text") {
    Object.assign(item, {
      text: "Write something here.",
      level: "p",
      align: "left",
      color: "text",
    });
  } else if (type === "video") {
    Object.assign(item, { file: "", poster: "", controls: true, loop: false, autoplay: false });
  } else {
    Object.assign(item, { file: "", alt: "", fit: "contain" });
  }
  return item;
}

// --- Validation ---------------------------------------------------------------
const hex = /^#[0-9a-f]{6}$/i;

export function validateSite(site) {
  const errors = [];
  if (!site || !Array.isArray(site.palette) || site.palette.length !== 7)
    errors.push("site.palette must contain exactly 7 colours");
  else
    site.palette.forEach((c, i) => {
      if (!hex.test(c)) errors.push(`palette ${i + 1} must be #RRGGBB`);
    });
  for (const role of ROLES) {
    const n = site?.roles?.[role];
    if (!Number.isInteger(n) || n < 1 || n > 7)
      errors.push(`roles.${role} must be a palette number from 1 to 7`);
  }
  for (const [key, value] of Object.entries(site?.text || {}))
    if (!(DEFAULT_TEXT[key] !== undefined && value > 0))
      errors.push(`text.${key} must be a size in px`);
  return errors;
}

export function newSection(id, start = 0) {
  return {
    id,
    name: "",
    start,
    height: 600,
    background: 2,
    texture: { file: "", size: 200, offsetX: 0, offsetY: 0, rotate: 0 },
    overlay: { colour: 1, opacity: 0 },
  };
}

/** The page grows to fit its sections when they extend below the canvas height. */
export function pageHeight(page) {
  return Math.max(
    page.canvas.height,
    ...(page.sections || []).map((s) => s.start + s.height),
  );
}

export function validatePage(page) {
  if (!page || !Array.isArray(page.items)) return ["page.items must be a list"];
  const errors = [];
  if (!(page.canvas?.height > 0))
    errors.push("canvas.height must be a positive number");
  const ids = new Set();
  page.items.forEach((item, i) => {
    const where = `item ${i + 1}`;
    if (!TYPES.includes(item.type)) errors.push(`${where}: unknown type`);
    if (!item.id || ids.has(item.id))
      errors.push(`${where}: missing or duplicate id`);
    ids.add(item.id);
    if (item.type === "text" && typeof item.text !== "string")
      errors.push(`${where}: text items need text`);
  });
  const sectionIds = new Set();
  (page.sections || []).forEach((section, i) => {
    const where = `section ${i + 1}`;
    if (!section.id || sectionIds.has(section.id))
      errors.push(`${where}: missing or duplicate id`);
    sectionIds.add(section.id);
    if (!(section.start >= 0)) errors.push(`${where}: start must be 0 or more`);
    if (!(section.height > 0)) errors.push(`${where}: height must be positive`);
    if (!(section.background >= 1 && section.background <= 7))
      errors.push(`${where}: background must be a palette number from 1 to 7`);
  });
  return errors;
}
