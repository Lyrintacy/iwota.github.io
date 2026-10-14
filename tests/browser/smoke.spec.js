import { test, expect } from "@playwright/test";
test("loads the main field guide", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("OSKAR");
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
