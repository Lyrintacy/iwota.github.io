import { findExtension, hasExt } from "./media.js";
import { cardsOf, mediaUrl } from "./model.js";

// Pictures used by more than one item (a button and its card, the same image on
// several buttons) are loaded once and decoded in the background, after the page
// has started. Pictures on screen come first, then the rest, nearest first.

const IMAGE_TYPES = ["image", "gif", "picture"];

/** The picture files named by a page: item pictures, thumbnails, card pictures, textures. */
function namesOf(page) {
  const names = []; // { file, type, id }
  const add = (file, type, id) => {
    const f = String(file || "").trim();
    if (f && !/^https?:\/\//i.test(f)) names.push({ file: f, type, id });
  };
  for (const it of page.items || []) {
    const type = it.type === "gif" ? "gif" : "image";
    add(it.file, it.type === "video" ? null : type, it.id);
    add(it.thumbnail, "image", it.id);
    add(it.poster, "image", it.id);
    if (it.type === "button" || it.type === "gif") {
      for (const c of cardsOf(it.fx || {})) add(c.file, "picture", it.id);
    }
  }
  for (const s of page.sections || []) {
    if (s.texture?.file) add(s.texture.file, "image", s.id);
  }
  return names.filter((n) => n.type);
}

// The decoded pictures, by URL. Loaded at most once.
const decoded = new Map();

function decode(url) {
  if (!decoded.has(url)) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    decoded.set(url, img.decode ? img.decode().then(() => img, () => null) : Promise.resolve(img));
  }
  return decoded.get(url);
}

/**
 * Starts loading the pictures that more than one item uses, in the background.
 * Returns a cancel function. `pageOf()` is the page as rendered (phone view included).
 */
export function preloadShared(page) {
  let live = true;
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
  const run = async () => {
    // Count the uses of each URL. Probes are shared (see media.js).
    const byUrl = new Map();
    for (const n of namesOf(page)) {
      let file = n.file;
      if (!hasExt(file)) {
        const ext = await findExtension(file, n.type).catch(() => null);
        if (!live) return;
        if (!ext) continue;
        file = `${file}.${ext}`;
      }
      const url = mediaUrl({ type: n.type, file });
      if (!byUrl.has(url)) byUrl.set(url, new Set());
      byUrl.get(url).add(n.id);
    }
    const shared = [...byUrl.entries()].filter(([, ids]) => ids.size > 1).map(([url, ids]) => ({ url, ids: [...ids] }));
    // Nearest to the screen first: an item on screen, then by distance from it.
    const distance = (ids) => {
      let best = Infinity;
      for (const id of ids) {
        const el = document.querySelector(`[data-item="${CSS.escape(id)}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const d = r.bottom < 0 ? -r.bottom : r.top > window.innerHeight ? r.top - window.innerHeight : 0;
        best = Math.min(best, d);
      }
      return best;
    };
    shared.sort((a, b) => distance(a.ids) - distance(b.ids));
    for (const { url } of shared) {
      if (!live) return;
      await new Promise((resolve) => idle(resolve, { timeout: 2000 }));
      if (live) await decode(url);
    }
  };
  // Waits for the page to be drawn first, so the visible items are not held up.
  const start = () => setTimeout(() => live && run(), 300);
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return () => {
    live = false;
  };
}
