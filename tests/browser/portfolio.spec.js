import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";

test("roof docks, portals expand, route transitions and browser history work", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Explore my work" }).click();
  await expect(page.locator(".site-header")).toHaveClass(/compact/);
  await expect(page.locator(".docked-socials")).toBeVisible();
  await page
    .getByRole("button", { name: "Enter FaraFrog", exact: true })
    .hover();
  await expect(page.locator(".portal-description")).toContainText(
    "A tiny frog",
  );
  await expect(page.locator(".floating-card")).toBeVisible();
  await page
    .getByRole("button", { name: "Enter FaraFrog", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/farafrog$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "FaraFrog",
  );
  await expect(page.locator(".portal-transition")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "FaraFrog",
  );
  await page
    .getByRole("button", { name: "Back to the field guide", exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(/#\/main$/);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "FaraFrog",
  );
  expect(errors).toEqual([]);
});

test("F2 edits, saves, persists, validates and exports runtime configuration", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("F2");
  const dialog = page.getByRole("dialog", { name: "The workshop" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Advanced JSON" }).click();
  const editor = dialog.getByRole("textbox", { name: "Configuration JSON" });
  const data = JSON.parse(await editor.inputValue());
  data.hero.firstName = "HELLO";
  await editor.fill(JSON.stringify(data));
  await dialog.getByRole("button", { name: "Apply & preview" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("HELLO");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("HELLO");
  await page.keyboard.press("F2");
  await dialog.getByRole("button", { name: "Advanced JSON" }).click();
  await editor.fill("{broken");
  await dialog.getByRole("button", { name: "Save draft" }).click();
  await expect(dialog.locator(".editor-error")).toBeVisible();
  await editor.fill(JSON.stringify(data));
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Export config ZIP" }).click();
  const file = await download;
  const zip = await JSZip.loadAsync(await readFile(await file.path()));
  expect(
    JSON.parse(await zip.file("config/pages/main.json").async("string")).hero
      .firstName,
  ).toBe("HELLO");
  expect(zip.file("config/manifest.json")).toBeTruthy();
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Reset draft" }).click();
  await dialog.getByRole("button", { name: "Close editor" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("OSKAR");
});

test("visual editor adds project tabs and sections without writing code", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("F2");
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "+ Project tab", exact: true })
    .click();
  await expect(dialog.locator(".editor-scope select")).not.toHaveValue("main");
  await dialog.getByRole("button", { name: "+ Content", exact: true }).click();
  await expect(dialog.locator(".editor-section")).toHaveCount(3);
  await dialog.getByRole("button", { name: "Apply & preview" }).click();
  await expect(
    page.getByRole("button", { name: "Enter New expedition", exact: true }),
  ).toHaveCount(1);
});

test("contact form only claims delivery on success and retains text on failure", async ({
  page,
}) => {
  await page.goto("/");
  const form = page.locator(".contact-grid form");
  await form.getByLabel("Your name").fill("Test explorer");
  await form.getByLabel("Email address").fill("explorer@example.com");
  await form
    .getByLabel("What are you thinking?")
    .fill("A test, not a live message.");
  await page.route("https://api.web3forms.com/submit", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: '{"success":false}',
    }),
  );
  await form.getByRole("button", { name: "Send a little hello" }).click();
  await expect(form.getByRole("status")).toContainText("not sent");
  await expect(form.getByLabel("What are you thinking?")).toHaveValue(
    "A test, not a live message.",
  );
  await page.unroute("https://api.web3forms.com/submit");
  await page.route("https://api.web3forms.com/submit", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"success":true}',
    }),
  );
  await form.getByRole("button", { name: "Send a little hello" }).click();
  await expect(form.getByRole("status")).toContainText("Message delivered");
});

test("reduced motion disables animated project previews and tilt", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore my work" }).click();
  await page
    .getByRole("button", { name: "Enter FaraFrog", exact: true })
    .hover();
  await expect(page.locator(".portfolio")).toHaveClass(/reduce-motion/);
  await expect(page.locator(".portal-preview")).toHaveCount(0);
  expect(
    await page
      .locator(".hero-art>img")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("mobile keeps two columns, hides contents, and supports card inspection", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Contents", exact: true }).click();
  await expect(page.locator("#contents")).toHaveClass(/open/);
  await page
    .locator("#contents")
    .getByRole("button", { name: "Pick your next portal." })
    .click();
  await expect(page.locator("#contents")).not.toHaveClass(/open/);
  expect(
    await page
      .locator(".portal-grid")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(2);
  await page
    .getByRole("button", { name: "Expand FaraFrog details", exact: true })
    .click();
  await expect(page.locator(".portal-description")).toBeVisible();
  await page.getByRole("button", { name: "Inspect card" }).click();
  await expect(
    page.getByRole("dialog", { name: "FaraFrog project card" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close ×" }).click();
  await page.screenshot({ path: "artifacts/mobile-projects.png" });
  await context.close();
});
