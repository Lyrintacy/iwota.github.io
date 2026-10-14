import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateBundle,
  resolvePage,
  safeUrl,
  effectClasses,
} from "../src/lib/config.js";
import { portalLayout } from "../src/lib/layout.js";
const manifest = JSON.parse(
  await readFile(new URL("../public/config/manifest.json", import.meta.url)),
);
const global = JSON.parse(
  await readFile(new URL("../public/config/global.json", import.meta.url)),
);
const pages = Object.fromEntries(
  await Promise.all(
    manifest.pages.map(async (path) => {
      const page = JSON.parse(
        await readFile(new URL(`../public/config/${path}`, import.meta.url)),
      );
      return [page.id, page];
    }),
  ),
);
const bundle = { global, pages };
test("all shipped configuration files validate and reference existing pages", () =>
  assert.deepEqual(validateBundle(bundle), bundle));
test("empty visuals and omitted theme values inherit global defaults", () => {
  const result = resolvePage(global, {
    theme: { accent: "#abcdef" },
    visuals: { roof: "" },
  });
  assert.equal(result.theme.accent, "#abcdef");
  assert.equal(result.theme.primary, global.theme.primary);
  assert.equal(result.visuals.roof, global.visuals.roof);
});
test("unsafe links cannot become executable markup", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "vbscript:hello",
    "//evil.test",
    "java\nscript:test",
    "\\evil.test",
  ])
    assert.equal(safeUrl(url), "");
  for (const url of [
    "https://oskarwota.itch.io",
    "mailto:oskar@iwota.com",
    "images/profile.JPEG",
  ])
    assert.equal(safeUrl(url), url);
});
test("invalid and duplicate identifiers and project references are rejected", () => {
  for (const mutate of [
    (b) => b.global.featured.push("missing"),
    (b) => b.pages.main.sections.push(b.pages.main.sections[0]),
    (b) =>
      b.pages.main.sections[0].blocks.push(b.pages.main.sections[0].blocks[0]),
    (b) => (b.pages.main.hero = undefined),
    (b) => (b.global.theme.accent = "red"),
    (b) => (b.pages.farafrog.id = "../bad"),
  ]) {
    const input = structuredClone(bundle);
    mutate(input);
    assert.throws(() => validateBundle(input));
  }
});
test("effect flags independently override inherited booleans", () => {
  const result = effectClasses(
    { shake: false, wobble: true },
    { shake: true, flash: true, wobble: false },
  );
  assert.ok(!result.includes("fx-shake"));
  assert.ok(result.includes("fx-flash"));
  assert.ok(result.includes("fx-wobble"));
});
test("unexpanded portals are always in index order for two and three columns", () => {
  for (const cols of [2, 3]) {
    const { positions, description } = portalLayout(12, cols);
    assert.equal(description, null);
    positions.forEach((p, i) =>
      assert.deepEqual(p, {
        row: Math.floor(i / cols) + 1,
        col: (i % cols) + 1,
      }),
    );
  }
});
test("snake layouts reserve description cells without losing or overlapping cards", () => {
  for (const cols of [2, 3])
    for (let count = 1; count <= 12; count++)
      for (let active = 0; active < count; active++)
        for (const direction of ["left", "right"]) {
          const { positions, description } = portalLayout(
            count,
            cols,
            active,
            direction,
          );
          const cells = positions.map((p) => `${p.row}:${p.col}`);
          assert.equal(cells.length, count);
          assert.equal(new Set(cells).size, count);
          assert.ok(!cells.includes(`${description.row}:${description.col}`));
          assert.ok(
            !cells.includes(`${description.row}:${description.col + 1}`),
          );
          assert.ok(positions.every((p) => p.col >= 1 && p.col <= cols));
          assert.equal(positions[active].row + 1, description.row);
        }
});
test("local asset references exist, including all config illustrations", async () => {
  const values = [];
  function walk(item, key = "") {
    if (typeof item === "object" && item)
      Object.entries(item).forEach(([k, v]) => walk(v, k));
    else if (
      typeof item === "string" &&
      [
        "src",
        "thumbnail",
        "preview",
        "tocImage",
        "roof",
        "hero",
        "leftBorder",
        "rightBorder",
        "ending",
        "portal",
        "cardFrame",
      ].includes(key) &&
      item &&
      !item.startsWith("http")
    )
      values.push(item);
  }
  walk(bundle);
  for (const path of values)
    await readFile(new URL(`../public/${path}`, import.meta.url));
});
