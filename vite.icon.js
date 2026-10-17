// Website icon (the one in the browser tab). Put one image in public/icon/ named
// icon.png, icon.svg, icon.ico, icon.jpg or icon.webp. The first one found is
// linked from the page at build and dev time. No icon file: the browser's default.
import fs from "node:fs";
import path from "node:path";

const NAMES = ["icon.svg", "icon.png", "icon.ico", "icon.webp", "icon.jpg", "icon.jpeg"];
const TYPES = { svg: "image/svg+xml", png: "image/png", ico: "image/x-icon", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg" };

export default function iconLink() {
  return {
    name: "site-icon",
    transformIndexHtml(html, ctx) {
      const root = ctx?.server?.config?.root || process.cwd();
      const dir = path.join(root, "public", "icon");
      if (!fs.existsSync(dir)) return html;
      const found = NAMES.find((n) => fs.existsSync(path.join(dir, n)));
      if (!found) return html;
      const type = TYPES[found.split(".").pop()];
      return html.replace("</head>", `    <link rel="icon" type="${type}" href="icon/${found}" />\n  </head>`);
    },
  };
}
