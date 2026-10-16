import { useEffect, useState } from "react";
import { mediaUrl } from "./model.js";

// Extensions tried, in order, when a path is typed without one.
export const CANDIDATES = {
  // Upper-case variants too: hosting is case-sensitive and many files are .JPEG/.PNG.
  image: ["png", "PNG", "jpeg", "JPEG", "jpg", "JPG"],
  gif: ["gif", "GIF"],
  video: ["mp4", "MP4", "webm", "WEBM"],
};
export const hasExt = (file = "") => /\.[a-z0-9]+$/i.test(file.split("/").pop());
const isUrl = (file) => /^https?:\/\//i.test(file);

// Works from the dev server, GitHub Pages and file:// (no fetch needed).
function loads(url, type) {
  return new Promise((resolve) => {
    const el = type === "video" ? document.createElement("video") : new Image();
    if (type === "video") {
      el.preload = "metadata";
      el.onloadedmetadata = () => resolve(true);
    } else el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    el.src = url;
  });
}

export async function findExtension(file, type) {
  for (const ext of CANDIDATES[type] || []) {
    if (await loads(mediaUrl({ type, file: `${file}.${ext}` }), type)) return ext;
  }
  return null;
}

/**
 * Resolves a typed path. With no extension it probes the candidates and uses
 * the first file found; until then (or if none exists) it uses the default.
 */
export function useMedia(type, rawFile = "") {
  const file = rawFile.trim();
  const needsProbe = !!file && !hasExt(file) && !isUrl(file) && !!CANDIDATES[type];
  const key = `${type}:${file}`;
  const [found, setFound] = useState({ key: "", ext: null });
  useEffect(() => {
    if (!needsProbe) return;
    let live = true;
    const timer = setTimeout(() => {
      findExtension(file, type).then((ext) => {
        if (live) setFound({ key, ext });
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, needsProbe]);
  const ext = needsProbe && found.key === key ? found.ext : null;
  return { url: mediaUrl({ type, file: ext ? `${file}.${ext}` : file }), ext };
}
