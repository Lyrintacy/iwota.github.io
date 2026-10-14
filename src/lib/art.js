import { useEffect, useMemo, useState } from "react";

// Only shipped, known vector illustrations are recolored. User photographs,
// GIFs, and custom illustrations retain their colors. SVGs remain <img>/CSS
// images (never injected into the DOM as markup).
const defaults = new Set([
  "art/hero.svg",
  "art/roof.svg",
  "art/border.svg",
  "art/ending.svg",
  "art/portal.svg",
  "art/card-frame.svg",
]);
const sourceCache = new Map();
function blend(a, b, amount) {
  const parse = (hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (
    "#" +
    parse(a)
      .map((v, i) =>
        Math.round(v + (parse(b)[i] - v) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function recolorArt(source, theme) {
  const colors = {
    "#d5ed81": theme.accent,
    "#151814": theme.primary,
    "#20251d": theme.secondary,
    "#eeeee3": theme.text,
    "#a5ab9c": theme.muted,
    "#373d30": theme.line,
    "#0a0d09": blend(theme.primary, "#000000", 0.57),
    "#10150f": blend(theme.primary, "#000000", 0.25),
  };
  const greens = [
    "#d3dfba",
    "#e8f3c3",
    "#ccd8b4",
    "#becb9f",
    "#e1e8c7",
    "#e9efcc",
    "#eef0d1",
    "#e5f2b4",
    "#cdd8a2",
    "#b9c89b",
    "#b6c196",
    "#b3c397",
    "#a9ba7b",
    "#afc275",
    "#899b53",
    "#778d4b",
    "#7e8b64",
    "#758560",
    "#76815b",
    "#717b5c",
    "#6b7655",
    "#596346",
    "#4e593f",
    "#35432d",
    "#4e6235",
    "#343c28",
    "#2b3422",
    "#2d381f",
    "#2d4026",
    "#2a3624",
    "#1c281b",
    "#1c2517",
    "#202719",
    "#1c2219",
    "#182016",
    "#172018",
  ];
  greens.forEach((hex) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const lightness = Math.max(...rgb) / 255;
    colors[hex] =
      lightness > 0.78
        ? blend(theme.accent, theme.text, 0.4)
        : blend(
            theme.primary,
            theme.accent,
            Math.max(0.07, (lightness - 0.1) * 0.85),
          );
  });
  return source.replace(
    /#[0-9a-f]{6}\b/gi,
    (hex) => colors[hex.toLowerCase()] || hex,
  );
}
export function usePaletteVisuals(visuals, theme) {
  const [sources, setSources] = useState({});
  const paths = [
    ...new Set(Object.values(visuals).filter((path) => defaults.has(path))),
  ]
    .sort()
    .join("|");
  useEffect(() => {
    let active = true;
    Promise.all(
      paths
        .split("|")
        .filter(Boolean)
        .map(async (path) => {
          if (!sourceCache.has(path))
            sourceCache.set(
              path,
              fetch(`./${path}`)
                .then((res) => {
                  if (!res.ok) throw new Error("Artwork unavailable");
                  return res.text();
                })
                .catch(() => ""),
            );
          return [path, await sourceCache.get(path)];
        }),
    ).then((entries) => {
      if (active) setSources(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [paths]);
  const key = JSON.stringify(theme),
    visualKey = JSON.stringify(visuals);
  return useMemo(
    () =>
      Object.fromEntries(
        Object.entries(JSON.parse(visualKey)).map(([name, path]) => [
          name,
          sources[path]
            ? "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(recolorArt(sources[path], JSON.parse(key)))
            : path,
        ]),
      ),
    [key, visualKey, sources],
  );
}
