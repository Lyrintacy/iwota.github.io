import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The sandbox cannot download from Playwright's CDN. On Linux x64, use the
// Chromium distribution on npm, including its missing NSS runtime libraries.
// Other platforms can use: npx playwright install chromium
let launchOptions = {};
if (
  process.platform === "linux" &&
  process.arch === "x64" &&
  !process.env.PLAYWRIGHT_BROWSERS_PATH
) {
  const { default: chromium } = await import("@sparticuz/chromium");
  const { inflate } =
    await import("./node_modules/@sparticuz/chromium/build/lambdafs.js");
  await inflate("./node_modules/@sparticuz/chromium/bin/al2023.tar.br");
  process.env.LD_LIBRARY_PATH = [
    join(tmpdir(), "al2023/lib"),
    process.env.LD_LIBRARY_PATH,
  ]
    .filter(Boolean)
    .join(":");
  launchOptions = {
    executablePath: await chromium.executablePath(),
    args: chromium.args
      .filter(
        (arg) =>
          ![
            "--disable-web-security",
            "--allow-running-insecure-content",
            "--single-process",
            "--in-process-gpu",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
          ].includes(arg),
      )
      .concat("--disable-gpu"),
  };
}
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  expect: { timeout: 10000 },
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    launchOptions,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
