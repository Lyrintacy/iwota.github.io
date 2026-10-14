import { z } from "zod";

const text = z.string();
const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers, and hyphens");
export function safeUrl(value = "", generatedArt = false) {
  const url = String(value).trim();
  if (generatedArt && url.startsWith("data:image/svg+xml;charset=utf-8,"))
    return url;
  if (/[\u0000-\u001f\\]/.test(url)) return "";
  if (/^(https?:|mailto:|data:image\/(png|jpeg|gif|webp);base64,)/i.test(url))
    return url;
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith("//")) return "";
  return url;
}
const url = text.refine(
  (v) => !v || safeUrl(v) === v,
  "Use a relative path, https URL, mailto link, or an embedded image",
);
const color = text.regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color");
const theme = z.object({
  primary: color,
  secondary: color,
  tertiary: color,
  accent: color,
  text: color,
  muted: color,
  line: color,
});
const effects = z.object({
  shake: z.boolean(),
  flash: z.boolean(),
  wobble: z.boolean(),
});
const visuals = z.object({
  hero: url,
  roof: url,
  leftBorder: url,
  rightBorder: url,
  ending: url,
  portal: url,
  cardFrame: url,
});
const insets = z.tuple([
  z.number().min(0),
  z.number().min(0),
  z.number().min(0),
  z.number().min(0),
]);
const sceneBorders = z.object({
  enabled: z.boolean(),
  left: url,
  right: url,
  width: z.number().min(0).max(600),
  mobileWidth: z.number().min(0).max(300),
  speed: z.number().min(0).max(3),
  leftDirection: z.enum(["up", "down"]),
  rightDirection: z.enum(["up", "down"]),
});
const scene = z.object({
  background: z.enum(["primary", "secondary", "tertiary"]),
  minHeight: z.number().min(0).max(4000),
  borders: sceneBorders,
});
const block = z
  .object({
    id,
    type: z.enum(["text", "media", "tags"]),
    effects: effects.partial().optional(),
    text: text.optional(),
    mode: z.enum(["paragraph", "big", "pointed"]).optional(),
    items: z.array(text).optional(),
    kind: z.enum(["image", "video"]).optional(),
    src: url.optional(),
    alt: text.optional(),
    caption: text.optional(),
    poster: url.optional(),
    maxWidth: z.number().min(50).max(4000).optional(),
    maxHeight: z.number().min(50).max(4000).optional(),
    align: z.enum(["left", "right", "center", "stretch"]).optional(),
    margin: insets.optional(),
    slice: z
      .object({
        mode: z.enum(["none", "three-horizontal", "three-vertical", "nine"]),
        insets,
        repeat: z.enum(["stretch", "repeat", "round"]),
      })
      .optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.type === "text" && typeof b.text !== "string")
      ctx.addIssue({ code: "custom", message: "Text blocks need text" });
    if (b.type === "media" && !b.src)
      ctx.addIssue({ code: "custom", message: "Media blocks need a source" });
    if (b.type === "tags" && !b.items)
      ctx.addIssue({ code: "custom", message: "Tag blocks need items" });
  });
const section = z
  .object({
    id,
    type: z.enum(["content", "projects", "contact", "ending", "scene"]),
    title: text,
    eyebrow: text.optional(),
    intro: text.optional(),
    tocImage: url.optional(),
    projectIds: z.array(id).optional(),
    scene: scene.optional(),
    blocks: z.array(block),
  })
  .strict();
export const pageSchema = z
  .object({
    id,
    title: text,
    subtitle: text.optional(),
    demo: z.boolean().optional(),
    theme: theme.partial(),
    visuals: visuals.partial(),
    hero: z
      .object({
        eyebrow: text,
        firstName: text,
        lastName: text,
        subtitle: text,
        description: text,
        button: text,
        note: text,
        artLabel: text.optional(),
        artAlt: text.optional(),
        artNote: text.optional(),
        artCaption: text.optional(),
        roofNote: text.optional(),
        artMode: z.enum(["illustration", "photo"]).optional(),
      })
      .optional(),
    project: z
      .object({
        index: z.number().int().positive(),
        team: text,
        timeframe: text,
        engine: text,
        role: text,
        thumbnail: url,
        preview: url,
        description: text,
        url,
        tags: z.array(text),
        effects: effects.partial(),
        headerEffects: effects.partial().optional(),
        cardSlice: insets,
      })
      .optional(),
    sections: z.array(section).min(1),
  })
  .strict();
