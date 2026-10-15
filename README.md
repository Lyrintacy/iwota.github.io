# Oskar Wota — site

A React + Vite site built from a blank canvas. Layout lives in config files and can be edited visually in the **Workshop** (press **F2**).

## Where things live

```text
src/config/site.json          palette (7 colours) and which palette number each role uses
src/config/pages/main.json    the main page: canvas height and its items (text, images, GIFs, videos)
public/images/                put your pictures, GIFs and videos here. Type them as folder/name (for example 0/profile); the extension is optional
```

## Workshop (F2)

- **Page:** set the page height (it grows to fit the sections). The **+ bar** stays pinned at the top of the panel. Clicking a selected section or item again closes it; every panel also has a Close button.
  - **Sections** are background bands, stacked in list order. Each has *Align to* (top or bottom of the page), a distance from that edge in px, a height in px, a background colour (palette number), a tiled texture (file, tile size px, offset X/Y px, rotation deg), and an overlay colour with opacity %. Sections clip their own contents.
  - **Screen overlay** (+ Screen overlay) is always the size of the screen and stays fixed while you scroll. Put items in it with *Parent*.
  - **Parent:** an item can belong to the page or to a specific section. Its position is then measured from that section's box and clipped to it.
  - Add Text / Image / GIF / Video items, select them (in the list or by clicking on the canvas), and set:
  - **Horizontal and vertical constraints** — *Pin to* (Left, Centre, Right, or Left + right stretch), an *Offset* (px or % of the canvas), and a *Size*. Percent values keep the layout proportional when the window resizes.
  - **Pivot & rotation** — the point the item rotates around, and the angle.
  - **Text** — select words and press **Bold**, **Italic**, **Secondary**, or **Highlight**. Press again to turn it off (the button lights up while the selection has it). **Clear colour** removes the colour. Bold and italic combine. Heading level and alignment are per item.
- **General:** the font size of body text and each heading level (applies to every text item). **Palette** is a list: edit any hex value, **+ Add colour**, or **×** to remove one. Removing a colour sends anything that used it (roles, sections, phone overrides) to colour 1 and renumbers the rest. **Roles** choose which palette number is the background, normal text, secondary text, and highlight.
- **Phone:** the **Desktop / Phone** switch at the top of the panel. In Phone mode, edits are saved as overrides that apply only on phones (screen width at or below the breakpoint, default 700px). Adding, moving and deleting are locked in Phone mode. The **Phone** tab lists the overrides as JSON, which you can edit by hand (Apply / Discard), and can clear them all.
- **Panning (optional, per axis):** a section texture's *Offset X* and *Offset Y* each have a **Pan when scrolling** box. When it is on, the texture moves with the scroll movement itself: every scroll step adds to the pan, so scrolling down moves it one way and scrolling back up moves it back. *Pan speed* is px moved per px scrolled, and a negative speed moves it the other way. The pan starts at 0 each time the page loads.
- **Animated image:** a square box filled with the image, tiled the same way as a section texture. Set the **tile size** (px), **offset X/Y**, **texture rotation** (degrees), **Repeat along X / Y** (off = a single tile on that axis), and the same **Pan when scrolling** controls. Align it like any other item.
- **Images, GIFs and videos:** the file box accepts `folder/name`. With no extension, the workshop looks for the first existing file in this order: `.png`, `.jpeg`, `.jpg` (videos: `.mp4`, `.webm`). When it finds one, it writes the extension into the config. Put an extension in yourself to skip the search.
- **Number fields** can be cleared while you type. The **−** button next to a number adds or removes its leading minus sign.
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
