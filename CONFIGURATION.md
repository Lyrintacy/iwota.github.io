# Configuration reference

Source of truth for validation: `src/lib/config.js`. All JSON is validated at startup, import, preview and export. Unknown fields, unsupported types, unsafe URL schemes, duplicate section/block IDs and missing project references are reported. Config version is currently **1**.

## Global settings

`public/config/global.json`:

| Group      | Purpose                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| `identity` | Name, role, email, availability line, and identity metadata                                                         |
| `socials`  | Ordered `{ "label": "itch.io", "url": "https://…" }` links. Empty URLs are visibly unconfigured.                    |
| `featured` | Ordered array of up to three project IDs in the fixed top-right header                                              |
| `theme`    | Six `#RRGGBB` tokens: `primary`, `secondary`, `accent`, `text`, `muted`, `line`                                     |
| `fonts`    | `display`, `body`, `mono` family names; bundled fonts are Barlow Condensed, Space Grotesk and Space Mono            |
| `layout`   | Content width, media offset, desktop/mobile border width, border speed, portal breakpoint and compact header height |
| `visuals`  | Paths for hero, roof, left/right borders, ending, entry portal and nine-slice card frame                            |
| `motion`   | Master enable, portal duration (ms), tilt angle (degrees), optional device tilt, and default effect booleans        |
| `contact`  | HTTPS Web3Forms-compatible endpoint, **public** access key, subject and copy                                        |

The default vector illustrations recolor to the active palette. Custom uploaded illustrations, photos and GIFs keep their original pixels; make variants if you want a different palette for those. To change the self-hosted fonts to another family, add the font file/stylesheet and then change the family name in config.

`layout.mediaOffset` is the distance (pixels) from the content center to a left/right-aligned media item's nearest edge. It is clamped only when the available width cannot fit that offset. `contentWidth` is the desktop max width; mobile uses fluid gutters. `gridBreakpoint` is the viewport width at which portal grids switch from two to three columns.

## Pages and inheritance

`manifest.json` lists `global.json` and the separate page paths. Each page has a stable `id`, `title`, `theme`, `visuals`, and `sections`. `main` also has `hero`; every other page has `project` metadata.

```json
{
  "id": "my-project",
  "title": "My project",
  "subtitle": "A new adventure",
  "theme": { "accent": "#C3ADF2" },
  "visuals": { "roof": "", "leftBorder": "images/my-border.png" },
  "project": {
    "index": 4,
    "team": "4 people",
    "timeframe": "8 weeks",
    "engine": "Unity",
    "role": "Game designer",
    "thumbnail": "images/project.jpg",
    "preview": "images/project.gif",
    "description": "The story behind the project.",
    "url": "https://example.itch.io/my-project",
    "tags": ["Co-op", "Procedural"],
    "effects": { "shake": true, "flash": true, "wobble": false },
    "cardSlice": [24, 24, 24, 24]
  },
  "sections": [
    {
      "id": "overview",
      "type": "content",
      "title": "Overview",
      "eyebrow": "01 / THE IDEA",
      "intro": "Something worth\ngetting lost in.",
      "tocImage": "images/project.gif",
      "blocks": [
        {
          "id": "intro-copy",
          "type": "text",
          "mode": "paragraph",
          "text": "Start with a **good question**."
        }
      ]
    },
    {
      "id": "return",
      "type": "ending",
      "title": "Until next time.",
      "eyebrow": "END OF EXPEDITION",
      "blocks": []
    }
  ]
}
```

Save as `config/pages/my-project.json`, add its path to the manifest, and add `my-project` to a main-page portal section's `projectIds`. The editor does this for you. Page object keys in backup JSON must match their IDs. IDs use lowercase letters/numbers/hyphens.

Main-page overrides merge with the global theme. Project tabs inherit that resolved main palette, then apply their own overrides. Missing keys inherit. Missing **or empty** visual paths inherit. Set `theme: {}` and `visuals: {}` for complete inheritance. The main page can also have overrides.

Portal `index` determines initial reading order, regardless of file order. Keep indices distinct for predictable ordering. There are always three columns on a sufficiently wide viewport, otherwise two (including phones).

## Sections

The array order is the page order and contents-rail order. The main hero is the fixed “Myself” / index 0 section. Add sections before or after the projects section without changing code. Each section has a unique ID and can specify a GIF/static `tocImage`.

- **`content`**: `title`, optional `intro` heading, `eyebrow`, and ordered `blocks`. Text is arranged in the editorial layout; media gets the full content coordinate space for left/center/right constraints.
- **`projects`**: `title`, `intro`, `eyebrow`, `projectIds`, `blocks: []`. Renders interactive portals.
- **`contact`**: `title`, `eyebrow`, `blocks: []`. Renders the global contact form over the high-priority ending artwork.
- **`ending`**: `title`, `eyebrow`, `blocks: []`. Fades to black and shows the return-to-main action above the ending illustration.

Project/contact/ending sections use their dedicated renderer, not arbitrary content blocks. Put additional text/media in an adjacent content section.

