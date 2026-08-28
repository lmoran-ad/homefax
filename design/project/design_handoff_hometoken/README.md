# Handoff: RE/MAX HomeToken

## Overview

HomeToken is a permanent, append-only property record — "the digital identity of real estate." Every parcel carries a hash-chained history of what was built, repaired, inspected, permitted and paid for. The record belongs to the property, not to an owner, an agent or a subscription.

The prototype covers three signed-in roles against one shared dataset, plus a public marketing landing page:

- **Agent** — search any HomeToken, claim stewardship of a listing, compile a listing-ready record, export it, transfer it to the homeowner at close.
- **Homeowner** — see their home's record and Home Health, find verified contractors, approve or decline what contractors submit.
- **Verified Source contractor** — accept homeowner requests, submit completed work directly to an address for the homeowner's approval.

The commercial model (four paid surfaces plus a licensed condition API) and the acquisition model (how an agent or owner comes to control a record) are both built out, because both are the subject of management review.

## About the Design Files

The files in this bundle are **design references created in HTML** — a prototype showing intended look and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established patterns, component library and state management. If no environment exists yet, choose the most appropriate framework for the project and implement the designs there.

Two specific notes on the prototype's construction, so you don't inherit its constraints:

- All styling is **inline** and there is no CSS class system. That was a requirement of the prototype environment, not a design decision. Use your codebase's normal styling approach and lift the token values from the Design Tokens section below.
- All data is **seeded in-memory** and resets on reload. Every list, hash, claim and job in the prototype is fixture data. See State Management for what needs to become real persistence and real API calls.

## Fidelity

**High-fidelity.** Final colors, typography, spacing, copy and interaction behavior. Recreate the UI closely using your codebase's existing libraries and patterns. Exact hex values, type sizes and spacing are documented below.

Two deliberate exceptions, both marked in the UI as placeholders:

- **Property photography** is a navy dot-grid block labelled `PHOTO PLACEHOLDER`. Real listing photos replace it.
- **Icons** are minimal CSS/SVG shapes. Use your icon library.

## Screens / Views

Layout container for every signed-in screen: `max-width: 1440px; margin: 0 auto; padding: 44px 32px 90px` (narrower screens use `max-width: 1160px` or `1000px` as noted). Page background `#f4f6f8`.

### 1. Landing page (public)

**Purpose:** explain HomeToken to a first-time visitor and route them into the demo.

**Layout:** sticky translucent header (`#ffffffee`, `backdrop-filter: blur(8px)`, `70px`, bottom border `#e3e7ec`), then full-bleed navy hero, then five `max-width: 1180px` content bands at `padding: 80px 24px 0`, then a CTA card and footer line.

**Components:**

- **Header** — logo cluster (32px rounded navy tile + `HomeToken` at 19px/800) on the left; anchor links `How it works`, `Who it's for`, `Plans` at 14px/600 `#3d4a57`; red `Sign in` button (`#e4002b`, radius 9px, `11px 20px`, 14px/700).
- **Hero** — two columns, `repeat(auto-fit, minmax(320px, 1fr))`, `gap: 56px`, `padding: 88px 24px 96px`. Background `#0b2c52` with `radial-gradient(#ffffff1f 1px, transparent 1px)` at `background-size: 22px 22px`.
  - Eyebrow pill: `#ffffff14` fill, `1px solid #ffffff2b`, radius 999px, `7px 14px`, 12.5px/700, `letter-spacing: 0.04em`, red 7px dot. Copy: `REAL / REMAX PROPERTY RECORD`.
  - H1 58px/800, `line-height: 1.03`, `letter-spacing: -0.035em`: "The digital identity of real estate."
  - Body 19px, `line-height: 1.55`, `#ffffffcc`, `max-width: 560px`.
  - Buttons: red `Explore the demo`, ghost `See plans` (`#ffffff14`, `1px solid #ffffff33`), both radius 10px, `16px 26px`, 15.5px/700.
  - Right card: `#ffffff0f` fill, `1px solid #ffffff26`, radius 18px, `26px 28px`. Contains 4 real events from the seeded showcase property as a timeline (9px red dot, 1px `#ffffff2b` connector), then a mono hash line at 10.5px `#ffffff7a`.
