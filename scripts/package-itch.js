import JSZip from "jszip";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("build");
const zip = new JSZip();
async function add(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await add(file);
    else if (!["CNAME", "desktop.ini"].includes(entry.name))
      zip.file(
        path.relative(root, file).split(path.sep).join("/"),
        await readFile(file),
      );
  }
}
await add(root);
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/iwota-itch.zip",
  await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  }),
);
console.log(
  "Ready to upload: artifacts/iwota-itch.zip (index.html is at ZIP root).",
);
