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
    await page.getByTestId("search-input").fill("123 Main");
    await page.getByTestId("search-submit").click();
    await page.waitForURL(/\/properties\?q=/);
    await expect(page.getByRole("link", { name: "123 Main Street" })).toBeVisible();

    await page.getByRole("link", { name: "123 Main Street" }).click();
    await page.waitForURL(new RegExp(`/properties/${SHOWCASE}$`));

    // The identity, the value, the health score and the ledger.
    await expect(page.getByTestId("property-token-id")).toHaveText(SHOWCASE);
    await expect(page.getByTestId("property-value")).toHaveText("$685,000");
    await expect(page.getByTestId("ledger-bar")).toHaveAttribute("data-valid", "true");
    await expect(page.getByTestId("ledger-count")).toContainText("24 events checked");
    await expect(page.getByTestId("health-score")).toHaveText("92");

    // HVAC sits at Watch, which is what the 92 reflects.
    await expect(
      page.getByTestId("system-card").filter({ has: page.getByRole("heading", { name: "HVAC" }) }),
    ).toHaveAttribute("data-status", "WATCH");
    await expectNoHorizontalScroll(page);

    // Timeline, with all 24 events and real hash footers.
    await page.getByRole("link", { name: "Timeline", exact: true }).click();
    await page.waitForURL(/\/timeline$/);
    await expect(
      page.getByTestId("timeline-filter").filter({ hasText: /^All 24$/ }),
    ).toBeVisible();
    await expect(page.getByText("Basement water intrusion repair")).toBeVisible();
    await expect(page.getByTestId("event-hash").first()).toContainText(/^hash [0-9a-f]{24}… · prev /);
    await expectNoHorizontalScroll(page);

    // A filter narrows it.
    await page.getByTestId("timeline-filter").filter({ hasText: /^Repairs / }).click();
    await expect(page.getByText("Roof replacement").first()).toBeVisible();

    // Documents open; the restricted one refuses.
    await page.getByRole("link", { name: "Documents", exact: true }).click();
    await page.waitForURL(/\/documents$/);
    await page.getByTestId("document-card").first().click();
    await expect(page.getByTestId("document-modal")).toBeVisible();
    await expect(page.getByTestId("document-sha")).toContainText(/sha256 [0-9a-f]{64}/);
    await page.getByTestId("modal-close").click();

    await page.getByTestId("document-filter").filter({ hasText: /^Restricted / }).click();
    await page.getByTestId("document-card").first().click();
    await expect(page.getByTestId("toast")).toContainText(/restricted/i);
    await expect(page.getByTestId("document-modal")).toHaveCount(0);
  });

  test("Ask This Home answers from the record and cites real events", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${SHOWCASE}/ask`);

    await page
      .getByTestId("ask-suggestion")
      .filter({ hasText: "Has the basement ever had water problems?" })
      .click();

    // Whether the model or the local fallback answers, the guarantees hold:
    // an answer grounded in this record, citing events that exist.
    const citation = page.getByTestId("ask-citation").filter({
      hasText: /Basement water intrusion repair/,
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

    await page.getByTestId("ask-input").fill("Is there a dishwasher?");
    await page.getByTestId("ask-submit").click();

    const answer = page.getByTestId("ask-answer");
    await expect(answer).toContainText(/does not contain/i, { timeout: 30_000 });
    await expect(answer).toContainText(/Absence of a record does not mean/i);
    await expect(page.getByTestId("ask-citation")).toHaveCount(0);
  });

  test("extraction is a proposal a human approves, and the ledger stays valid", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${SHOWCASE}/add-record`);

    await page.getByTestId("add-record-demo-doc").filter({ hasText: /HVAC replacement invoice/ }).click();

    // The review stage, explicitly marked as pending verification.
    await expect(page.getByTestId("add-record-pending-notice")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("add-record-review")).toBeVisible();

    // The reviewer's choice of verification level is what the record carries;
    // nothing is pre-set to a verified level.
    await expect(page.getByTestId("field-verification")).toHaveValue("OWNER_REPORTED");

    await page.getByTestId("field-title").fill("HVAC replacement");
    await page.getByTestId("field-system").fill("HVAC");
    // Without a live model the proposal comes back as DOCUMENT_ADDED, so the
    // reviewer classifies it — which is the step that updates the system card.
    await page.getByTestId("field-event-type").selectOption("SYSTEM_INSTALLATION");
    await page.getByTestId("approve-button").click();

    await page.waitForURL(/\/timeline\?new=/);
    await expect(page.getByTestId("event-new-flag")).toBeVisible();

    // The chain is recomputed and still valid after the append.
    await page.goto(`/properties/${SHOWCASE}`);
    await expect(page.getByTestId("ledger-bar")).toHaveAttribute("data-valid", "true");
    await expect(page.getByTestId("ledger-count")).toContainText("25 events checked");

    // Recording HVAC work clears the Watch flag and lifts the score.
    await expect(
      page.getByTestId("system-card").filter({ has: page.getByRole("heading", { name: "HVAC" }) }),
    ).toHaveAttribute("data-status", "EXCELLENT");
    await expect(page.getByTestId("health-score")).toHaveText("100");
  });
});

