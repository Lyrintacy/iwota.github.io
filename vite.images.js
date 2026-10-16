// Lists every file under public/images (all folders, including the top level),
// so the workshop can offer them. Exposed as the virtual module "virtual:images".
import fs from "node:fs";
import path from "node:path";

function walk(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.name.startsWith(".")) return [];
    return entry.isDirectory() ? walk(path.join(dir, entry.name), rel) : [rel];
  });
}

export default function imagesIndex() {
  const id = "virtual:images";
  const resolved = "\0virtual:images";
  let root = process.cwd();
  const imagesDir = () => path.join(root, "public", "images");
  return {
    name: "images-index",
    configResolved(config) {
      root = config.root;
    },
    resolveId(name) {
      return name === id ? resolved : null;
    },
    load(name) {
      if (name !== resolved) return null;
      return `export default ${JSON.stringify(walk(imagesDir()).sort())};`;
    },
    configureServer(server) {
      // New or removed files reload the workshop's list.
      const changed = (file) => {
        if (!file.startsWith(imagesDir())) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", changed);
      server.watcher.on("unlink", changed);
    },
  };
}
