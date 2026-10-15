// Pure helpers: constraint -> CSS, text markup -> tokens, config validation.

export const TYPES = ["text", "image", "gif", "video"];
export const ANCHORS = ["start", "center", "end", "stretch"];
export const UNITS = ["px", "%"];
export const SIZE_UNITS = ["px", "%", "auto"];
export const COLORS = ["text", "secondary", "highlight"];
export const ROLES = ["background", "text", "secondary", "highlight"];
const COLOR_CODE = { n: "text", s: "secondary", h: "highlight" };

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
    Object.assign(item, { src: "", poster: "", controls: true, loop: false, autoplay: false });
  } else {
    Object.assign(item, { src: "", alt: "", fit: "contain" });
  }
  return item;
}

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
  return errors;
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
  return errors;
}
