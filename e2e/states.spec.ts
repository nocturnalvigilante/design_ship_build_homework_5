import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { USER_A } from "./users";

// Designed states a signed-in user can reach without touching the worker:
// nothing found in search, and the live line going from connecting to live.
// Stale and down depend on the worker; see e2e/freshness.spec.ts and
// e2e/screenshots.spec.ts. The worker must be running for "Live" to appear.
test("nothing found, then the live line reaches \"Live · checked\"", async ({ page }) => {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: USER_A });
  await page.goto("/");

  const add = page.getByRole("region", { name: "Follow a station" });

  // Nothing found.
  await add.getByLabel("Find a Divvy station").fill("zzz");
  await expect(add.getByText("No station matches “zzz”. Try just the street name.")).toBeVisible({ timeout: 30_000 });

  // Follow one station so the live part of the page appears.
  const name = `States ${Date.now().toString(36)}`;
  await add.getByLabel("Find a Divvy station").fill("Ellis");
  await add.getByRole("button").filter({ hasText: "Ellis" }).first().click();
  await add.getByLabel("What do you call it?").fill(name);
  await add.getByRole("button", { name: "Follow station" }).click();
  const card = page.getByRole("listitem").filter({ hasText: name });
  await expect(card).toBeVisible({ timeout: 30_000 });

  // Realtime connects with the user's Clerk token, and the newest run is recent.
  await expect(page.getByText(/^Live · checked \d+ (s|min) ago$/)).toBeVisible({ timeout: 30_000 });
  await expect(card.getByText(/bikes? left|Not renting bikes/)).toBeVisible();

  // Tidy up.
  await card.getByRole("button", { name: "Unfollow", exact: true }).click();
  await expect(card).toHaveCount(0);
});
