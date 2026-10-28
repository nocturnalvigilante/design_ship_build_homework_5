import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { USER_A } from "./users";

// The designed states from step 6: nothing found, and the API being down.
test("search with no match and Divvy being down both have a designed state", async ({ page }) => {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: USER_A });
  await page.goto("/");

  const add = page.getByRole("region", { name: "Add a station" });

  // Nothing found.
  await add.getByLabel("Find a Divvy station").fill("zzz");
  await expect(add.getByText("No station matches “zzz”. Try just the street name.")).toBeVisible({ timeout: 30_000 });

  // Save one station so there is a card to show the down state on.
  const name = `States ${Date.now().toString(36)}`;
  await add.getByLabel("Find a Divvy station").fill("Ellis");
  await add.getByRole("button").filter({ hasText: "Ellis" }).first().click();
  await add.getByLabel("What do you call it?").fill(name);
  await add.getByRole("button", { name: "Save station" }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 30_000 });

  // API down: the card says so and falls back to the last known counts.
  await page.goto("/?demo=api-down");
  const card = page.getByRole("listitem").filter({ hasText: name });
  await expect(card.getByText("Divvy isn't responding right now.")).toBeVisible();
  await expect(card.getByText(/^Last known at /)).toBeVisible();

  // Tidy up.
  await page.goto("/");
  await card.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(card).toHaveCount(0);
});