- **Pillars band** — 3 cards, `repeat(auto-fit, minmax(280px, 1fr))`, `gap: 18px`. Each: white, `1px solid #e3e7ec`, radius 16px, `26px 28px`, a 34×4px red rule as the icon, title 18.5px/800, body 14.5px/`line-height: 1.6` `#5b6875`.
- **How it works band** (`#how`) — 4 numbered step cards (28px navy rounded square, white number 13.5px/800) plus a verification-legend row of 5 pills.
- **Who it's for band** (`#roles`) — 3 role cards, `minmax(290px, 1fr)`. Avatar circle 40px in the role color, kicker 11px/700 `letter-spacing: 0.14em`, 3 checkmark bullets (`✓` in `#12693b`), full-width outline CTA that pre-fills that demo account on the login screen. The agent card carries a red border (`#e4002b`) as the visual anchor.
- **Plans band** (`#pricing`) — 4 plan cards + the navy Verified Condition API strip. Same card anatomy as the in-app Plans screen (below).
- **"What a HomeToken is not"** — white card, 4 bullets with `—` in `#a8102a`. Content is load-bearing: not a deed, not a security or cryptocurrency, not an appraisal, not an inspection or warranty.
- **CTA card** — `#12395f`, radius 18px, `52px 44px`, centered, H2 36px/800.

### 2. Login

**Purpose:** pick one of three demo accounts and enter.

**Layout:** two columns `1.05fr 1fr`, `min-height: 100vh`. Left is the navy dot-grid brand panel (`padding: 56px 64px`, space-between: logo / headline block / legal line). Right is white, centered, form `max-width: 430px`.

**Components:**

- `← Back to home` text button, `#1a4f9c`, 13.5px/700.
- Kicker + H2 (38px/800) + blurb — **all three change per selected account** (`AGENT SIGN IN` / `HOMEOWNER SIGN IN` / `CONTRACTOR SIGN IN`).
- Email and password inputs: `14px 16px`, `1px solid #d8dee5`, radius 10px, 15px. Password has an inline `SHOW`/`HIDE` toggle at 12px/600 `#7d8a97`.
- `Keep me signed in` checkbox (`accent-color: #1a4f9c`) and a `Forgot password?` link.
- Error banner: `#fdecee` fill, `1px solid #f5c2c8`, `#a8102a` text, radius 10px.
- Submit: full-width red, `16px`, radius 10px, 16px/700. Label becomes `Signing in…` for 450ms.
- **Demo account picker** — 3 rows under a `DEMO ACCOUNTS` divider. Each: 40px avatar circle, name 14.5px/700, role line 13px `#5b6875`, role badge. Selected row: `1.5px solid #1a4f9c`, `#f2f7fd` fill. Clicking a row fills the credentials; it does not sign in.

Accounts (password is `demo-password` for all three):

| Name | Email | Role | Avatar | Landing route |
|---|---|---|---|---|
| Alex Morgan | agent@hometoken.demo | REAL / REMAX Demo Agent | `#0b2c52` | Dashboard |
| Dana Whitfield | owner@hometoken.demo | Homeowner · 123 Main Street | `#12693b` | Her property |
| Marcus Vale | summit@hometoken.demo | Summit Mechanical · Verified Source | `#8a5a06` | Jobs |

### 3. App header (all signed-in screens)

Sticky, `z-index: 20`, white, bottom border `#e3e7ec`, `height: 68px`, inner `max-width: 1440px; padding: 0 20px; gap: 12px`.

Order: logo cluster (30px navy tile + `HomeToken`, no REAL/REMAX lockup — it is omitted here for width) → nav buttons → flex spacer → `DEMO` marker (8px `#c98a12` dot + 11.5px/700 `#8a5a06` label) → account button.

**Header width is tight and has regressed repeatedly. Constraints that must hold:** the logo cluster, nav and account button are all `flex: 0 0 auto`; the spacer is `flex: 1 1 auto; min-width: 0`; the account name is `flex: 0 0 auto` and must never ellipsis; nothing may produce horizontal page scroll. If you add a header element, re-check `document.documentElement.scrollWidth === clientWidth` for all three roles — the homeowner nav is the widest.

Nav per role (active item: `#f1f4f7` fill, 700 weight, `#12222f`):

- Agent: `Home`, `Properties`, `Saved (n)`
- Homeowner: `My Homes`, `Find a Pro`, `Requests (n)`
- Contractor: `Jobs`, `Verification`, `Find a Pro`

**Account dropdown** — trigger is a pill (36px avatar + name + `▾` caret that rotates 180° when open). Menu: absolute, `top: 52px; right: 0; width: 252px`, white, `1px solid #e3e7ec`, radius 12px, `box-shadow: 0 14px 34px #0b2c5226`, `padding: 8px`, `z-index: 40`, `fadeUp 0.16s ease`. Header block shows name, email, plan pill and a `Demo data` pill; then `Account settings`, `Plans & billing`, a 1px divider, and `Sign out` in `#a8102a`/700. Closes on outside `mousedown` and on `Escape`. Sign out resets all session state and returns to the login screen.

### 4. Agent dashboard

**Purpose:** find a record, claim a new one, work the book.

Sections in order:

