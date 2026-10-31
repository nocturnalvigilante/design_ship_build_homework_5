import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { USER_B } from "./users";

// The second round of grader feedback (docs/evidence/a4-grader-feedback.md):
// a map of stations, a subtitle that says what the app is, and a line on when
// to open it. Screenshots go to docs/evidence/.

test("the landing page says when to open the app", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Open it just before you head out/)).toBeVisible();
});

async function waitForTiles(page: Page) {
  const map = page.getByRole("region", { name: "Map of Divvy stations" });
  await expect(map.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 30_000 });
  return map;
}

test("the map shows followed stations live and a dot click starts a follow", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: USER_B });
  await page.goto("/");

  await expect(page.getByText("Live Divvy bikes & docks")).toBeVisible();
  const followed = page.getByRole("region", { name: "Stations you follow" }).getByRole("listitem");
  const add = page.getByRole("region", { name: "Follow a station" });
  let map = await waitForTiles(page);

  // Follow one station through search, called "Lab".
  await add.getByLabel("Find a Divvy station").fill("Ellis");
  const pick = add.getByRole("button").filter({ hasText: "Ellis" }).first();
  await expect(pick).toBeVisible({ timeout: 30_000 });
  const labName = (await pick.locator("span").first().textContent())!;
  if ((await followed.filter({ hasText: labName }).count()) === 0) {
    await pick.click();
    await add.getByLabel("What do you call it?").fill("Lab");
    await add.getByRole("button", { name: "Follow station" }).click();
    await expect(followed.filter({ hasText: labName })).toBeVisible({ timeout: 30_000 });
  } else {
    await add.getByLabel("Find a Divvy station").fill("");
  }

  // Its pin on the map shows the live count (a number, or "closed").
  map = await waitForTiles(page);
  const labPin = map.locator(".dc-pin").filter({ hasText: "Lab" });
  await expect(labPin).toBeVisible({ timeout: 30_000 });
  await expect(labPin.locator(".dc-pin-count")).toHaveText(/^(\d+|closed)$/);

  // Click a dot well inside the map: the follow form opens for that station.
  const box = (await map.locator(".leaflet-container").boundingBox())!;
  const dots = map.locator("path.leaflet-interactive");
  await expect(dots.first()).toBeAttached();
  let clicked = false;
  for (let i = 0; i < (await dots.count()) && !clicked; i++) {
    const b = await dots.nth(i).boundingBox();
    if (!b) continue;
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    if (x < box.x + 60 || x > box.x + box.width - 60 || y < box.y + 60 || y > box.y + box.height - 60) continue;
    await page.mouse.click(x, y);
    clicked = true;
  }
  expect(clicked, "a station dot inside the map").toBe(true);
  await expect(add.getByText("Following", { exact: true })).toBeVisible();
  const dotName = (await add.locator("p.font-medium").first().textContent())!;
  expect(dotName.length).toBeGreaterThan(0);
  await add.getByLabel("What do you call it?").fill("Map pick");
  await add.getByRole("button", { name: "Follow station" }).click();
  await expect(followed.filter({ hasText: dotName })).toBeVisible({ timeout: 30_000 });
  await expect(map.locator(".dc-pin").filter({ hasText: "Map pick" })).toBeVisible({ timeout: 30_000 });

  // Each card links to walking directions.
  const directions = followed.filter({ hasText: labName }).getByRole("link", { name: "Directions in Google Maps" });
  await expect(directions).toHaveAttribute("href", /google\.com\/maps\/dir\/.*destination=41\.\d+,-87\.\d+/);
  await expect(directions).toHaveAttribute("target", "_blank");

  await page.reload();
  await waitForTiles(page);
  await page.waitForTimeout(1500); // let the remaining tiles finish drawing
  await page.screenshot({ path: "docs/evidence/map-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 480, height: 900 });
  await page.reload();
  await waitForTiles(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/evidence/map-mobile.png", fullPage: true });

  // Tidy up.
  for (const n of [labName, dotName]) {
    const card = followed.filter({ hasText: n });
    await card.getByRole("button", { name: "Unfollow", exact: true }).click();
    await expect(card).toHaveCount(0, { timeout: 30_000 });
  }

  // With nothing followed, the empty state points at both the map and search.
  await expect(page.getByText(/click a blue dot on the map, or type a street/)).toBeVisible();
  await waitForTiles(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/evidence/map-empty.png", fullPage: true });
});
