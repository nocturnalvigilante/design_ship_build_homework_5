import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { USER_B } from "./users";

// Changes made after a grader's feedback (docs/evidence/a4-grader-feedback.md):
// a landing page for signed-out visitors, an optional nickname, and cards side
// by side on a desktop-width screen. Screenshots go to docs/evidence/.

test("signed-out visitors see what the app is before signing in", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DockCheck Live" })).toBeVisible();
  await expect(page.getByText(/Divvy stations you use/)).toBeVisible();
  await page.screenshot({ path: "docs/evidence/landing.png", fullPage: true });

  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 30_000 });
});

test("a blank nickname uses the station's name, and cards sit side by side on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: USER_B });
  await page.goto("/");

  const followed = page.getByRole("region", { name: "Stations you follow" }).getByRole("listitem");
  const add = page.getByRole("region", { name: "Follow a station" });
  const names: string[] = [];
  for (const search of ["Ellis", "57th", "Lake Park"]) {
    await add.getByLabel("Find a Divvy station").fill(search);
    const pick = add.getByRole("button").filter({ hasText: search }).first();
    await expect(pick).toBeVisible({ timeout: 30_000 });
    const name = (await pick.locator("span").first().textContent())!;
    if ((await followed.filter({ hasText: name }).count()) > 0) {
      names.push(name);
      await add.getByLabel("Find a Divvy station").fill("");
      continue;
    }
    await pick.click();
    // Left blank on purpose.
    await add.getByRole("button", { name: "Follow station" }).click();
    await expect(followed.filter({ hasText: name })).toBeVisible({ timeout: 30_000 });
    names.push(name);
  }

  // The card's title is the station name, shown once.
  const first = followed.filter({ hasText: names[0] });
  await expect(first.getByText(names[0], { exact: true })).toHaveCount(1);

  // Three cards on one row: same top edge.
  const tops = await Promise.all(names.map(async (n) => (await followed.filter({ hasText: n }).boundingBox())!.y));
  expect(new Set(tops.map(Math.round)).size, "cards should share a row on desktop").toBe(1);
  await page.screenshot({ path: "docs/evidence/desktop-grid.png", fullPage: true });

  // Tidy up.
  for (const n of names) {
    const card = followed.filter({ hasText: n });
    await card.getByRole("button", { name: "Unfollow", exact: true }).click();
    await expect(card).toHaveCount(0, { timeout: 30_000 });
  }
});
