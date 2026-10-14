import JSZip from "jszip";
import { validateBundle } from "./config.js";
export function download(name, content, type = "application/json") {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportConfigs(bundle) {
  const data = validateBundle(bundle),
    zip = new JSZip();
  const json = (v) => JSON.stringify(v, null, 2) + "\n";
  zip.file(
    "config/manifest.json",
    json({
      version: 1,
      global: "global.json",
      pages: Object.keys(data.pages).map((id) => `pages/${id}.json`),
    }),
  );
  zip.file("config/global.json", json(data.global));
  for (const [id, page] of Object.entries(data.pages))
    zip.file(`config/pages/${id}.json`, json(page));
  zip.file(
    "README.txt",
    "Replace the config folder in your built website with this folder. For source updates, replace public/config. This ZIP is config only, not a standalone itch.io game. Run npm run package:itch for an uploadable site. Local asset paths must exist in the build; embedded images travel with JSON.",
  );
  download("iwota-config.zip", await zip.generateAsync({ type: "blob" }));
}
