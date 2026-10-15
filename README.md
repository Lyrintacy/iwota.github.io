# Oskar Wota — site

A React + Vite site built from a blank canvas. Layout lives in config files and can be edited visually in the **Workshop** (press **F2**).

## Where things live

```text
src/config/site.json          palette (7 colours) and which palette number each role uses
src/config/pages/main.json    the main page: canvas height and its items (text, images, GIFs, videos)
public/images/                put your pictures, GIFs and videos here, then reference them as images/name.ext
```

## Workshop (F2)

- **Page:** set the page height. Add **sections** — background bands with a start height, a height, a background colour, a tiled texture (file, tile size, offset, rotation) and an overlay colour with opacity. Items always sit on top of every section. Add Text / Image / GIF / Video items, select them (in the list or by clicking on the canvas), and set:
  - **Horizontal and vertical constraints** — *Pin to* (Left, Centre, Right, or Left + right stretch), an *Offset* (px or % of the canvas), and a *Size*. Percent values keep the layout proportional when the window resizes.
  - **Pivot & rotation** — the point the item rotates around, and the angle.
  - **Text** — select words and press **Bold**, **Italic**, **Secondary**, or **Highlight**. Press again to turn it off (the button lights up while the selection has it). **Clear colour** removes the colour. Bold and italic combine. Heading level and alignment are per item.
- **General:** the font size of body text and each heading level (applies to every text item), the 7 palette colours, and which palette number is used for the background, normal text, secondary text, and highlight.
- **Export:** copy or download `site.json` and `main.json`, then paste them over the matching files in `src/config/` on GitHub and commit.
- **Reset to saved config…** clears unexported changes after a confirmation.

Changes are kept in this browser (the "Unsaved draft" badge shows until you reset or export and commit).

## Text markup

The workshop writes this for you: `**bold**`, `*italic*`, `***bold italic***`, `{s:secondary text}`, `{h:highlighted}`. Colour spans can contain bold or italic.

## Open it locally (no server, no push)

1. Run `npm install` once, then `npm run build:local`.
2. Double-click **`local/index.html`**. Images are in `local/images/`.

Other commands: `npm run dev` (live development server at http://localhost:3000), `npm run build` (production build in `build/`).

Config is bundled at build time, so a change you commit to `src/config/` shows after the next build or deploy.