1. **Greeting** — `Good {morning|afternoon|evening}, {firstName}` at 36px/800, plus a role-specific lead line.
2. **Search card** (agent only) — white, radius 16px, `padding: 22px`. Input + navy `Search` button + four mono "Try" chips (`123 Main`, `Denver`, a token ID, a parcel ID).
3. **Claim panel** — white with `1.5px solid #cfe0f5`, radius 16px. Kicker `CLAIM A HOMETOKEN` in `#1a4f9c`, H2 21px/800, address lookup input + red `Look up`. Three outcomes:
   - **Found** — grey inset row with address, token, claim-state badge and a navy action button (`Claim stewardship` / `Open record`).
   - **Not found** — amber panel (`#fffaf1`, `1px solid #f2dcb4`) explaining the parcel is outside pre-provisioned markets, with `Provision a HomeToken from county records`. This creates a new record seeded with two county events, all systems `UNKNOWN`, and low Home Health confidence.
   - **Nothing yet** — panel body only.
4. **Your book** — one row per HomeToken under the agent's stewardship: address, claim badge, event count, `EXPIRES IN {n} days`. (Homeowner sees `Your homes` with health instead of expiry.)
5. **Recent HomeTokens** — 3-up card grid, `repeat(auto-fit, minmax(260px, 1fr))`, `gap: 20px`. Card: 150px navy dot-grid photo placeholder (red `Showcase` flag on the seeded property), address 17px/700, city line, mono token ID + claim badge, then a 3-column stat footer above a `1px solid #eef1f4` rule: `EST. VALUE`, `HEALTH n /100`, `EVENTS`.

### 5. Search results

Input + `Search` button, a result-count line, then rows: `grid-template-columns: 100px minmax(0,1fr) auto`, `gap: 22px`. 84px navy thumb, address 18px/700, city line, mono token + parcel, then right-aligned `EST. VALUE` / `HEALTH` / `EVENTS`. Empty state is a centered white card suggesting `123 Main`, `Denver` or a token ID.

### 6. Saved properties (agent)

Rows with address, claim badge, city + token line, value, health, and a `Remove` button that turns `#a8102a` on hover. Empty state: "Nothing saved yet" + `Browse properties`. Saving is a bookmark only — it claims nothing and notifies no one. The `☆ Save` / `★ Saved` control appears **only** for the agent role.

### 7. Property record

Sub-header below the app header: breadcrumb (`Properties` or `My Home` › address › mono token) then a tab row. Tabs: `Overview`, `Timeline`, `Documents`, `Ask This Home`, `Add Record`, `Transfer to owner` (agent only). Active tab: 700 weight, `#12222f`, `2px solid #e4002b` bottom border.

#### Overview

Two columns: `minmax(0, 1.55fr) minmax(280px, 0.85fr)`, `gap: 22px`, `align-items: start`.

**Hero card** — white, radius 16px, `overflow: hidden`, `grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr)`. Left is the navy photo placeholder (`min-height: 290px`). Right (`padding: 26px 28px`): address 36px/800 with the save control opposite it; sub-line; `HOMETOKEN ID` (mono, `#1a4f9c`, with a `Copy`→`Copied` button) and `PARCEL`; `ESTIMATED VALUE` at 38px/800 beside "Informational estimate · not an appraisal"; a facts line (`4 Bed | 3 Bath | 2,880 sqft | 7,500 sqft lot | Built 1994`); then `Ask This Home` (red), `Add Record`, `Transfer HomeToken` (agent only).

**Stewardship bar** (agent only) — one of three states, each with badge, title, detail and action:
- Active: `#eef7f1` / `#cfe6d9`, "Stewardship active · MLS 9182446", expiry countdown, `Release`.
- Pending: `#fffaf1` / `#f2dcb4`, "Waiting on the owner of record", `Withdraw`.
- Unclaimed: `#f8fafb` / `#e3e7ec`, "Seeded from county records, not yet claimed", red `Claim HomeToken`.

**Ledger bar** — green when valid: 34px circle with `✓`, "Ledger Verified", "{n} events checked · SHA-256 hash chain intact · last verified today at {time}", genesis date, and a `Re-verify` button that recomputes the whole chain.

**Major systems** — `repeat(auto-fit, minmax(230px, 1fr))`, `gap: 16px`. Card per system: name 16px/700, status pill (dot + label), 3 key/value rows, then a footer with the verification badge, a `Find a pro` link (homeowner only, on `WATCH`/`ATTENTION`) and `Source event →` which deep-links to the timeline. Cards in `WATCH`/`ATTENTION` take a `#f0dcb8` border.

**Recent history** — 5 newest events as a dotted timeline; `Full timeline (n) →`.

