import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { USER_A } from "./users";

// The instructor asked what the value is and why this beats a spreadsheet
// (FINAL-CHECKLIST.md, V1-V3). The verdict and "try instead" logic itself is
// unit-tested in src/lib/advice.test.ts; here we check the page shows it.

test("the landing page leads with the problem, the promise and one action", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Know before you walk to the bike station." })).toBeVisible();
  await expect(page.getByText(/there are no bikes/)).toBeVisible();
  const example = page.getByRole("figure", { name: "Example station card" });
  await expect(example.getByText("Empty: don't walk over")).toBeVisible();
  await expect(example.getByText(/Try instead/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Follow your station" })).toHaveAttribute("href", "/sign-up");
  await page.screenshot({ path: "docs/evidence/landing.png", fullPage: true });
});

test("each followed station says what to do, not just a number", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: USER_A });
  await page.goto("/");

  const followed = page.getByRole("region", { name: "Stations you follow" }).getByRole("listitem");
  const add = page.getByRole("region", { name: "Follow a station" });
  const name = `Value ${Date.now().toString(36)}`;
  await add.getByLabel("Find a Divvy station").fill("Ellis");
  await add.getByRole("button").filter({ hasText: "Ellis" }).first().click();
  await add.getByLabel(/What do you call it/).fill(name);
  await add.getByRole("button", { name: "Follow station" }).click();
  const card = followed.filter({ hasText: name });
  await expect(card).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText(/^Live · checked/)).toBeVisible({ timeout: 30_000 });
  await expect(card.getByRole("status")).toHaveText(/^(Go: there's a bike waiting|Go now: only a few left|Empty: don't walk over|Closed for rentals)/);
  await page.screenshot({ path: "docs/evidence/verdict-card.png" });

  await card.getByRole("button", { name: "Unfollow", exact: true }).click();
  await expect(card).toHaveCount(0, { timeout: 30_000 });
});
