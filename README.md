# Oskar Wota — The field guide

A modular, illustrated game-development portfolio. React + Vite, with **runtime JSON configuration**, per-project tabs, a browser-based **F2 workshop**, and a static build that works on GitHub Pages and itch.io.

## Start

Use Node.js 22 or newer.

```sh
npm ci
npm run dev           # http://localhost:3000
npm test              # configuration, safety, asset and grid-layout tests
npm run test:e2e      # desktop/mobile browser interaction tests
npm run build         # production site in build/
npm run preview       # serve the production build
npm run package:itch  # build + artifacts/iwota-itch.zip
```

The development server accepts Arena preview hosts. All browser requests use relative paths except configured external links/contact delivery. Fonts, artwork and default media are local; no Google Fonts or Giphy dependency.

## Where to edit

```text
public/config/
  manifest.json          # list of page files to load
  global.json            # identity, socials, palette, fonts, layout, motion, contact
  pages/
    main.json            # Myself hero + any number/order of sections
    farafrog.json        # real project migrated from the original site
    nebula.json          # original demo content, explicitly labeled
    soundscape.json      # original demo content, explicitly labeled
public/art/              # original replaceable vector illustrations
public/images/           # original supplied photographs, GIF and game screenshot
src/components/          # chrome, content, portals, contact and editor
src/lib/                 # configuration validation, grid layout, export, hooks, art
src/data/                # preserved old content for reference; not loaded by the new site
```

Configuration is fetched at startup, **not compiled into the JS**. You can replace the published `config/` directory without rebuilding the app, unless you're also changing component code. A config parse/load error is reported visibly rather than rendering a broken page.

### F2 workshop

Press **F2**, or use the bottom-left workshop button (also available on touchscreens).

- Select **Global settings**, **Main page**, or an individual project.
- **Content:** edit metadata, expand sections, add text/media/tag blocks, duplicate/reorder/remove sections and blocks, or create/delete project tabs. New tabs are automatically added to the first main-page portal grid.
- **Theme:** customize a page palette/visuals, or reset to inherited global values. Global motion has separate shake, flash and wobble flags, which can overlap. Project and block flags override global flags.
- **Advanced JSON:** edit any supported property directly. Changes are schema-validated before preview/export.
- **Apply & preview / Save draft:** save in this browser’s `localStorage`. A LOCAL DRAFT badge means you are not looking at the published files.
- **This file:** export the selected page/global JSON.
- **Export config ZIP:** export the entire `config/` directory, including the manifest and separate page files.
- **Backup JSON:** export one complete bundle for safekeeping/import.
- **Import:** load a page JSON, global JSON, full backup, or exported config ZIP into the editor. Apply it to preview.
- **Reset draft:** discard local changes and restore the config loaded from the server.

**Apply or export before closing the editor.** Unapplied fields are an editing buffer; closing discards that buffer. The editor is intentionally local, not a protected publishing/admin backend. Other visitors cannot modify your deployed files. Never put private API keys or secrets in configuration.

Images can be embedded directly using the file picker (PNG/JPEG/GIF/WebP, up to 6 MB). Large embedded images may exceed browser storage limits; export will still work. For larger media/video, use relative file paths and place the files in `public/images/`. Exports include JSON and embedded media, **not additional files referenced by path**. Keep normal URLs relative, e.g. `images/gameplay.webm`, not `/images/gameplay.webm`, for itch.io/subdirectory portability.

## Publish to itch.io

1. Edit the site and export a config ZIP.
2. Unzip its `config/` directory into **`public/config/`** in the source tree. Copy any new media to `public/images/`.
3. Run `npm run package:itch`.
4. Upload **`artifacts/iwota-itch.zip`** to an itch.io project of type **HTML** and mark it as playable in the browser. `index.html` is at the ZIP root.
5. Enable fullscreen and allow a sufficiently tall, scrollable embed (e.g. 960×720 minimum, responsive/fullscreen recommended).

Alternatively, after one build, replace **`build/config/`** directly with your export and run `node scripts/package-itch.js` (without rebuilding). This packages those exact files. A config ZIP alone is **not** a standalone itch.io website.

The site uses hash routes (`#/farafrog`, `#/main/projects`), so direct links, reloads and browser history need no server rewrites. Draft storage, downloads, clipboard-like file interactions and device orientation can be restricted by embedding/browser settings; editing in the standalone site is the most reliable workflow.

## GitHub Pages

The Pages workflow builds/tests on pushes to `main` and preserves `public/CNAME`. This redesign is on the working branch; nothing has been merged or deployed automatically. Merge the reviewed redesign into `main` to trigger the existing Pages deployment. GitHub Pages must use **GitHub Actions** as its source.

## Important content to finish

- **LinkedIn and CV:** no real URL/document existed in the old configuration. Their empty URLs display muted labels rather than links to invented destinations. Add your URLs in `global.socials`; a CV can use `files/oskar-wota-cv.pdf` with the PDF in `public/files/`.
- **Three featured slots:** `global.featured` chooses up to three tabs. FaraFrog was explicitly a solo project. Nebula/SoundScape were demo entries; they remain marked as demos, with team/timeframe “Not specified”. Replace them with your actual group projects and team sizes.
- **Contact:** the existing public Web3Forms access key/HTTPS endpoint is retained. Verify the recipient and allowed domain in your provider account. Success/failure are browser-tested using mocked responses; no real message was sent from this environment. An explicit email link remains available if delivery fails. A static site cannot send mail without an external service.
- **Motion:** animations/tilt honor reduced motion and the bottom-left pause control. Authored GIFs/video may still contain motion; use static thumbnails/content if you need a fully motion-free publication. Device tilt is opt-in, permission-gated, and depends on HTTPS, hardware, browser support and iframe permissions.

See [CONFIGURATION.md](CONFIGURATION.md) for section/block formats, nine-slicing, theme inheritance and interaction details.
