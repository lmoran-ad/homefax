import { expect, type Page } from "@playwright/test";

export const SHOWCASE = "HF-US-CO-DEN-00001234";
export const UNCLAIMED = "HF-US-CO-DEN-00002187";

export const ACCOUNTS = {
  agent: "agent@homefax.demo",
  homeowner: "owner@homefax.demo",
  contractor: "summit@homefax.demo",
} as const;

export async function signIn(
  page: Page,
  role: keyof typeof ACCOUNTS,
): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', ACCOUNTS[role]);
  await page.fill('input[type="password"]', "demo-password");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function signOut(page: Page): Promise<void> {
  await page.click('button[aria-haspopup="menu"]');
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
}

/** Fails if anything on the page pushes the document wider than the viewport. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `page scrolls horizontally: ${scrollWidth} > ${clientWidth}`,
  ).toBeLessThanOrEqual(clientWidth);
}
