import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { USER_A, USER_B } from "./users";

// Two users sign in, each follows a station, and neither can see the other's.
// If row-level security on follows is broken, user B sees user A's
// station (and vice versa) and this test fails.

const run = Date.now().toString(36);
const A = { email: USER_A, prefix: "A-only", search: "Ellis" };
const B = { email: USER_B, prefix: "B-only", search: "Millennium" };
const nickname = (user: typeof A) => `${user.prefix} ${run}`;

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DockCheck Live" })).toBeVisible();
}

// Unfollow everything this test user follows, left over from earlier runs (the
// screenshot spec follows stations too). These accounts exist only for tests,
// and a leftover follow of the same station would make following it fail.
async function removeLeftovers(page: Page) {
  const cards = page.getByRole("region", { name: "Stations you follow" }).getByRole("listitem");
  for (let n = await cards.count(); n > 0; n--) {
    await cards.first().getByRole("button", { name: "Unfollow", exact: true }).click();
    await expect(cards).toHaveCount(n - 1);
  }
}

function cardsOf(page: Page) {
  return page.getByRole("region", { name: "Stations you follow" });
}

async function followStation(page: Page, search: string, name: string) {
  const add = page.getByRole("region", { name: "Follow a station" });
  await add.getByLabel("Find a Divvy station").fill(search);
  await add.getByRole("button").filter({ hasText: search }).first().click();
  await add.getByLabel("What do you call it?").fill(name);
  await add.getByRole("button", { name: "Follow station" }).click();
  // Following checks the station against Divvy and writes to Supabase; give it time.
  // The nickname also labels the station's pin on the map, so look at the cards.
  await expect(cardsOf(page).getByText(name, { exact: true })).toBeVisible({ timeout: 30_000 });
}

test("two users can't see each other's followed stations", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();

  await signIn(a, A.email);
  await removeLeftovers(a);
  await followStation(a, A.search, nickname(A));

  await signIn(b, B.email);
  await removeLeftovers(b);
  await followStation(b, B.search, nickname(B));

  await a.reload();
  await b.reload();

  // Each sees their own station…
  await expect(cardsOf(a).getByText(nickname(A), { exact: true })).toBeVisible();
  await expect(cardsOf(b).getByText(nickname(B), { exact: true })).toBeVisible();
  // …and not the other person's, anywhere on the page (cards or map).
  await expect(b.getByText(nickname(A), { exact: true }), "user B can see user A's station").toHaveCount(0);
  await expect(a.getByText(nickname(B), { exact: true }), "user A can see user B's station").toHaveCount(0);

  // Tidy up so the next run starts clean.
  await removeLeftovers(a);
  await removeLeftovers(b);
});