export const globalSchema = z
  .object({
    version: z.literal(1),
    identity: z.object({
      name: text,
      monogram: text,
      role: text,
      email: z.string().email(),
      availability: text,
      location: text,
    }),
    theme,
    fonts: z.object({ display: text, body: text, mono: text }),
    layout: z.object({
      contentWidth: z.number().min(600).max(1800),
      mediaOffset: z.number().min(0).max(500),
      borderWidth: z.number().min(0).max(250),
      mobileBorderWidth: z.number().min(0).max(80),
      borderSpeed: z.number().min(0).max(2),
      gridBreakpoint: z.number().min(600).max(1600),
      headerCompactHeight: z.number().min(64).max(130),
      sharedBorders: z.boolean(),
    }),
    visuals,
    motion: z.object({
      enabled: z.boolean(),
      duration: z.number().min(200).max(3000),
      tilt: z.number().min(0).max(25),
      deviceTilt: z.boolean(),
      effects,
    }),
    featured: z.array(id).max(3),
    socials: z.array(z.object({ label: text, url })),
    contact: z.object({
      endpoint: text.refine(
        (v) => !v || /^https:\/\//.test(v),
        "Use an HTTPS endpoint",
      ),
      accessKey: text,
      subject: text,
      heading: text,
      text,
    }),
  })
  .strict();
const bundleSchema = z
  .object({ global: globalSchema, pages: z.record(id, pageSchema) })
  .strict();
export function validateBundle(input) {
  const result = bundleSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("\n"),
    );
  const data = result.data;
  if (!data.pages.main?.hero)
    throw new Error("The main page and its hero are required.");
  for (const [key, page] of Object.entries(data.pages)) {
    if (key !== page.id) throw new Error(`Page key ${key} must match its id.`);
    if (key !== "main" && !page.project)
      throw new Error(`${key} needs project metadata.`);
    const ids = new Set(["myself"]);
    for (const section of page.sections) {
      if (ids.has(section.id))
        throw new Error(`${key}: duplicate section id ${section.id}`);
      ids.add(section.id);
      const blocks = new Set();
      for (const block of section.blocks) {
        if (blocks.has(block.id))
          throw new Error(
            `${key}/${section.id}: duplicate block id ${block.id}`,
          );
        blocks.add(block.id);
      }
      for (const ref of section.projectIds || [])
        if (!data.pages[ref]?.project)
          throw new Error(`Unknown project: ${ref}`);
    }
  }
  for (const ref of data.global.featured)
    if (!data.pages[ref]?.project)
      throw new Error(`Unknown featured project: ${ref}`);
  return data;
}
export const DRAFT_KEY = "iwota-field-guide-draft-v1";
export async function loadConfig() {
  async function get(path) {
    const response = await fetch(`./config/${path}`, { cache: "no-cache" });
    if (!response.ok)
      throw new Error(`Could not load config/${path} (${response.status})`);
    return response.json();
  }
  const manifest = await get("manifest.json");
  if (manifest.version !== 1 || !Array.isArray(manifest.pages))
    throw new Error("Unsupported config manifest");
  const [global, ...pages] = await Promise.all([
    get(manifest.global),
    ...manifest.pages.map(get),
  ]);
  const published = validateBundle({
    global,
    pages: Object.fromEntries(pages.map((p) => [p.id, p])),
  });
  let draft = null,
    notice = "";
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) draft = validateBundle(JSON.parse(stored));
  } catch {
    notice =
      "An invalid or inaccessible local draft was ignored. Published files are unchanged.";
  }
  return { published, current: draft || published, notice, hasDraft: !!draft };
}
export function resolvePage(global, page, mainPage) {
  const nonempty = (value) =>
    Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v));
  return {
    theme: {
      ...global.theme,
      ...nonempty(mainPage?.theme),
      ...nonempty(page.theme),
    },
    visuals: {
      ...global.visuals,
      ...nonempty(mainPage?.visuals),
      ...nonempty(page.visuals),
    },
  };
}
export function effectClasses(local = {}, global = {}) {
  const merged = { ...global, ...local };
  return `fx ${merged.shake ? "fx-shake" : ""} ${merged.flash ? "fx-flash" : ""} ${merged.wobble ? "fx-wobble" : ""}`;
}
