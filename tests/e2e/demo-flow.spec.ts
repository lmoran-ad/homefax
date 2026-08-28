import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalScroll,
  signIn,
  signOut,
  SHOWCASE,
  UNCLAIMED,
} from "./helpers";

/**
 * The demo path, in the order it is presented. If this passes, the flow a
 * judge or an executive walks through works end to end.
 */
test.describe("the agent demo path", () => {
  test("search → record → timeline → documents → ask → add record", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening), Alex/ })).toBeVisible();

    // Search finds the showcase property.
    await page.fill('input[aria-label="Search HomeFaxes"]', "123 Main");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL(/\/properties\?q=/);
    await expect(page.getByRole("link", { name: "123 Main Street" })).toBeVisible();

    await page.getByRole("link", { name: "123 Main Street" }).click();
    await page.waitForURL(new RegExp(`/properties/${SHOWCASE}$`));

    // The identity, the value, the health score and the ledger.
    await expect(page.getByText(SHOWCASE).first()).toBeVisible();
    await expect(page.getByText("$685,000")).toBeVisible();
    await expect(page.getByText("Ledger Verified")).toBeVisible();
    await expect(page.getByText("24 events checked")).toBeVisible();
    await expect(page.getByRole("img", { name: /Home Health 92 out of 100/ })).toBeVisible();

    // HVAC sits at Watch, which is what the 92 reflects.
    await expect(page.getByRole("heading", { name: "HVAC" })).toBeVisible();
    await expect(page.getByText("Watch")).toBeVisible();
    await expectNoHorizontalScroll(page);

    // Timeline, with all 24 events and real hash footers.
    await page.getByRole("link", { name: "Timeline", exact: true }).click();
    await page.waitForURL(/\/timeline$/);
    await expect(page.getByRole("button", { name: /^All 24$/ })).toBeVisible();
    await expect(page.getByText("Basement water intrusion repair")).toBeVisible();
    await expect(page.getByText(/^hash [0-9a-f]{24}… · prev /).first()).toBeVisible();
    await expectNoHorizontalScroll(page);

    // A filter narrows it.
    await page.getByRole("button", { name: /^Repairs / }).click();
    await expect(page.getByText("Roof replacement").first()).toBeVisible();

    // Documents open; the restricted one refuses.
    await page.getByRole("link", { name: "Documents", exact: true }).click();
    await page.waitForURL(/\/documents$/);
    await page.getByRole("button", { name: /Invoice/ }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/^sha256 [0-9a-f]{64}$/)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: /^Restricted / }).click();
    const restricted = page.getByRole("button", { name: /Claim summary/ });
    await restricted.click();
    await expect(page.getByRole("status")).toContainText(/restricted/i);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("Ask This Home answers from the record and cites real events", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${SHOWCASE}/ask`);

    await page
      .getByRole("button", { name: "Has the basement ever had water problems?" })
      .click();

    // Whether the model or the local fallback answers, the guarantees hold:
    // an answer grounded in this record, citing events that exist.
    const citation = page.getByRole("link", {
      name: /Basement water intrusion repair/,
    });
    await expect(citation).toBeVisible({ timeout: 30_000 });

    await citation.click();
    await page.waitForURL(/\/timeline/);
    await expect(page.getByText("Basement water intrusion repair")).toBeVisible();
  });

  test("says the record is silent rather than claiming something did not happen", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${SHOWCASE}/ask`);

    await page.fill('input[aria-label="Your question"]', "Is there a dishwasher?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();

    await expect(page.getByText(/does not contain/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Absence of a record does not mean/i)).toBeVisible();
  });

  test("extraction is a proposal a human approves, and the ledger stays valid", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${SHOWCASE}/add-record`);

    await page.getByRole("button", { name: /HVAC replacement invoice/ }).click();

    // The review stage, explicitly marked as pending verification.
    await expect(page.getByText("AI EXTRACTED — PENDING VERIFICATION")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/sha256 [0-9a-f]{64}/)).toBeVisible();

    // The reviewer's choice of verification level is what the record carries;
    // nothing is pre-set to a verified level.
    const level = page.getByRole("combobox", { name: "Verification level" });
    await expect(level).toHaveValue("OWNER_REPORTED");

    await page.getByRole("textbox", { name: "Title", exact: true }).fill("HVAC replacement");
    await page.getByRole("textbox", { name: "System", exact: true }).fill("HVAC");
    await page.getByRole("button", { name: "Approve & Add to HomeFax" }).click();

    await page.waitForURL(/\/timeline\?new=/);
    await expect(page.getByText("NEW", { exact: true })).toBeVisible();

    // The chain is recomputed and still valid after the append.
    await page.goto(`/properties/${SHOWCASE}`);
    await expect(page.getByText("Ledger Verified")).toBeVisible();
    await expect(page.getByText("25 events checked")).toBeVisible();

    // Recording HVAC work clears the Watch flag and lifts the score.
    await expect(
      page.getByRole("img", { name: /Home Health 100 out of 100/ }),
    ).toBeVisible();
  });
});

test.describe("access gates", () => {
  test("an unclaimed record is readable but not writable", async ({ page }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${UNCLAIMED}`);

    // Readable.
    await expect(page.getByText(UNCLAIMED).first()).toBeVisible();
    await page.getByRole("link", { name: "Timeline", exact: true }).click();
    await expect(page.getByRole("button", { name: /^All \d+$/ })).toBeVisible();

    // Not writable.
    await page.goto(`/properties/${UNCLAIMED}/ask`);
    await expect(
      page.getByRole("heading", { name: "Claim stewardship to contribute" }),
    ).toBeVisible();
    await page.goto(`/properties/${UNCLAIMED}/add-record`);
    await expect(
      page.getByRole("heading", { name: "Claim stewardship to contribute" }),
    ).toBeVisible();
  });

  test("an MLS mismatch is rejected and names the listing of record", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${UNCLAIMED}/claim`);

    await page.getByRole("textbox", { name: "MLS number" }).fill("0000000");
    await page.getByRole("button", { name: "Claim stewardship" }).click();

    await expect(page.getByRole("alert")).toContainText("9184021");
    await expect(page.getByRole("alert")).toContainText("does not match");
  });

  test("the matching MLS number grants stewardship and unlocks contribution", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${UNCLAIMED}/claim`);

    await page.getByRole("textbox", { name: "MLS number" }).fill("9184021");
    await page.getByRole("button", { name: "Claim stewardship" }).click();

    await expect(
      page.getByRole("heading", { name: "Stewardship granted" }),
    ).toBeVisible();

    await page.goto(`/properties/${UNCLAIMED}/ask`);
    await expect(page.getByRole("heading", { name: "Ask This Home" })).toBeVisible();
  });
});

