// Builds a single, self-contained page that opens straight from the file
// system (double-click local/index.html). No server needed.
import { defineConfig, mergeConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import base from "./vite.config.js";
export default mergeConfig(base, {
  plugins: [viteSingleFile()],
  build: { outDir: "local", emptyOutDir: true, assetsInlineLimit: 100000000 },
});
