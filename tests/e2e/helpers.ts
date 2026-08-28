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
  await page.getByTestId("login-email").fill(ACCOUNTS[role]);
  await page.getByTestId("login-password").fill("demo-password");
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  // The URL changes before the landing page has rendered. Waiting for the app
  // shell means the next step is acting on the signed-in page.
  await page.getByTestId("account-button").waitFor({ state: "visible" });
}

export async function signOut(page: Page): Promise<void> {
  await page.getByTestId("account-button").click();
  await page.getByTestId("sign-out-button").click();
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
