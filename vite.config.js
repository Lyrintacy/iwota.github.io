import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import imagesIndex from "./vite.images.js";
export default defineConfig({
  plugins: [react(), imagesIndex()],
  base: "./",
  server: { host: "0.0.0.0", allowedHosts: [".e2b.app"], port: 3000 },
  preview: { host: "0.0.0.0", allowedHosts: [".e2b.app"], port: 3000 },
  build: { outDir: "build" },
});