test.describe("access gates", () => {
  test("an unclaimed record is readable but not writable", async ({ page }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${UNCLAIMED}`);

    // Readable.
    await expect(page.getByTestId("property-token-id")).toHaveText(UNCLAIMED);
    await page.getByTestId("property-tab").filter({ hasText: "Timeline" }).click();
    await expect(page.getByTestId("timeline-event").first()).toBeVisible();

    // Not writable.
    for (const tab of ["ask", "add-record"]) {
      await page.goto(`/properties/${UNCLAIMED}/${tab}`);
      await expect(page.getByTestId("lock-panel")).toHaveAttribute("data-action", "claim");
      await expect(page.getByTestId("lock-title")).toHaveText(
        "Claim stewardship to contribute",
      );
    }
  });

  test("an MLS mismatch is rejected and names the listing of record", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${UNCLAIMED}/claim`);

    await page.getByTestId("claim-mls-number").fill("0000000");
    await page.getByTestId("claim-submit").click();

    const error = page.getByTestId("claim-error");
    await expect(error).toContainText("9184021");
    await expect(error).toContainText("does not match");
  });

  test("the matching MLS number grants stewardship and unlocks contribution", async ({
    page,
  }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${UNCLAIMED}/claim`);

    await page.getByTestId("claim-mls-number").fill("9184021");
    await page.getByTestId("claim-submit").click();

    await expect(page.getByTestId("claim-result")).toHaveAttribute(
      "data-status",
      "active",
    );

    await page.goto(`/properties/${UNCLAIMED}/ask`);
    await expect(page.getByTestId("ask-input")).toBeVisible();
    await expect(page.getByTestId("lock-panel")).toHaveCount(0);
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
      .getByTestId("contractor-card")
      .filter({ hasText: "Summit Mechanical" });
    await summit.getByTestId("request-work-button").click();
    await page
      .getByTestId("request-need")
      .fill("The condenser is short cycling in the heat.");
    await page.getByTestId("request-send").click();
    await page.waitForURL(/\/inbox/);
    await expect(page.getByTestId("job-card").first()).toHaveAttribute(
      "data-status",
      "requested",
    );
    await signOut(page);

    // The contractor accepts and submits.
    await signIn(page, "contractor");
    await expect(page).toHaveURL(/\/jobs/);
    await page.getByTestId("accept-job-button").first().click();
    await expect(page.getByTestId("job-card").first()).toHaveAttribute(
      "data-status",
      "accepted",
    );

    await page.getByRole("button", { name: "Submit completed work" }).first().click();
    await expect(page.getByTestId("submission-address-check")).toHaveAttribute(
      "data-ok",
      "true",
    );
    await page
      .getByTestId("submission-doc")
      .filter({ hasText: /HVAC replacement invoice/ })
      .click();
    await expect(page.getByTestId("submission-send")).toBeEnabled({ timeout: 30_000 });
    await page.getByTestId("submission-send").click();
    await expect(page.getByTestId("job-card").first()).toHaveAttribute(
      "data-status",
      "submitted",
    );
    await signOut(page);

    // The homeowner accepts, and only then does it become an event.
    await signIn(page, "homeowner");
    await page.goto("/inbox");
    await expect(page.getByTestId("proposed-record")).toBeVisible();
    await page.getByTestId("accept-submission-button").click();

    await page.waitForURL(/\/timeline\?new=/);
    const appended = page.getByTestId("timeline-event").filter({
      has: page.getByTestId("event-new-flag"),
    });
    await expect(appended).toHaveAttribute(
      "data-verification",
      "PROFESSIONAL_VERIFIED",
    );
    await expect(appended).toContainText("CO-MC-31188");
  });

  test("a contractor cannot contribute from a property record", async ({ page }) => {
    await signIn(page, "contractor");
    await page.goto(`/properties/${SHOWCASE}/add-record`);
    await expect(page.getByTestId("lock-panel")).toHaveAttribute("data-action", "jobs");
    await expect(page.getByTestId("lock-title")).toHaveText("Read-only record");
  });
});

test.describe("transfer", () => {
  test("retains the history and opens a new ownership period", async ({ page }) => {
    await signIn(page, "agent");
    await page.goto(`/properties/${SHOWCASE}/transfer`);

    await page.getByTestId("transfer-name").fill("Dana Whitfield");
    await page.getByTestId("transfer-email").fill("owner@homefax.demo");
    await page.getByTestId("transfer-acknowledge").check();
    await page.getByTestId("transfer-submit").click();

    const result = page.getByTestId("transfer-result");
    await expect(result).toBeVisible();
    await expect(result).toContainText(/Verified · \d+ events checked/);

    await page.goto(`/properties/${SHOWCASE}`);
    await expect(page.getByTestId("ledger-bar")).toHaveAttribute("data-valid", "true");
    // The outgoing period is closed and renumbered; a new current one opens.
    await expect(page.getByTestId("ownership-period").first()).toContainText(
      "Current ownership period",
    );
  });
});

test.describe("the header fits for every role", () => {
  for (const role of ["agent", "homeowner", "contractor"] as const) {
    test(`no horizontal scroll as ${role}`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 900 });
      await signIn(page, role);
      await expectNoHorizontalScroll(page);

      // The account button must stay reachable, so sign-out is never cut off.
      await page.getByTestId("account-button").click();
      await expect(page.getByTestId("sign-out-button")).toBeVisible();
    });
  }
});
