// Pure helpers: constraints -> CSS, text markup, toggling, media paths,
// sections, phone overrides, palette edits and validation.

export const TYPES = ["text", "image", "gif", "video", "animated", "button"];

// Hover effects for buttons (and GIFs made into buttons). Every number is a
// variable in the workshop. Colours are palette numbers; flashColour 0 = white.
export const DEFAULT_FX = {
  // The button: shake (once), flash of the picture, moving band (shine)
  shake: true,
  shakeMs: 600,
  shakeAmount: 100, // % of the normal shake strength
  flash: true,
  flashMs: 300,
  flashColour: 0,
  flashStrength: 95, // peak opacity of the flash, %
  shine: true,
  shineDelayMs: 0, // when the band starts, from hover (0 = at once, not after the flash)
  shineMs: 700, // time for the band to cross
  shineWidth: 70, // band width, % of the button
  shineColour: 4,
  shineSlant: 18, // degrees
  clickFlash: true, // colour flash on click, when the button has a link or cards
};
// One card that opens over a button. A button has a list of these (fx.cards); they open
// together, later ones on top. clickable: clicking the card counts as a click on the
// button (its link runs and the button flashes). A card that is not clickable lets
// clicks pass through to whatever is under it.
export const DEFAULT_CARD = {
  clickable: false,
  waitFlash: true, // open when the button's flash has finished (not the band)
  file: "", // picture; empty = the button's picture
  scale: 2.5, // size, times the button
  fit: "both", // keep on screen: none | x | y | both
  openMs: 450,
  closeMs: 360,
  radius: 6,
  background: 0, // 0 = transparent (a PNG shows its own shape); else a palette number
  imageFit: "cover", // cover: fill (crop) | contain: keep the whole picture
  tilt: true,
  tiltStrength: 100,
  shake: true,
  shakeMs: 600,
  shakeAmount: 100,
  shine: true,
  shineColour: 4,
  shineWidth: 70,
  shineMs: 700,
  slant: 18,
  flash: true,
  flashColour: 3,
  flashMs: 500,
};
/**
 * The cards of a button. Items saved before the list existed have fx.card and fx.card*
 * fields; those become one card with the same look as before.
 */
export function cardsOf(fx = {}) {
  // waitFlash used to be one setting of the button; a card without its own value takes it.
  const waitFlash = fx.waitFlash ?? DEFAULT_CARD.waitFlash;
  if (Array.isArray(fx.cards)) return fx.cards.map((c) => ({ ...DEFAULT_CARD, waitFlash, ...c }));
  if (fx.card === false) return [];
  const old = {};
  for (const [k, v] of Object.entries(fx)) {
    if (/^card[A-Z]/.test(k)) old[k[4].toLowerCase() + k.slice(5)] = v;
  }
  return [{ ...DEFAULT_CARD, waitFlash, ...old }];
}
export const DEFAULT_LINK = { kind: "none", url: "", section: "", page: "", newTab: false };
export const DEFAULT_SPEED = 0.5;
// The size each layout was designed at. Shrinking items scale down below it.
export const DEFAULT_DESIGN = { designWidth: 1200, designHeight: 800 };
export const ANCHORS = ["start", "center", "end", "stretch"];
export const UNITS = ["px", "%"];
export const SIZE_UNITS = ["px", "%", "auto"];
export const COLORS = ["text", "secondary", "highlight"];
export const ROLES = ["background", "text", "secondary", "highlight"];
export const DEFAULT_TEXT = { body: 16, h1: 56, h2: 36, h3: 24 };
export const DEFAULT_SCROLL = { panSmoothMs: 240 };
// Look of the tab bar and the workshop. Colours are palette numbers; 0 = the default.
// fonts: "" = the site font, otherwise a font id from site.fonts.
// maxTemporary: how many hidden tabs opened by a link can hold a slot in the bar.
export const DEFAULT_UI = {
  tabs: { font: "", text: 0, background: 0, active: 0, maxTemporary: 1, slide: true },
  workshop: { font: "", text: 0, background: 0 },
};
export const DEFAULT_FONTS = [
  { id: "serif", name: "Serif", family: "Georgia, \"Times New Roman\", serif", file: "" },
  { id: "rounded", name: "Rounded", family: "\"Trebuchet MS\", Verdana, sans-serif", file: "" },
  { id: "mono", name: "Monospace", family: "ui-monospace, Menlo, Consolas, monospace", file: "" },
];
// The general settings a tab either shares with the main tab or has of its own.
export const GENERAL_KEYS = ["palette", "roles", "text", "fonts"];
export const DEFAULT_PAGE_CANVAS = { height: 1200, designWidth: 1200, designHeight: 800 };
export const DEFAULT_MOBILE = {
  breakpoint: 700,
  canvas: {},
  items: {},
  sections: {},
};
const COLOR_CODE = { n: "text", s: "secondary", h: "highlight" };
const DEFAULT_EXT = { image: "png", gif: "gif", video: "mp4", animated: "png" };