**Right column:**
- **Home Health** — 132px conic-gradient donut (`conic-gradient(#12693b {deg}, #eef1f4 0)`) with a 104px white inner circle, score 38px/800; confidence pill; explainer; then a per-system bar list (`96px 1fr 42px` grid, 7px tracks). Footer disclaimer: reflects only what the record contains, not an inspection or appraisal.
- **Ownership periods** — anonymized. Current period gets `#f2f7fd` / `#cfe0f5`. Caption: "Prior owners are never named in the property record."
- **Sales & tax record** — sales rows and assessed-value/tax rows derived from the event list.

#### Timeline

Two columns `minmax(0,1.7fr) minmax(270px,0.8fr)`. Header with an append-only caption, `Export record` and `Add Record`. Nine filter pills with counts (`All`, `Ownership`, `Sales`, `Repairs`, `Improvements`, `Permits`, `Inspections`, `Taxes`, `Documents`). Events grouped by year under a `{year} ————` rule. Event card: date, verification badge, mono event type, optional red `New` flag, title 17px/700, meta, description, document chips (`📄` open a modal; `🔒` restricted refuses), and a mono footer `hash {24 chars}… · prev {16 chars}…`. Right rail is the verification legend plus the append-only note. Sticky at `top: 96px`.

#### Documents

Filter pills (`All`, `Public`, `Authenticated`, `Restricted`) then a `minmax(230px, 1fr)` card grid. Card: type icon tile, visibility pill, name, source event, date + kind, mono `sha256` prefix. Restricted documents show `not-allowed` and toast instead of opening.

**Document modal** — overlay `#0b2c5299`, white card `max-width: 720px`, `max-height: 80vh`, scrolling mono body on `#f8fafb`, sha256 line. Closes on overlay click or `Close`.

#### Ask This Home

Chat column + right rail. Header: red 38px `✦` tile, title, and a context line — "{n} events · {n} documents in context · {n} of 3 free questions left" (or "Agent Pro, unlimited").

Message bubbles: user is navy `#0b2c52` with white text, right-aligned, `max-width: 70%`; assistant is `#f8fafb` with `1px solid #e3e7ec`, `max-width: 86%`. Assistant bubbles carry a `REFERENCED EVENTS` block of citation chips that deep-link to the timeline, an amber caveat box, and a confidence line. Loading state is a spinner with "Reading the HomeToken record…". Right rail: four suggested questions and a "How grounding works" note.

**This is the product's central claim and must survive the port.** The model receives only that property's events, systems and document summaries. It cites the events it used, says when the record has no answer, never treats absence of a record as proof, and never asserts outside facts. If the call fails, a local fallback lists matching events verbatim and labels itself as such.

#### Add Record

Three stages in one panel:

1. **Choose** — dashed drop zone (`2px dashed #cfd8e0`, radius 14px, `padding: 38px`), an `OR USE A DEMO DOCUMENT` divider, three demo document cards, and `Enter a record manually instead →`.
2. **Extracting** — spinner, "Reading {filename}", "Extracting a proposed property event. This will require your review."
3. **Review** — amber notice reading `AI EXTRACTED — PENDING VERIFICATION` with the model's confidence, then an editable form: title, event type, date, contractor, amount, system, permit number, description, verification level, visibility. An `EVIDENCE FROM THE DOCUMENT` block lists the quoted evidence. Actions: green `Approve & Add to HomeToken` (`#12693b`), `Discard`, and the note "Approving appends a new event and extends the hash chain. Nothing is overwritten."

Right rail shows the source document with its sha256 and a mono text preview, plus a "Why approval is required" card: extraction is a proposal; an event is never marked verified because AI produced it.

Approving appends the event, updates the matching system's status and source link, recomputes the chain, flags the event `New`, and scrolls to it in the timeline.

#### Transfer to owner (agent only)

Form: current steward (disabled), new owner name, new owner email, transfer date, plus a required acknowledgement that this is a simulated record transfer and not a legal title transfer. Success state: green `✓`, "Transferred to the homeowner", retained-event count, homeowner invite line, ledger line, and `View timeline` / `Back to overview`. Appends two events (`TRANSFER`, `OWNERSHIP_PERIOD_STARTED`), opens a new ownership period, and closes the previous one.

### 8. Claim / verify screen

`max-width: 1160px`, two columns `minmax(0,1.7fr) minmany(270px,0.8fr)`. Kicker is `CLAIM STEWARDSHIP` for agents and `VERIFY OWNERSHIP` for owners; the intro paragraph and the right-rail "What {stewardship|verification} grants" list swap with it.

A seeded-record stat strip (`SEEDED EVENTS`, `DOCUMENTS`, `OWNERSHIP PERIODS`, `HOME HEALTH`) proves the record pre-exists the claim.

**Method cards** — radio-style, selected card gets `1.5px solid #0b2c52` and `#f8fafb`, and reveals its own sub-fields:

Agent methods:
- **MLS listing of record** — `AUTO-VERIFIED`. MLS number + disabled listing-agent ID. Validates against the parcel's real MLS number and rejects a mismatch by name. Grants immediately, 90-day expiry.
- **Seller authorization** — `OWNER CONSENT`. Requires an acknowledgement checkbox. Lands `pending`.
- **Title & escrow at closing** — `30-DAY CLAIM`. Requires an escrow number. Grants immediately, 30-day expiry.

Homeowner methods:
- **Match to the owner of record** — `AUTO-VERIFIED`. Compares account name to the county deed; grants only on a match, otherwise errors and points at the proof path.
- **Upload proof of ownership** — `RECORDER REVIEW`. Pick `County tax notice`, `Recorded deed` or `Utility bill`. Lands `pending`.

Success panel: green `✓` (or amber `⋯` for pending), title, body, a 4-row detail list, and `Open the property record` / `Back to properties`.

Right rail: navy "Agents don't create HomeTokens" card (parcels are provisioned in advance from public data; claiming is authorization over a record that already exists), the grants list, and a "Why claims expire" card (time-boxed and non-exclusive so no brokerage can hold a market's parcels hostage).

**The gates are real and must stay real.** Until a claim is `active`, `Ask This Home`, `Add Record`, `Transfer` and `Export record` are all blocked and replaced by a centered lock panel with the claim CTA. `Overview`, `Timeline` and `Documents` stay readable.

### 9. Find a Pro (homeowner + contractor)

Search card with a trade/company/license input and a `Verified only` checkbox, then trade filter pills with counts. Contractor grid `repeat(auto-fit, minmax(260px, 1fr))`. Card: 44px initials tile, `VERIFIED SOURCE` (green) or `UNVERIFIED` (grey) pill, name 17.5px/800, trade, then license / jobs-on-HomeToken / service-area rows, then `View record` + `Request work`. Unverified contractors get a `#f0dcb8` border and a red license value. `Request work` is homeowner-only; other roles get a disabled `Homeowner only` state.

**Contractor profile** — header with initials tile, name, verification pill, trade + area, blurb, a 4-stat strip (license, jobs, records on this home, contact), `Request work at my home` and `Copy license number`. Below: "Work recorded on HomeToken" rows built by matching the contractor's name against event metadata across all properties, shown ZIP-only. Right rail: verification checklist and a "What verification does and does not mean" card — a license on file, not an endorsement, warranty or quality rating.

**Request modal** — trade, free-text need, and a checkbox to share that system's record so the contractor can quote from real history. Sends a job and routes to Requests.

### 10. Requests (homeowner)

One card per job, bordered by status: `REQUESTED` (blue), `CONTRACTOR ACCEPTED` (grey), `AWAITING HOMEOWNER ACCEPTANCE` (amber), `ADDED TO HOMETOKEN` (green), `DECLINED BY HOMEOWNER` (red). A submitted job embeds the proposed record — title, meta line, description, document chip — with green `Accept into my HomeToken` and `Decline`, plus the note that accepting appends a Professional Verified event with the contractor attached. Approved jobs show `View on timeline →`. Empty state routes to Find a Pro.

### 11. Jobs (contractor)

Header with `Submit work to an address`, a 4-stat strip (`OPEN REQUESTS`, `IN PROGRESS`, `AWAITING OWNER`, `RECORDED`), an optional submission form, then job cards.

**Submission form** (red-bordered panel): address input with live HomeToken lookup (green when a token is found and named, red when not), document choice (trade-specific demo documents or a file upload) that triggers AI extraction, then title, date, amount, event type, system, description. Submit is `Send to homeowner for acceptance`. Refuses an address with no HomeToken, and refuses any address without a homeowner account.

Job cards show status, trade, address, mono token, description and one contextual action: `Accept job`, `Submit completed work`, or `Submit a corrected record`.

### 12. Verification (contractor)

Profile card with verification pill, "verified source since" line, editable company name / trade / license / service ZIPs, and `Save profile`. Below, a 4-item verification checklist (license, business entity, insurance, Find a Pro listing) each with a status badge. Right rail: navy `$25 / month` subscription card with `Manage subscription`, and a "Why homeowners accept your records" card — a submission is a proposal, not an edit; the owner can accept or decline but cannot alter it.

### 13. Plans & billing

Back-link to settings, a monthly/annual toggle (navy pill for the active cycle, plus a green savings note), then 4 plan cards `repeat(auto-fit, minmax(240px, 1fr))`, `min-height: 520px`:

| Audience | Plan | Monthly | Annual | Flag |
|---|---|---|---|---|
| Homeowner | Homeowner | Free | Free | — |
| Homeowner | Homeowner Plus | $8 / property | $80 / property | — |
| Agent · Brokerage | Agent Pro | $39 / seat | $390 / seat | Primary revenue (red border) |
| Contractor | Verified Source | $25 / license | $250 / license | Compounding |

Card anatomy: audience kicker, name 22px/800, price 36px/800 + unit, pitch, `1px solid #eef1f4` rule, 5 feature rows (`✓` green / `—` grey), CTA, footnote.

Below: navy **Verified Condition API** panel ($0.35 per call, $25k/yr minimum, consent scoped per record class; restricted and unverified events never returned) and a **System-triggered leads** panel that shows the live HVAC `WATCH` flag becoming a lead, next to an explicit trust constraint — referrals stay labelled, never reorder events, never influence Home Health.

Finally an **Illustrative unit economics** table (5 revenue lines, price / units / annual / "what it depends on", blended $4.03M) captioned as placeholder figures for discussion, not a forecast.

**Paywall modal** — tier label, plan line, title, body, 3 checkmark bullets, red upgrade CTA, `Not now`, and "Demo checkout. No payment is collected." Gates: report export, the 4th Ask question, contractor verification, API access, Homeowner Plus.

### 14. Account settings

`max-width: 1000px`, two columns `minmax(0,1.5fr) minmax(260px,0.9fr)`.

Left: **Profile** (56px avatar, name, role line, then full name / email / phone / disabled role fields, `Save changes`) and **Change password** (current, new, confirm; validates non-empty current, 8-character minimum, and matching confirmation; clears on success).

Right: **Subscription** card (status pill `ACTIVE` / `CANCELS SOON` / `FREE`, plan name, price, billing cycle, next renewal or access-end date, payment method, `View plans`, and `Cancel subscription` in `#a8102a` when active), a **Sessions** card with `Sign out`, and a "Your record, if you cancel" card — cancelling ends paid features; the record, events and documents remain, because the record belongs to the property.

**Cancel modal** — "Cancel {plan}?", end-of-period explanation, an inset card restating that the record is unaffected, then `Cancel subscription` (`#a8102a`) and `Keep it`.

## Interactions & Behavior

**Navigation** — single-page role-aware routing: `landing`, `login`, `dashboard`, `search`, `property`, `claim`, `saved`, `pros`, `pro`, `inbox`, `jobs`, `verify`, `plans`, `settings`. Every route change scrolls to top. The property view has its own tab state.

**Sign in** — validates the email against the three demo accounts, shows `Signing in…` for 450ms, then routes to that role's landing screen and resets per-session state.

**Sign out** — clears role, plan, ask history, drafts, filters and modals, and returns to login.

**Ledger verification** — on mount, every property's events are sorted oldest-first and hash-chained: for each event, canonicalize `{id, eventType, occurredAt, title, description, verificationLevel, visibility, metadata, previousHash}` as JSON and SHA-256 it (`crypto.subtle.digest`), seeding `previousHash` with the literal `GENESIS`. Appending any event recomputes that property's chain and refreshes the "last verified" timestamp.

**Home Health** — deterministic, no model involvement. Fixed weights: roof 20, HVAC 20, electrical 15, plumbing 15, foundation 15, water heater 10, other 5. Status multipliers: `EXCELLENT` 1.0, `GOOD` 0.85, `WATCH` 0.6, `ATTENTION` 0.3, `UNKNOWN` 0.5. Score is the rounded sum; confidence is `High` ≥ 0.85 of systems known, `Medium` ≥ 0.5, else `Low`. The donut angle is `score × 3.6deg`.

**AI extraction** (Add Record and contractor submission) — send the document text with a system prompt that forbids guessing, requires `null` for unknown scalars and `[]` for unknown lists, and returns a fixed JSON schema (`suggestedEventType`, `title`, `description`, `occurredAt`, `contractor`, `amount`, `currency`, `category`, `materials`, `warrantyYears`, `permitNumber`, `systemType`, `confidence`, `evidence`). Parse the first JSON object in the response; on any failure fall back to a manual-entry form and say so. The result is always a proposal pending human approval.

**Ask This Home** — send the full property context (address, IDs, facts, value, health, systems, ownership periods, all events with verification and visibility, document names) plus the question, and require JSON `{answer, confidence, eventIds, caveat}`. Filter returned `eventIds` to ones that exist before rendering citations. On failure, use the local keyword-match fallback and label it.

**Contractor loop** — homeowner requests work → contractor accepts → contractor submits with document and extracted fields → homeowner accepts → event appends as `PROFESSIONAL_VERIFIED` (or `OWNER_REPORTED` if the contractor is unverified) with the contractor name and license in the metadata, the matching system flips to `EXCELLENT` with a source link, and the chain recomputes. Declining changes nothing on the record.

**Claim gating** — `contributeState(tokenId)` is the single authority. Agent: allowed only when their claim is `active`. Homeowner: allowed only when their home claim is `active`. Contractor: never from a property record (they submit from Jobs). Anything not allowed renders the lock panel and blocks export.

**Toasts** — navy pill, bottom-center, `fadeUp 0.25s`, auto-dismiss at 3.2s.

**Animations** — `spin 0.8s linear infinite` for loaders; `fadeUp` (6px rise + fade) for toasts, modals and success panels; 0.16s for the account menu.

**Responsive** — every multi-column grid uses `repeat(auto-fit, minmax(...))` or `minmax(0, Nfr)` so tracks can actually shrink. Fixed-count `repeat(N, 1fr)` tracks and `nowrap` flex rows inside `overflow: hidden` cards caused repeated overflow bugs in the prototype; avoid both.

## State Management

Everything below is in-memory in the prototype and needs real persistence.

**Session:** `route`, `tab`, `role`, `email`, `password`, `showPw`, `keepSignedIn`, `signingIn`, `loginError`, `acctMenuOpen`.

**Data:** `props` (all properties with nested `events`, `systems`, `ownership`), `contractors`, `jobs`, `chains` (token → event → `{hash, prev}`), `ledgerState` (token → `{valid, checked, at}`).

**Ownership and access:** `claims` (agent stewardship: status, method, MLS/escrow number, agent, claimedAt, expiresAt), `homeClaims` (homeowner verification: status, method, verifiedAt/requestedAt), `homes`, `saved`.

**Commerce:** `plan`, `cycle`, `payGate`, `askUsed`, `subCancelled`, `cancelStage`.

**Drafts and UI:** `query`, `results`, `lookup`, `lookupState`, `provisioning`, `claimDraft`, `claimStage`, `claimBusy`, `claimError`, `askThreads` (per token), `askInput`, `asking`, `addStage`, `upload`, `proposal`, `form`, `subForm`, `subAddress`, `subDoc`, `subExtracting`, `subError`, `reqDraft`, `transferTo`, `transferEmail`, `transferDate`, `transferAck`, `transferResult`, `tlFilter`, `docFilter`, `proQuery`, `trade`, `verifiedOnly`, `activeProId`, `activeDoc`, `toast`, `newEventIds`, `acctEdits`, `pwForm`, `profileEdits`.

**Real data requirements for production:**

**All external integrations are stubbed for this build.** There is no access to real MLS, county or license data yet. Build each one as an interface with a fixture-backed implementation behind it, so swapping in a live provider later is a single class change and touches nothing else. Every stub should be deterministic — same input, same output — and live in one place (e.g. `providers/`), never inlined into UI or business logic.

| Provider | Stub behavior for this build | Real source later |
|---|---|---|
| `ParcelProvider` | Returns fixture parcels for the seeded addresses. `provision(address)` synthesizes a new parcel record with a generated token ID and parcel number, two county events (`PROPERTY_CREATED`, `TAX_ASSESSMENT`), all systems `UNKNOWN`. | County assessor and recorder bulk data |
| `MlsProvider` | `getListing(parcelId)` returns a fixture listing with an MLS number and listing-agent ID. `verifyListingAgent(mlsNumber, agentId)` returns true only when both match the fixture — the mismatch path must be exercisable, since the claim flow's rejection state depends on it. | RESO Web API |
| `PermitProvider` | Returns the fixture permit events already attached to seeded properties. Empty array for provisioned parcels. | Jurisdiction permit portals, where published |
| `DeedProvider` | `ownerOfRecord(parcelId)` returns a name for exactly one fixture property and `null` for everything else, so both the auto-verified match and the proof-of-ownership review path are reachable. | County recorder deed records |
| `LicenseProvider` | `verify(licenseNumber, trade)` returns verified for the fixture licenses and unverified for one contractor, so the `UNVERIFIED` badge and `OWNER_REPORTED` downgrade stay testable. | State licensing boards |
| `DocumentStore` | Writes to local or object storage and returns a real SHA-256 of the bytes. **Do not stub the hashing** — content-addressed hashing is a product guarantee, not an integration. | Same interface, production bucket |

Still real in this build, because they are core rather than integrations:

- **Append-only event store.** Corrections are new events referencing what they supersede — never updates or deletes.
- **Hash chaining.** Real SHA-256 over the canonicalized event, per the spec in Interactions & Behavior.
- **Per-document and per-record-class visibility** (`PUBLIC`, `AUTHENTICATED`, `RESTRICTED`) enforced server-side.
- **Claim and verification state machines,** including expiry. Time-boxed, non-exclusive.
- **Home Health scoring.** Deterministic, no external dependency.

One thing to get right while stubbing: keep the seam at the provider boundary, not at the feature boundary. If claim verification reads `MlsProvider`, the gating logic, the error copy and the expiry rules are all already production code — only the data source is fake.

## Design Tokens

**Colors**

| Token | Hex | Use |
|---|---|---|
| Brand red | `#e4002b` | Primary actions, active tab, accents |
| Brand red hover | `#c60025` | Red button hover |
| Navy | `#0b2c52` | Brand panels, secondary buttons, user bubbles |
| Navy alt | `#12395f` | Logo tile, CTA card |
| Link blue | `#1a4f9c` | Links, token IDs, source-verified text |
| Green | `#12693b` | Verified, approve, health arc |
| Amber | `#8a5a06` | Pending, watch, demo marker |
| Amber dot | `#c98a12` | Demo indicator dot |
| Error red | `#a8102a` | Errors, destructive actions |
| Ink | `#12222f` | Primary text |
| Body | `#3d4a57` | Secondary text |
| Muted | `#5b6875` | Tertiary text |
| Soft | `#7d8a97` | Labels |
| Softer | `#8a95a1` | Eyebrow labels |
| Faint | `#9aa5b1` | Hashes, disabled |
| Page bg | `#f4f6f8` | App background |
| Card bg | `#f8fafb` | Inset panels |
| Border | `#e3e7ec` | Card borders |
| Border light | `#eef1f4` | Internal rules |
| Input border | `#d8dee5` | Form fields |

Status fills: green `#e7f4ec`/`#cfe6d9`, blue `#e8f0fb`/`#cfe0f5`, amber `#fdf3e2`/`#f2dcb4`, amber panel `#fffaf1`, red `#fdecee`/`#f5c2c8`, grey `#eef1f4`/`#f1f3f5`.

**Typography** — `Plus Jakarta Sans` (400–800) for UI, `IBM Plex Mono` (400–500) for token IDs, parcel numbers, hashes and document bodies.

Scale: 58px/800 landing H1 · 38px/800 login H2 and value figures · 36px/800 page H1 · 30–26px/800 section H1 · 21–19px/800 card H2 · 18–17px/700 titles · 16–15px/700 labels · 15–14.5px/400 body · 13.5–13px muted · 12px/700 field labels · 11px/700 `letter-spacing: 0.14–0.18em` eyebrows · 10.5px/700 stat labels · 10.5px mono hashes.

Letter-spacing: `-0.035em` on the largest headings, `-0.03em` at 30–38px, `-0.02em` at 19–26px, `-0.015em` on card titles.

**Spacing** — 4px base. Common: `gap: 8/10/12/16/18/20/22px`; card padding `18px 20px`, `22px 24px`, `26px 28px`, `28px 30px`; section rhythm `margin: 38px 0 18px`; page padding `44px 32px 90px`.

**Radius** — 5–6px badges · 8–9px buttons and small controls · 10px inputs · 11–14px inset panels and rows · 16px cards · 18px hero cards · 999px pills · 50% avatars.

**Shadows** — used sparingly. Dropdown `0 14px 34px #0b2c5226`; toast `0 12px 30px #0b2c5240`; focus ring `2px solid #1a4f9c33`; selected-radio inner `inset 0 0 0 3px #fff`.

**Dot-grid texture** — `radial-gradient(#ffffff1f 1px, transparent 1px)` at `background-size: 22px 22px` on navy panels; `#ffffff26` at 14–18px for photo placeholders.

## Assets

No external image or icon files. Everything is CSS shapes or inline SVG:

- **Logo mark** — rounded tile containing an inline SVG: a red chevron roof (`stroke: #e4002b`, `stroke-width: 2.6`) over an outlined house body with one ledger line inside. White tile with navy strokes on the navy login panel; navy tile with white strokes in the app header.
- **REAL / REMAX lockup** — text `REAL` + two skewed 4×12px bars (`#e4002b`, `#1a4f9c`, `transform: skewX(-18deg)`) + `REMAX`. On the landing page and login only. **Replace with the official brand lockup** from your brand system.
- **Property photos** — navy dot-grid placeholders labelled `PHOTO PLACEHOLDER`. Supply real listing photography.
- **Icons** — `📄`, `🔒`, `✦`, `✓`, `—`, `▾`, `★`, `☆`, and small bordered CSS divs. Swap for your icon set.
- **Fonts** — Google Fonts: Plus Jakarta Sans, IBM Plex Mono.

All property addresses, owner names, contractor names, license numbers, MLS numbers, invoices and dollar figures are fictional.

## Files

- `RE MAX HomeToken.dc.html` — the complete prototype: all 14 screens, all three roles, seeded dataset, hash chaining, Home Health scoring, AI extraction and grounded Q&A. Open directly in a browser.
- `support.js` — prototype runtime only. **Do not port.** It exists solely to run the HTML file in its authoring environment.