test.describe("the contractor loop", () => {
  test("request → accept → submit → approve appends a verified event", async ({
    page,
  }) => {
    // The homeowner requests work.
    await signIn(page, "homeowner");
    await page.goto("/pros");
    await expectNoHorizontalScroll(page);

    const summit = page
      .locator("article")
      .filter({ hasText: "Summit Mechanical" });
    await summit.getByRole("button", { name: "Request work" }).click();
    await page
      .getByRole("textbox", { name: "What do you need?" })
      .fill("The condenser is short cycling in the heat.");
    await page.getByRole("button", { name: "Send request" }).click();
    await page.waitForURL(/\/inbox/);
    await expect(page.getByText("REQUESTED", { exact: true })).toBeVisible();
    await signOut(page);

    // The contractor accepts and submits.
    await signIn(page, "contractor");
    await expect(page).toHaveURL(/\/jobs/);
    await page.getByRole("button", { name: "Accept job" }).first().click();
    await expect(page.getByText("CONTRACTOR ACCEPTED", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Submit completed work" }).first().click();
    await expect(page.getByText(/HomeFax found/)).toBeVisible();
    await page
      .getByRole("button", { name: /HVAC replacement invoice/ })
      .click();
    await expect(page.getByText(/Attached ·/)).toBeVisible({ timeout: 30_000 });
    await page
      .getByRole("button", { name: "Send to homeowner for acceptance" })
      .click();
    await expect(page.getByText("AWAITING HOMEOWNER ACCEPTANCE", { exact: true })).toBeVisible();
    await signOut(page);

    // The homeowner accepts, and only then does it become an event.
    await signIn(page, "homeowner");
    await page.goto("/inbox");
    await expect(page.getByText("PROPOSED RECORD")).toBeVisible();
    await page.getByRole("button", { name: "Accept into my HomeFax" }).click();

    await page.waitForURL(/\/timeline\?new=/);
    await expect(page.getByText("Professional Verified").first()).toBeVisible();
    await expect(page.getByText(/CO-MC-31188/)).toBeVisible();
  });

  test("a contractor cannot contribute from a property record", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`/properties/${SHOWCASE}/add-record`);
    await expect(
      page.getByRole("heading", { name: "Read-only record" }),
    ).toBeVisible();
  });
});

test.describe("transfer", () => {
  test("retains the history and opens a new ownership period", async ({ page }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${SHOWCASE}/transfer`);

    await page.getByRole("textbox", { name: "New owner name" }).fill("Dana Whitfield");
    await page.getByRole("textbox", { name: "New owner email" }).fill("owner@homefax.demo");
    await page
      .getByText(/I understand this is a simulated transfer/)
      .click();
    await page.getByRole("button", { name: "Transfer stewardship" }).click();

    await expect(
      page.getByRole("heading", { name: "Transferred to the homeowner" }),
    ).toBeVisible();
    await expect(page.getByText(/Verified · \d+ events checked/)).toBeVisible();

    await page.goto(`/properties/${SHOWCASE}`);
    await expect(page.getByText("Ledger Verified")).toBeVisible();
    await expect(page.getByText("Ownership period #3")).toBeVisible();
  });
});

test.describe("the header fits for every role", () => {
  for (const role of ["agent", "homeowner", "contractor"] as const) {
    test(`no horizontal scroll as ${role}`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 900 });
      await signIn(page, role);
      await expectNoHorizontalScroll(page);

      // The account button must stay reachable, so sign-out is never cut off.
      await page.click('button[aria-haspopup="menu"]');
      await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
    });
  }
});