export function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Text markup --------------------------------------------------------------
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

// --- Toggling formats on a selection -------------------------------------------
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

// --- Layout constraints -> CSS ---------------------------------------------------
// Items are positioned inside their frame: the page, a band section, or a
// screen overlay. Percent values are of that frame.
const css = (value, unit) =>
  `${Number(value) || 0}${unit === "%" ? "%" : "px"}`;

/**
 * Every pixel value is written as calc(N * var(--u)). --u is one pixel at the
 * design size and shrinks with the screen (see unitFor), so px values scale
 * continuously. Percentages are never scaled: they already follow the frame.
 */
const px = (n) => `calc(${Number(n) || 0} * var(--u, 1px))`;

// One axis. `lo`/`hi` are the CSS edges (left/right or top/bottom).
function axis(a = {}, lo, hi, size) {
  const v = (n, unit) => (unit === "%" ? css(n, unit) : px(n));
  const style = {};
  let shift = "0";
  if (a.anchor === "end") style[hi] = v(a.offset, a.unit);
  else if (a.anchor === "center") {
    style[lo] = `calc(50% + ${v(a.offset, a.unit)})`;
    shift = "-50%"; // centres the item on the anchor point
  } else style[lo] = v(a.offset, a.unit);
  if (a.anchor === "stretch") style[hi] = v(a.offsetEnd, a.unit);
  else if (a.sizeUnit && a.sizeUnit !== "auto") style[size] = v(a.size, a.sizeUnit);
  return { style, shift };
}

/**
 * The item's unit, as a CSS length: one pixel at the design size, shrinking with
 * the screen. "x" follows the width, "y" the height, "both" the smaller of the two.
 * Never grows above 1px, so the design is the largest size. Off = plain px.
 * The phone preview sets --vw to its own width.
 */
export function unitFor(item, canvas = {}) {
  const sh = item.shrink;
  if (!sh?.on) return "1px";
  const dw = Number(canvas.designWidth) || DEFAULT_DESIGN.designWidth;
  const dh = Number(canvas.designHeight) || DEFAULT_DESIGN.designHeight;
  const byW = `calc(var(--vw, 100vw) / ${dw})`;
  const byH = `calc(100vh / ${dh})`;
  const parts = sh.axis === "y" ? [byH] : sh.axis === "both" ? [byW, byH] : [byW];
  // grow (auto size) follows the screen both ways; otherwise it is capped at the design.
  if (sh.grow) return parts.length === 1 ? parts[0] : `min(${parts.join(", ")})`;
  return `min(1px, ${parts.join(", ")})`;
}

/** Converts an item's constraints into CSS (its --u is set by the canvas). */
export function itemStyle(item) {
  const x = axis(item.h, "left", "right", "width");
  const y = axis(item.v, "top", "bottom", "height");
  const [px0, py] = item.pivot || [50, 50];
  const transforms = [`translate(${x.shift}, ${y.shift})`];
  if (item.rotate) transforms.push(`rotate(${Number(item.rotate)}deg)`);
  return {
    position: "absolute",
    ...x.style,
    ...y.style,
    transformOrigin: `${px0}% ${py}%`,
    transform: transforms.join(" "),
  };
}

// --- Media paths ---------------------------------------------------------------
/**
 * "0/profile" -> "images/0/profile.png". The extension is optional; the default
 * depends on the item type. Full http(s) URLs are used as they are.
 */