## Text and tags

```json
{ "id": "heading", "type": "text", "mode": "big", "text": "A simple rule." }
```

```json
{
  "id": "points",
  "type": "text",
  "mode": "pointed",
  "text": "**Prototype** — build something playable.\n**Iterate** — follow the surprises.",
  "effects": { "shake": false, "flash": true, "wobble": false }
}
```

`paragraph` preserves newlines. `big` renders a heading. `pointed` creates a separate star bullet and divider for every nonempty line. All support **`**bold**`** and `[accent links](https://example.com)`. Raw HTML is not supported. Tags use `{ "id": "tools", "type": "tags", "items": ["Unity", "Game design"] }`.

## Images, GIFs, videos and slicing

```json
{
  "id": "level-preview",
  "type": "media",
  "kind": "image",
  "src": "images/level.gif",
  "alt": "An accessible description of the level",
  "caption": "Optional caption",
  "maxWidth": 760,
  "maxHeight": 480,
  "align": "center",
  "margin": [24, 0, 24, 0],
  "slice": { "mode": "none", "insets": [24, 24, 24, 24], "repeat": "stretch" },
  "effects": { "shake": false, "flash": false, "wobble": false }
}
```

- `kind: "video"` gives native, accessible video controls, plays inline, and accepts an optional `poster`. No surprise sound/autoplay. Use MP4/WebM URLs or relative files, not embedded HTML/YouTube markup.
- `align`: `left`, `right`, `center`, `stretch`. Left and right edges sit a global `mediaOffset` from the center. Transform pivots are center-right for left media, center-left for right media, and center for centered media.
- `maxWidth`/`maxHeight`: normal media never grows past these limits and scales down responsively without losing its native aspect ratio. `stretch` explicitly spans the available content width. Sliced images use the specified width/height ratio.
- `margin`: top/right/bottom/left in pixels. Top/bottom provide outside spacing; horizontal insets reserve space inside the constrained media slot so it doesn't overflow.
- `slice.mode`: `none`, `nine`, `three-horizontal`, `three-vertical`. Source pixel insets are top/right/bottom/left. Nine-slicing uses CSS border-image with center fill; corners remain fixed, edge/center regions stretch or repeat. Horizontal three-slicing preserves left/right caps; vertical preserves top/bottom caps. `repeat` can be `stretch`, `repeat`, or `round`.
- Slicing applies to **images/GIF frames**, not videos. For video, use a separately authored frame image around the player if required.
- Very large slice insets can leave no room for a center on small devices; keep them appropriate to the frame (normally 12–32 px).

The collectible card is independently nine-sliced using `visuals.cardFrame` and `project.cardSlice`. Its content adapts to desktop, tablet and phone widths.

## Interaction behavior

- The header remains fixed at the top. The main roof begins beneath Myself; crossing it docks the social links left and three project slots right. Team size remains visible while timeframe/engine expand on hover or keyboard focus.
- Left border moves down while scrolling down; right moves up because its illustration is rotated 180°. Scrolling up reverses both. Repeated background tiles make the movement continuous. Author seamless edges in custom border artwork.
- Desktop contents is a narrow, labeled-on-hover GIF rail on the left. On mobile it becomes a hidden right rail, opened with the Contents button below the top-left header region.
- Fine-pointer hovering reveals a GIF (when configured), effects, expanded notes and a mouse-tilted collectible card. Keyboard focus and the plus/minus control expand notes without requiring a mouse.
- Expanded notes reserve two grid cells in the following row. Subsequent cards fill the unoccupied cells in a snake pattern, animated with FLIP. Edge cards choose the corresponding direction; a middle card chooses once per activation. Closing restores indexed order. Escape collapses details. On two-column layouts, notes occupy a full row.
- Click the thumbnail or “Enter this world” for the expanding, rotating portal transition. Header transitions begin smaller at their button. Hash routes preserve navigation/reload behavior.
- “Inspect card” opens an accessible dialog on all devices. Device tilt is optional and must be explicitly enabled by the visitor. No orientation permission is requested on page load.
- Global `motion.effects` and per-project/per-block `effects` independently control `shake`, `flash`, `wobble`. Optional `project.headerEffects` independently controls the compact header buttons. The CSS uses separate translate/filter/rotate channels so effects combine. Native system reduced-motion and the pause button suppress them.

## Extending the code

Add a block/section type in `src/lib/config.js`, then its renderer in `src/components/Content.jsx` / `src/App.jsx`, and its editor template in `src/components/Editor.jsx`. Keep rendering free of raw HTML. Keep referenced asset paths relative for portable embeds. Add layout/schema tests in `tests/config.test.js` and browser behavior tests in `tests/browser/`.

`npm run test:e2e` uses npm-packaged Chromium on Linux x64 because this development sandbox cannot reach Playwright's download CDN. On other systems, run `npx playwright install chromium` first. Contact tests mock network responses; they never send real mail. Test screenshots, traces and packaged builds are ignored by Git.
