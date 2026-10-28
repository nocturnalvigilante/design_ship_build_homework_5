import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { USER_A } from "./users";

// Evidence for the live states, saved to docs/evidence/. Skipped unless SHOT is set,
// because each state needs the worker in a particular condition first:
//   SHOT=fresh  worker running normally
//   SHOT=stale  worker stopped for over 2 minutes
//   SHOT=down   worker running with FEED_URL pointing at a broken URL
//   SHOT=tick   worker running; records a video until a followed count changes.
//               TICK_STATIONS="Name A|Name B" also follows stations busy right now.
// e.g. SHOT=stale npx playwright test e2e/screenshots.spec.ts
const SHOT = process.env.SHOT;

// Stations that change often, so a tick shows up within a few minutes.
const BUSY = [
  { search: "57th", name: "University Ave & 57th St" },
  { search: "Lake Park", name: "Lake Park Ave & 53rd St" },
  { search: "Clark St & Lake", name: "Clark St & Lake St" },
];

const EXPECT: Record<string, RegExp> = {
  fresh: /^Live · checked/,
  stale: /^Updates have paused$/,
  down: /^Can't reach Divvy right now$/,
  tick: /^Live · checked/,
};

test.use({ video: SHOT === "tick" ? "on" : "off", viewport: { width: 480, height: 900 } });

async function followIfMissing(page: Page, search: string, name: string) {
  // Only the followed cards, not the search results underneath.
  const card = page.getByRole("region", { name: "Stations you follow" }).getByRole("listitem").filter({ hasText: name });
  if ((await card.count()) > 0) return;
  const add = page.getByRole("region", { name: "Follow a station" });
  await add.getByLabel("Find a Divvy station").fill(search);
  await add.getByRole("button").filter({ hasText: name }).first().click();
  await add.getByLabel("What do you call it?").fill(name.split(" & ")[1]);
  await add.getByRole("button", { name: "Follow station" }).click();
  await expect(card).toBeVisible({ timeout: 30_000 });
  // Its counts appear straight away, not "No live counts" until Realtime reconnects.
  await expect(card.getByText(/bikes? left|Not renting bikes/)).toBeVisible({ timeout: 15_000 });
}

test("live state evidence", async ({ page }) => {
  test.skip(!SHOT || !EXPECT[SHOT], "set SHOT=fresh|stale|down|tick");
  test.setTimeout(15 * 60_000);

  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: USER_A });
  await page.goto("/");
  for (const s of BUSY) await followIfMissing(page, s.search, s.name);
  if (SHOT === "tick") {
    for (const name of (process.env.TICK_STATIONS ?? "").split("|").filter(Boolean)) {
      await followIfMissing(page, name, name);
    }
  }

  // Stale can take over 2 minutes to appear: the open page notices on its own.
  await expect(page.getByText(EXPECT[SHOT!])).toBeVisible({ timeout: 5 * 60_000 });

  if (SHOT === "tick") {
    // A count Realtime changed gets the "tick" class; wait for one, then let the highlight play.
    await expect(page.locator(".tick").first()).toBeVisible({ timeout: 12 * 60_000 });
    await page.screenshot({ path: "docs/evidence/state-tick.png", fullPage: true });
    await page.waitForTimeout(2500);
    const video = page.video();
    await page.close();
    await video?.saveAs("docs/evidence/live-tick.webm");
    return;
  }
  await page.screenshot({ path: `docs/evidence/state-${SHOT}.png` });
});