export function mediaUrl(item) {
  let file = String(item?.file || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;
  file = file.replace(/^images\//i, "");
  if (!/\.[a-z0-9]+$/i.test(file.split("/").pop()))
    file += `.${DEFAULT_EXT[item.type] || "png"}`;
  return `images/${file}`;
}

// --- Creating things -------------------------------------------------------------
export function newItem(type, id, parent = "") {
  const item = {
    id,
    type,
    name: "",
    parent,
    h: {
      anchor: "start",
      offset: 0,
      offsetEnd: 0,
      unit: "px",
      size: 300,
      sizeUnit: "px",
    },
    v: {
      anchor: "start",
      offset: 0,
      offsetEnd: 0,
      unit: "px",
      size: 0,
      sizeUnit: "auto",
    },
    pivot: [50, 50],
    rotate: 0,
    shrink: { on: false, axis: "x" },
  };
  if (type === "text") {
    Object.assign(item, {
      text: "Write something here.",
      font: "", // "" = the site's body font; otherwise a font id from site.fonts
      level: "p",
      align: "left",
      color: "text",
      shrink: { on: true, axis: "x", grow: true }, // auto size: grows and shrinks with the screen
    });
  } else if (type === "video") {
    Object.assign(item, {
      file: "",
      poster: "",
      controls: true,
      loop: false,
      autoplay: false,
    });
  } else if (type === "animated") {
    // A square box filled with the image, tiled like a section texture.
    Object.assign(item, {
      file: "",
      tile: 64,
      offsetX: 0,
      offsetY: 0,
      textureRotate: 0,
      repeatX: true,
      repeatY: true,
      scrollX: false,
      speedX: DEFAULT_SPEED,
      scrollY: false,
      speedY: DEFAULT_SPEED,
    });
  } else if (type === "video") {
    Object.assign(item, {
      file: "",
      poster: "",
      controls: true,
      loop: false,
      autoplay: false,
      hoverOnly: false,
      thumbnail: "",
    });
  } else if (type === "button") {
    Object.assign(item, { file: "", alt: "", fit: "contain", link: { ...DEFAULT_LINK }, fx: { ...DEFAULT_FX } });
  } else {
    // image, and gif (which can be made hover-only or into a button)
    Object.assign(item, {
      file: "",
      alt: "",
      fit: "contain",
      hoverOnly: false,
      thumbnail: "",
      button: false,
      link: { ...DEFAULT_LINK },
      fx: { ...DEFAULT_FX },
    });
  }
  return item;
}

/**
 * kind "band": a background section placed from the top or bottom of the page.
 * kind "fixed": a screen overlay, always the size of the screen, fixed on scroll.
 */
/** A new tab. It shares the main tab's general settings until it gets its own. */
export function newPage(id, title) {
  return {
    id,
    title,
    useDefaults: true,
    showInBar: true, // false: hidden from the bar (still reachable by link or button)
    keepWhenOpened: false, // true: once opened, it stays in the bar for that browser
    canvas: { ...DEFAULT_PAGE_CANVAS },
    items: [],
    sections: [],
  };
}

/** Lower-case id for a tab name: letters, digits and dashes only. */
export function pageSlug(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tab"
  );
}

/** The general settings a page uses: the site's, or its own. */
export function generalOf(site, page) {
  if (!page || page.id === "main" || page.useDefaults !== false) return site;
  return (
    page.settings || {
      palette: site.palette,
      roles: site.roles,
      text: site.text,
      fonts: site.fonts,
    }
  );
}

/** CSS font format for a file name: woff2, woff, TrueType (.ttf) or OpenType (.otf). */
export function fontFormat(file = "") {
  const ext = String(file).split(".").pop().toLowerCase();
  return { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" }[ext] || "";
}

/** A font's CSS family: its own family list, or a font file in public/fonts. */
export function fontFamily(font) {
  if (!font) return "";
  return font.file ? `"${font.name || font.id}", ${font.family || "sans-serif"}` : font.family;
}

export function newSection(kind, id, start = 0) {
  if (kind === "fixed") return { id, kind: "fixed", name: "" };
  return {
    id,
    kind: "band",
    name: "",
    anchor: "top",
    start,
    height: 600,
    background: 2,
    texture: {
      file: "",
      size: 200,
      offsetX: 0,
      offsetY: 0,
      scrollX: false,
      speedX: DEFAULT_SPEED,
      scrollY: false,
      speedY: DEFAULT_SPEED,
      rotate: 0,
    },
    overlay: { colour: 1, opacity: 0 },
  };
}

export const isBand = (section) => (section.kind || "band") === "band";

/**
 * CSS background-position on one axis. A panning axis moves with the scroll
 * movement: --pan is the eased sum of scroll steps since the page loaded (set in
 * scroll.js), so scrolling back takes the movement back. Speed is px moved per px
 * scrolled (negative = the other way). Offsets and movement scale with --u.
 */
export function panPos(offset = 0, pan = false, speed = DEFAULT_SPEED) {
  const o = Number(offset) || 0;
  const fixed = o ? px(o) : "0px";
  if (!pan) return fixed;
  const s = Number.isFinite(Number(speed)) ? Number(speed) : DEFAULT_SPEED;
  return `calc(var(--pan, 0) * ${s} * var(--u, 1px) + ${fixed})`;
}

/** Top edge of a band in page coordinates. */
export function bandTop(section, pageH) {
  return section.anchor === "bottom"
    ? pageH - section.start - section.height
    : section.start;
}

/** The page grows to fit bands that extend below the canvas height. */
export function pageHeight(page) {
  let h = page.canvas.height;
  for (const s of page.sections || [])
    if (isBand(s))
      h = Math.max(
        h,
        s.anchor === "bottom" ? s.start + s.height : s.start + s.height,
      );
  return h;
}

/** Phone overrides: merged over the base page on phones and in Phone mode. */
export function applyPhone(page) {
  const m = page.mobile;
  if (!m) return page;
  return {
    ...page,
    canvas: { ...page.canvas, ...(m.canvas || {}) },
    items: page.items.map((i) =>
      m.items?.[i.id] ? { ...i, ...m.items[i.id] } : i,
    ),
    sections: (page.sections || []).map((s) =>
      m.sections?.[s.id] ? { ...s, ...m.sections[s.id] } : s,
    ),
  };
}

/**
 * Removes palette colour n (1-based). Anything that used it falls back to
 * colour 1; anything after it moves down one, so it keeps its colour.
 */
export function removeColour(site, page, n) {
  const remap = (v) => (v === n ? 1 : v > n ? v - 1 : v);
  const band = (s) =>
    isBand(s)
      ? {
          ...s,
          background: remap(s.background),
          ...(s.overlay
            ? { overlay: { ...s.overlay, colour: remap(s.overlay.colour) } }
            : {}),
        }
      : s;
  const phoneSection = (o) => {
    const next = { ...o };
    if (o.background !== undefined) next.background = remap(o.background);
    if (o.overlay)
      next.overlay = { ...o.overlay, colour: remap(o.overlay.colour) };
    return next;
  };
  const mobile = page.mobile && {
    ...page.mobile,
    sections: Object.fromEntries(
      Object.entries(page.mobile.sections || {}).map(([id, o]) => [
        id,
        phoneSection(o),
      ]),
    ),
  };
  return {
    site: {
      ...site,
      palette: site.palette.filter((_, i) => i !== n - 1),
      roles: Object.fromEntries(
        Object.entries(site.roles).map(([k, v]) => [k, remap(v)]),
      ),
    },
    page: {
      ...page,
      sections: (page.sections || []).map(band),
      ...(mobile ? { mobile } : {}),
    },
  };
}

// --- Validation -----------------------------------------------------------------
const hex = /^#[0-9a-f]{6}$/i;

export function validateSite(site) {
  const errors = [];
  const n = Array.isArray(site?.palette) ? site.palette.length : 0;
  if (n < 1) errors.push("site.palette needs at least one colour");
  else
    site.palette.forEach((c, i) => {
      if (!hex.test(c)) errors.push(`palette ${i + 1} must be #RRGGBB`);
    });
  for (const role of ROLES) {
    const v = site?.roles?.[role];
    if (!Number.isInteger(v) || v < 1 || v > n)
      errors.push(`roles.${role} must be a palette number from 1 to ${n}`);
  }
  for (const f of site?.fonts || []) {
    if (!f.id || !(f.family || f.file)) errors.push(`font "${f.name || f.id || "?"}" needs an id and a family or file`);
  }
  for (const [key, value] of Object.entries(site?.text || {}))
    if (!(DEFAULT_TEXT[key] !== undefined && value > 0))
      errors.push(`text.${key} must be a size in px`);
  return errors;
}

export function validatePage(page, site = null) {
  if (!page || !Array.isArray(page.items)) return ["page.items must be a list"];
  const errors = [];
  const colours = site?.palette?.length || 99;
  const inPalette = (n) => Number.isInteger(n) && n >= 1 && n <= colours;
  if (!(page.canvas?.height > 0))
    errors.push("canvas.height must be a positive number");

  const sectionIds = new Set();
  (page.sections || []).forEach((s, i) => {
    const where = `section ${i + 1}`;
    if (!s.id || sectionIds.has(s.id))
      errors.push(`${where}: missing or duplicate id`);
    sectionIds.add(s.id);
    if (!["band", "fixed", undefined].includes(s.kind))
      errors.push(`${where}: unknown kind`);
    if (isBand(s)) {
      if (!(s.start >= 0)) errors.push(`${where}: start must be 0 or more`);
      if (!(s.height > 0)) errors.push(`${where}: height must be positive`);
      if (!inPalette(s.background))
        errors.push(`${where}: background must be a palette number`);
      if (s.overlay && !inPalette(s.overlay.colour))
        errors.push(`${where}: overlay colour must be a palette number`);
    }
  });

  const ids = new Set();
  page.items.forEach((item, i) => {
    const where = `item ${i + 1}`;
    if (!TYPES.includes(item.type)) errors.push(`${where}: unknown type`);
    if (!item.id || ids.has(item.id))
      errors.push(`${where}: missing or duplicate id`);
    ids.add(item.id);
    if (item.type === "animated" && !(item.tile > 0))
      errors.push(`${where}: tile size must be positive`);
    if (item.type === "text" && typeof item.text !== "string")
      errors.push(`${where}: text items need text`);
    if (item.parent && !sectionIds.has(item.parent))
      errors.push(`${where}: parent section not found`);
  });
  if (
    page.mobile !== undefined &&
    (typeof page.mobile !== "object" || !page.mobile)
  )
    errors.push("mobile must be an object");
  return errors;
}
