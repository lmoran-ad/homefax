# RE/MAX HomeToken — Monorepo Hackathon Build Plan

> **For Claude Code / agentic workers:** Build this plan in order using the monorepo architecture below. Optimize for a polished, working one-day demo. Do not spend hackathon time on live government, MLS, title, insurance, or contractor integrations. Use seeded data behind provider interfaces so real integrations can be added later without redesigning the application.

**Goal:** Build a modern RE/MAX-branded web application that gives every home a persistent digital identity ("HomeToken") containing a verifiable timeline of ownership periods, sales, repairs, improvements, permits, taxes, inspections, documents, warranties, and other property events, with an AI assistant that can answer questions about the home from its record.

**Primary Demo Story:** An agent logs in, searches for a property, opens its HomeToken, reviews a complete property timeline and Home Health score, asks Claude questions about the home, uploads a repair invoice, has AI extract the work into a proposed property event, approves it, and sees the permanent record update.

**Architecture:** Use a TypeScript monorepo with a separate web application and API service, plus shared packages for database access, contracts, AI, providers, and configuration. PostgreSQL runs locally through Docker Compose for the hackathon and can be replaced by managed PostgreSQL later without changing application code. Treat a HomeToken as an application-level persistent property identity, not cryptocurrency and not legal title. Property history is append-only and tamper-evident using SHA-256 event hashes. External data sources are accessed through provider interfaces; the hackathon implementation uses mock providers and seeded database records.

**Tech Stack:**
- pnpm workspaces
- Turborepo
- TypeScript throughout
- Next.js + React for `apps/web`
- Fastify for `apps/api`
- PostgreSQL
- Drizzle ORM + Drizzle migrations
- Docker Compose for local infrastructure
- Tailwind CSS
- shadcn/ui or similarly fast component library
- Anthropic Claude API
- Zod shared API/domain contracts
- Cookie/JWT demo authentication with a clean auth service interface
- Local filesystem document storage behind a storage adapter for the hackathon
- Future S3-compatible storage adapter
- Vitest for unit/integration tests
- Playwright for the critical end-to-end demo path
- Node `crypto` for SHA-256 ledger hashing

---

# 1. Product Positioning

## Product Name

**RE/MAX HomeToken**

## Tagline

**The Digital Identity of Real Estate**

## Consumer Message

**Know the home before you own the home.**

## Core Idea

Cars have VINs and vehicle-history reports. Homes have addresses, parcel IDs, tax records, permits, repairs, inspections, warranties, sales history, and documents spread across many disconnected systems.

HomeToken creates one persistent digital identity for the property and organizes all known property information into a trusted, understandable record.

The HomeToken persists while:
- owners change;
- agents change;
- contractors change;
- mortgages change;
- listing status changes.

The demo must communicate that HomeToken is a **digital property record**, not a cryptocurrency, NFT, deed replacement, or fractional ownership product.

---

# 2. Hackathon Success Criteria

The hackathon build is successful when a judge can perform this flow without developer assistance:

1. Open the application.
2. Log in as a RE/MAX agent.
3. Search for `123 Main Street, Denver, CO`.
4. See an attractive property summary and unique HomeToken ID.
5. See Home Health score and major-system condition.
6. See tax, sale, permit, repair, inspection, warranty, and ownership-period events on a timeline.
7. Open supporting documents for at least several events.
8. Ask the AI:
   - "When was the roof replaced?"
   - "Has the basement ever had water problems?"
   - "What major systems may need replacement soon?"
9. Receive answers grounded only in that property's HomeToken record, with event/document references.
10. Upload a seeded/demo roofing or HVAC invoice.
11. Claude extracts structured event information from the uploaded document.
12. User reviews the proposed event and approves it.
13. The new event appears in the timeline.
14. The ledger verification indicator remains valid.
15. User can open a simulated transfer screen showing that stewardship of the HomeToken moves to a new owner while the property history remains.
16. The app looks polished enough to present as a product, not a developer prototype.

---

# 3. One-Day Scope

## Must Have

- Agent authentication.
- Property search.
- HomeToken property dashboard.
- Property identity card.
- Home Health score.
- Major systems summary.
- Timeline of property events.
- Verification badges.
- Property tax history.
- Sales history.
- Ownership periods with anonymized owner labels.
- Repairs and improvements.
- Permits.
- Inspections.
- Warranty/document attachments.
- AI "Ask This Home" feature.
- Upload document.
- AI extraction of structured property event.
- Human approval before adding AI-extracted event.
- Append-only property-event ledger.
- SHA-256 event-chain verification.
- Simulated HomeToken stewardship transfer.
- Seeded demo data.
- Responsive desktop-first UI.

## Nice to Have Only If Core Demo Is Complete

- Dark mode.
- Compare two properties.
- QR code linking to public buyer view.
- Public read-only buyer view.
- Contractor-specific account role.
- Printable HomeToken report.
- AI-generated seller disclosure summary.
- Home Health score history chart.
- Search filters beyond address/token ID.

## Explicitly Out of Scope for Hackathon

Do **not** implement these live integrations during the hackathon:

- MLS/RESO.
- County assessor.
- County recorder.
- Property-tax APIs.
- Permit systems.
- Title systems.
- Insurance claim systems.
- Mortgage systems.
- Contractor licensing databases.
- Identity verification/KYC.
- Blockchain networks.
- NFT minting.
- Cryptocurrency.
- Fractional property ownership.
- Legal deed transfer.
- Payment processing.
- Production-grade PII workflows.
- Production authorization across brokers/owners.
- Production document-retention policies.

The application must instead expose provider interfaces for future integrations.

---

# 4. User Roles

## Agent

Primary hackathon role.

Can:
- authenticate;
- search HomeTokens;
- view property details;
- view property history;
- ask AI questions;
- upload documents;
- create owner/agent-reported events;
- approve AI-extracted events;
- initiate simulated transfers.

## Buyer / Public Viewer

For the hackathon this may be implemented as a read-only view if time permits.

Can see:
- public property facts;
- public/authorized timeline events;
- verification status;
- Home Health score;
- major systems;
- public documents;
- AI questions limited to public HomeToken content.

Cannot see:
- hidden owner identity;
- restricted documents;
- internal notes;
- private insurance/title details.

## Property Steward / Owner

Future production role. The hackathon transfer screen should model this relationship even if the full owner portal is not built.

## Administrator

Not required for the primary demo. Seed data can be managed through scripts.

---

# 5. Core Domain Model

## HomeToken

A HomeToken is the permanent application identity assigned to a real property.

Example:

`HT-US-CO-DEN-00001234`

Important:
- It identifies the property record.
- It does not represent legal ownership.
- It does not replace a deed.
- It does not represent a security.
- It does not contain cryptocurrency value.

## Property Event

Everything that happens to a property is represented as an event.

Examples:
- `PROPERTY_CREATED`
- `OWNERSHIP_PERIOD_STARTED`
- `OWNERSHIP_PERIOD_ENDED`
- `SALE`
- `LISTING`
- `TAX_ASSESSMENT`
- `TAX_PAYMENT`
- `PERMIT_ISSUED`
- `PERMIT_FINALIZED`
- `REPAIR`
- `IMPROVEMENT`
- `SYSTEM_INSTALLATION`
- `SYSTEM_SERVICE`
- `INSPECTION`
- `INSURANCE_CLAIM`
- `WARRANTY`
- `DOCUMENT_ADDED`
- `TRANSFER`
- `NOTE`

Events are append-only. Corrections are represented by a new event referencing the event being corrected. Do not mutate historical events after they have been committed to the ledger.

---

# 6. Verification Model

Every event must display a verification level.

```ts
export type VerificationLevel =
  | "SOURCE_VERIFIED"
  | "PROFESSIONAL_VERIFIED"
  | "OWNER_REPORTED"
  | "AI_EXTRACTED_PENDING"
  | "UNVERIFIED";
```

## Display Labels

### SOURCE_VERIFIED
**Source Verified**

Examples:
- government data;
- MLS data;
- title company;
- insurer;
- directly integrated source.

### PROFESSIONAL_VERIFIED
**Professional Verified**

Examples:
- licensed contractor;
- inspector;
- appraiser;
- authenticated agent.

### OWNER_REPORTED
**Owner Reported**

Information submitted by a homeowner without independent verification.

### AI_EXTRACTED_PENDING
**AI Extracted — Pending Verification**

Claude extracted the information from a document. It must not become a final verified event until a human approves it.

### UNVERIFIED
**Unverified**

Imported or historic data whose source cannot currently be verified.

---

# 7. Privacy Rules for the Demo

Never show named prior owners in the public property timeline.

Use:

- `Ownership Period #1`
- `Ownership Period #2`
- `Current Ownership Period`

Store a seeded internal owner name only if necessary for the authenticated demo, but keep the display layer anonymized.

Every document/event should include a visibility value:

```ts
export type Visibility =
  | "PUBLIC"
  | "AUTHENTICATED"
  | "RESTRICTED";
```

For the demo:
- tax/permit/sale information can be `PUBLIC`;
- invoices can be `AUTHENTICATED`;
- simulated title/insurance records can be `RESTRICTED`.

---

# 8. Proposed Database Schema

Use PostgreSQL through the shared `@hometoken/db` package with Drizzle ORM.

## `profiles`

```sql
id uuid primary key references auth.users(id)
display_name text not null
role text not null
brokerage text
created_at timestamptz not null default now()
```

## `properties`

```sql
id uuid primary key
token_id text unique not null
address_line1 text not null
address_line2 text
city text not null
state text not null
postal_code text not null
country_code text not null default 'US'
parcel_id text
latitude numeric
longitude numeric
year_built integer
bedrooms numeric
bathrooms numeric
living_sqft integer
lot_sqft integer
property_type text
current_estimated_value numeric
current_health_score integer
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

## `property_events`

```sql
id uuid primary key
property_id uuid not null references properties(id)
event_type text not null
occurred_at timestamptz not null
title text not null
description text
verification_level text not null
visibility text not null default 'AUTHENTICATED'
source_type text
source_name text
source_reference text
metadata jsonb not null default '{}'::jsonb
supersedes_event_id uuid references property_events(id)
previous_hash text
event_hash text not null
created_by uuid references profiles(id)
created_at timestamptz not null default now()
```

## `property_documents`

```sql
id uuid primary key
property_id uuid not null references properties(id)
event_id uuid references property_events(id)
file_name text not null
storage_path text not null
mime_type text not null
file_size bigint
document_type text
visibility text not null default 'AUTHENTICATED'
sha256 text not null
uploaded_by uuid references profiles(id)
created_at timestamptz not null default now()
```

## `property_systems`

Use this table for the dashboard summary of roof, HVAC, water heater, electrical, plumbing, foundation, solar, etc.

```sql
id uuid primary key
property_id uuid not null references properties(id)
system_type text not null
display_name text not null
status text not null
installed_at date
last_serviced_at date
expected_life_years integer
estimated_remaining_years integer
verification_level text not null
source_event_id uuid references property_events(id)
notes text
updated_at timestamptz not null default now()
```

Suggested statuses:

```ts
export type SystemStatus =
  | "EXCELLENT"
  | "GOOD"
  | "WATCH"
  | "ATTENTION"
  | "UNKNOWN";
```

## `ownership_periods`

```sql
id uuid primary key
property_id uuid not null references properties(id)
sequence_number integer not null
started_at date not null
ended_at date
is_current boolean not null default false
verification_level text not null
created_at timestamptz not null default now()
```

Do not require named owners in the hackathon schema.

## `ai_extraction_jobs`

```sql
id uuid primary key
property_id uuid not null references properties(id)
document_id uuid not null references property_documents(id)
status text not null
extracted_json jsonb
model text
error_message text
created_by uuid references profiles(id)
created_at timestamptz not null default now()
reviewed_at timestamptz
```

Statuses:

```ts
export type ExtractionStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "FAILED";
```

## `token_transfers`

Simulation only for hackathon.

```sql
id uuid primary key
property_id uuid not null references properties(id)
from_steward_label text
to_steward_label text not null
status text not null
initiated_by uuid references profiles(id)
initiated_at timestamptz not null default now()
completed_at timestamptz
transfer_event_id uuid references property_events(id)
```

---

# 9. Event Metadata Shapes

Use discriminated Zod schemas.

## Repair

```ts
{
  eventType: "REPAIR",
  category: "ROOF",
  contractor: "ABC Roofing LLC",
  amount: 18420,
  currency: "USD",
  materials: ["Owens Corning Duration Shingles"],
  warrantyYears: 30,
  permitNumber: "R23-18432"
}
```

## Tax Assessment

```ts
{
  eventType: "TAX_ASSESSMENT",
  taxYear: 2026,
  assessedValue: 612000,
  taxAmount: 4875.32
}
```

## Sale

```ts
{
  eventType: "SALE",
  salePrice: 685000,
  transactionType: "ARMS_LENGTH"
}
```

## Inspection

```ts
{
  eventType: "INSPECTION",
  inspector: "Front Range Home Inspection",
  overallResult: "PASS_WITH_NOTES",
  findings: [
    "Minor grading concern on north side",
    "Water heater approaching expected service interval"
  ]
}
```

---

# 10. Tamper-Evident Ledger

The hackathon should not use a blockchain.

Use an append-only SHA-256 hash chain.

For each property, events are sorted deterministically by:
1. `created_at`;
2. `id`.

The first event uses:

```text
previousHash = "GENESIS"
```

Canonical event hash input:

```ts
type CanonicalLedgerEvent = {
  id: string;
  propertyId: string;
  eventType: string;
  occurredAt: string;
  title: string;
  description: string | null;
  verificationLevel: string;
  sourceType: string | null;
  sourceReference: string | null;
  metadata: unknown;
  previousHash: string;
};
```

Hash:

```ts
sha256(JSON.stringify(canonicalEvent))
```

Create:

```ts
export function computeEventHash(event: CanonicalLedgerEvent): string;
export async function verifyPropertyLedger(propertyId: string): Promise<{
  valid: boolean;
  checkedEvents: number;
  invalidEventId?: string;
}>;
```

The property dashboard must display:

**Ledger Verified**
`24 events checked`

If verification fails:

**Ledger Integrity Warning**

For the hackathon seed, all ledgers must validate.

---

# 11. Home Health Score

The score is a product/demo concept and must be clearly labeled as informational.

Range: `0–100`.

Do not use Claude to generate the numeric score. Make the calculation deterministic.

System weights:

```ts
const SYSTEM_WEIGHTS = {
  roof: 20,
  hvac: 20,
  electrical: 15,
  plumbing: 15,
  waterHeater: 10,
  foundation: 15,
  other: 5,
};
```

Status multipliers:

```ts
const STATUS_MULTIPLIERS = {
  EXCELLENT: 1,
  GOOD: 0.85,
  WATCH: 0.6,
  ATTENTION: 0.3,
  UNKNOWN: 0.5,
};
```

Calculate weighted score and round to integer.

Example demo property:

**Home Health: 92 / 100**

The UI should explain:
- this is based on available HomeToken records;
- missing records reduce confidence;
- it is not a home inspection or appraisal.

Also calculate:

```ts
type HealthScoreResult = {
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  knownSystems: number;
  totalSystems: number;
};
```

---

# 11.5. Monorepo Infrastructure Decisions

## Database

Use PostgreSQL locally through Docker Compose.

Use Drizzle ORM for:
- schema definitions;
- migrations;
- queries;
- transactions.

The API is the only runtime service allowed to access the database directly.

## Document Storage

For the one-day demo use local filesystem storage through an interface:

```ts
export interface StorageProvider {
  put(input: {
    key: string;
    bytes: Buffer;
    contentType: string;
  }): Promise<{ key: string; sha256: string }>;

  get(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;
}
```

Hackathon implementation:

```text
LocalStorageProvider
```

Future implementations:

```text
S3StorageProvider
AzureBlobStorageProvider
GoogleCloudStorageProvider
```

Never expose absolute filesystem paths to the browser.

## API Contracts

All public request/response contracts belong in `packages/contracts`.

Example:

```ts
export const PropertySearchRequestSchema = z.object({
  q: z.string().min(2).max(200),
});

export const PropertySearchResultSchema = z.object({
  tokenId: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  estimatedValue: z.number().nullable(),
  healthScore: z.number().int().min(0).max(100).nullable(),
});
```

Frontend code imports these shared types/schemas rather than duplicating API DTOs.

---

# 12. External Data Provider Architecture

Create interfaces now even though the hackathon uses mock data.

Directory:

```text
src/lib/providers/
  types.ts
  property-provider.ts
  tax-provider.ts
  permit-provider.ts
  transaction-provider.ts
  insurance-provider.ts
  mock/
    mock-property-provider.ts
    mock-tax-provider.ts
    mock-permit-provider.ts
    mock-transaction-provider.ts
    mock-insurance-provider.ts
```

Example interface:

```ts
export interface TaxProvider {
  getTaxHistory(input: {
    parcelId: string;
  }): Promise<TaxRecord[]>;
}
```

```ts
export interface PermitProvider {
  getPermitHistory(input: {
    parcelId: string;
  }): Promise<PermitRecord[]>;
}
```

```ts
export interface TransactionProvider {
  getTransactionHistory(input: {
    parcelId: string;
  }): Promise<TransactionRecord[]>;
}
```

The UI and domain logic must not import mock provider files directly.

Use factory functions:

```ts
export function getTaxProvider(): TaxProvider;
export function getPermitProvider(): PermitProvider;
export function getTransactionProvider(): TransactionProvider;
```

For the hackathon these factories return mock implementations.

Future integrations can replace the factory implementation without changing page components.

---

# 13. Application Routes / Pages

Use App Router.

```text
/
  Landing / login redirect

/login
  Agent login

/dashboard
  Agent home
  Search field
  Recent demo properties

/properties
  Search results

/properties/[tokenId]
  HomeToken overview

/properties/[tokenId]/timeline
  Full timeline

/properties/[tokenId]/documents
  Documents

/properties/[tokenId]/ask
  Ask This Home

/properties/[tokenId]/add-record
  Add property record / upload document

/properties/[tokenId]/transfer
  Simulated HomeToken transfer
```

The core demo should work with direct navigation as well as UI links.

---

# 14. UI Design

Aim for modern real-estate SaaS, not blockchain styling.

Avoid:
- crypto coins;
- chains;
- neon cyberpunk;
- wallet language;
- NFT language.

Use:
- RE/MAX-inspired branding;
- white/light-neutral backgrounds;
- strong typography;
- clean cards;
- subtle status colors;
- property photography;
- timeline visuals;
- clear verification badges.

## Global Navigation

Desktop sidebar or top navigation:

- Home
- Properties
- Search
- Saved
- Account

For hackathon scope, Saved may be visually present but does not require advanced functionality.

## Property Hero

Display:

- property photo;
- full address;
- HomeToken ID;
- current estimated value;
- property facts;
- Home Health score;
- verification state;
- buttons:
  - Ask This Home
  - Add Record
  - Transfer HomeToken

Example:

```text
123 Main Street
Denver, CO 80206

HomeToken
HT-US-CO-DEN-00001234

$685,000 Estimated Value

4 Bed • 3 Bath • 2,880 sqft • Built 1994

Home Health
92 / 100

✓ Ledger Verified
24 events checked
```

## Major Systems Cards

Show:
- Roof
- HVAC
- Water Heater
- Electrical
- Plumbing
- Foundation

Each card contains:
- status;
- install date;
- last service date if known;
- estimated remaining life;
- verification badge;
- link to source event.

## Timeline

Filters:
- All
- Ownership
- Sales
- Repairs
- Improvements
- Permits
- Inspections
- Taxes
- Documents

Timeline card example:

```text
May 14, 2023
Roof Replacement

ABC Roofing LLC
$18,420

Owens Corning Duration shingles installed.
Permit R23-18432

✓ Professional Verified

Invoice • Permit • Final Inspection
```

---

# 15. Search

The search bar accepts:
- full/partial address;
- HomeToken ID;
- parcel ID.

Create:

```ts
export async function searchProperties(
  query: string
): Promise<PropertySearchResult[]>;
```

Seed enough records that entering:
- `123 Main`
- `Denver`
- `HT-US-CO-DEN-00001234`

returns useful results.

Do not build Elasticsearch for the hackathon. Use Postgres `ilike` queries.

---

# 16. AI Feature: Ask This Home

This is the centerpiece of the demo.

## Requirement

Claude may answer only from the selected HomeToken's supplied record context.

Never allow Claude to invent a repair, claim, permit, sale, inspection, or other fact.

## Flow

1. User opens Ask This Home.
2. Server loads:
   - property facts;
   - relevant property events;
   - systems;
   - available document summaries.
3. Convert records to compact structured context.
4. Send property context + user question to Claude.
5. Claude returns:
   - concise answer;
   - confidence;
   - referenced event IDs;
   - note when information is absent.
6. UI renders citations as clickable HomeToken event references.

## Structured Response

```ts
export const HomeAnswerSchema = z.object({
  answer: z.string(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  eventIds: z.array(z.string()),
  caveat: z.string().nullable(),
});
```

## System Prompt

```text
You are HomeToken AI, an assistant that answers questions about one specific
property using only the HomeToken record provided to you.

Rules:
1. Never use outside knowledge to invent property facts.
2. Never infer that an event did not occur merely because it is absent.
3. When the record has no evidence for the question, say that the available
   HomeToken record does not contain that information.
4. Distinguish verified records from owner-reported or unverified records.
5. Refer to supporting HomeToken event IDs.
6. Do not provide legal, inspection, appraisal, insurance, or engineering
   conclusions.
7. Keep answers useful to a home buyer or real-estate agent.
8. Return valid JSON matching the supplied schema.
```

## Required Demo Questions

Seed the property so these produce impressive answers:

### Question
`When was the roof replaced?`

Expected content:
- May 14, 2023;
- ABC Roofing LLC;
- $18,420;
- permit number;
- warranty;
- verification status.

### Question
`Has the basement ever had water problems?`

Expected content:
- June 2018 water-intrusion repair;
- source identifies grading issue;
- July 2018 drainage/grading improvement;
- explicitly state there is no basis to claim "never flooded."

### Question
`What major systems may need replacement soon?`

Expected content:
- identify any system in WATCH status;
- use system age/remaining-life fields;
- state that this is based on recorded information, not an inspection.

---

# 17. AI Feature: Document Extraction

The second major demo moment.

## Upload Flow

1. Agent clicks **Add Record**.
2. Upload PDF/image/text receipt or invoice.
3. Save the original file through the configured `StorageProvider`.
4. Create `property_documents` record.
5. Run Claude extraction.
6. Display extracted structured data as a review form.
7. User may edit extracted values.
8. User clicks **Approve & Add to HomeToken**.
9. Server validates data.
10. Server creates append-only `property_event`.
11. Event starts as `OWNER_REPORTED` or `PROFESSIONAL_VERIFIED` depending on demo workflow.
12. Link document to event.
13. Recompute relevant `property_systems` summary when applicable.
14. Verify ledger.
15. Redirect to newly created timeline event.

## Extraction Schema

```ts
export const ExtractedPropertyEventSchema = z.object({
  suggestedEventType: z.enum([
    "REPAIR",
    "IMPROVEMENT",
    "SYSTEM_INSTALLATION",
    "SYSTEM_SERVICE",
    "INSPECTION",
    "WARRANTY",
    "DOCUMENT_ADDED",
  ]),
  title: z.string(),
  description: z.string(),
  occurredAt: z.string().nullable(),
  contractor: z.string().nullable(),
  amount: z.number().nullable(),
  currency: z.string().default("USD"),
  category: z.string().nullable(),
  materials: z.array(z.string()).default([]),
  warrantyYears: z.number().nullable(),
  permitNumber: z.string().nullable(),
  systemType: z.string().nullable(),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  evidence: z.array(z.string()),
});
```

## Extraction Prompt

```text
Extract property-maintenance or improvement information from this document.

Do not guess values that are not present.
Use null for unknown scalar values and [] for unknown lists.
Return only JSON matching the requested schema.

Treat dates, contractor names, amounts, materials, warranties, permit numbers,
and installed systems as factual only when supported by the document.

The extracted record is a proposal for human review and must not be described
as verified solely because AI extracted it.
```

---

# 18. Manual Add Record

If document extraction is unavailable during the live demo, the application must still allow a user to create a record manually.

Fields:
- event type;
- title;
- date;
- description;
- category/system;
- contractor/source;
- amount;
- verification level;
- visibility;
- supporting document.

The manual path makes the demo resilient if an external AI call fails.

---

# 19. HomeToken Transfer Simulation

Do not represent this as legal title transfer.

Copy:

**Transfer HomeToken Stewardship**

Explanation:

> The HomeToken history remains attached to the property. This demo transfers
> administration of the digital property record; legal ownership remains
> governed by the deed/title process.

## Flow

1. Display property/token.
2. Current steward label.
3. New steward label/email field.
4. Checkbox acknowledging this is a simulated digital-record transfer.
5. Confirm.
6. Create `token_transfers` record.
7. Append `TRANSFER` event to property ledger.
8. Show success screen.

Success:

```text
HomeToken Stewardship Transferred

123 Main Street
HT-US-CO-DEN-00001234

Property history retained.
New stewardship period created.
Ledger verified.
```

---

# 20. Seed Data

Create at least 10 properties.

One showcase property must be very detailed:

## Showcase Property

**123 Main Street, Denver, CO 80206**

```text
Token: HT-US-CO-DEN-00001234
Parcel: DEN-1234-567-89
Built: 1994
Bedrooms: 4
Bathrooms: 3
Living Area: 2,880 sqft
Lot: 7,500 sqft
Estimated Value: $685,000
Home Health: approximately 92
```

Suggested timeline:

```text
1994-06-01  Property record created
1994-08-14  Ownership Period #1 begins
2004-04-03  Roof replacement
2008-07-18  Sale - $379,000
2008-07-18  Ownership Period #2 begins
2012-09-10  HVAC installation
2014-03-22  Water-damage claim record (restricted/mock)
2016-05-04  Basement remodel permit
2016-06-18  Basement remodel completed
2018-06-10  Basement water-intrusion repair
2018-07-02  Exterior grading/drainage improvement
2019-10-11  Sale - $515,000
2019-10-11  Ownership Period #3 begins
2021-03-15  Electrical panel upgraded to 200A
2022-08-05  HVAC service
2023-05-14  Roof replacement - $18,420
2023-05-14  Roof warranty - 30 years
2023-05-15  Roof permit finalized
2024-02-09  Water heater replacement
2024-09-01  Tax assessment
2025-09-01  Tax assessment
2026-04-12  HVAC service
2026-08-01  Tax assessment
2026-08-20  Pre-listing inspection
```

Create realistic documents for at least:
- 2023 roof invoice;
- 2023 permit;
- 2023 warranty;
- 2018 water-intrusion repair;
- 2021 electrical upgrade;
- 2024 water-heater invoice;
- 2026 inspection summary.

Documents may be simple seeded PDFs/text files generated for the demo.

## Additional Properties

Seed nine additional Denver/Colorado properties with lighter event histories so search results feel real.

Use obviously fictional people/companies or neutral demo names.

---

# 21. Recommended Monorepo Structure

Use pnpm workspaces + Turborepo.

```text
hometoken/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── docker-compose.yml
│
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── playwright.config.ts
│   │   ├── public/
│   │   │   └── demo/
│   │   │       └── properties/
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx
│   │       │   ├── login/
│   │       │   ├── dashboard/
│   │       │   └── properties/
│   │       │       ├── page.tsx
│   │       │       └── [tokenId]/
│   │       │           ├── page.tsx
│   │       │           ├── timeline/
│   │       │           ├── documents/
│   │       │           ├── ask/
│   │       │           ├── add-record/
│   │       │           └── transfer/
│   │       ├── components/
│   │       ├── features/
│   │       └── lib/
│   │           └── api-client.ts
│   │
│   └── api/
│       ├── package.json
│       └── src/
│           ├── server.ts
│           ├── app.ts
│           ├── plugins/
│           │   ├── auth.ts
│           │   ├── cors.ts
│           │   └── error-handler.ts
│           ├── routes/
│           │   ├── auth.ts
│           │   ├── properties.ts
│           │   ├── events.ts
│           │   ├── documents.ts
│           │   ├── ask-home.ts
│           │   ├── extraction.ts
│           │   ├── ledger.ts
│           │   └── transfers.ts
│           └── services/
│               ├── property-service.ts
│               ├── event-service.ts
│               ├── document-service.ts
│               ├── health-service.ts
│               ├── ledger-service.ts
│               ├── ask-home-service.ts
│               ├── extraction-service.ts
│               └── transfer-service.ts
│
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   └── src/
│   │       ├── client.ts
│   │       ├── schema/
│   │       │   ├── profiles.ts
│   │       │   ├── properties.ts
│   │       │   ├── property-events.ts
│   │       │   ├── property-documents.ts
│   │       │   ├── property-systems.ts
│   │       │   ├── ownership-periods.ts
│   │       │   ├── ai-extraction-jobs.ts
│   │       │   └── token-transfers.ts
│   │       ├── migrations/
│   │       └── seed/
│   │           ├── index.ts
│   │           └── showcase-property.ts
│   │
│   ├── contracts/
│   │   ├── package.json
│   │   └── src/
│   │       ├── auth.ts
│   │       ├── property.ts
│   │       ├── event.ts
│   │       ├── document.ts
│   │       ├── ai.ts
│   │       ├── transfer.ts
│   │       └── index.ts
│   │
│   ├── ai/
│   │   ├── package.json
│   │   └── src/
│   │       ├── client.ts
│   │       ├── ask-home.ts
│   │       ├── extract-document.ts
│   │       └── prompts/
│   │
│   ├── providers/
│   │   ├── package.json
│   │   └── src/
│   │       ├── contracts/
│   │       │   ├── tax-provider.ts
│   │       │   ├── permit-provider.ts
│   │       │   ├── transaction-provider.ts
│   │       │   ├── insurance-provider.ts
│   │       │   └── storage-provider.ts
│   │       ├── mock/
│   │       │   ├── mock-tax-provider.ts
│   │       │   ├── mock-permit-provider.ts
│   │       │   ├── mock-transaction-provider.ts
│   │       │   └── mock-insurance-provider.ts
│   │       ├── storage/
│   │       │   └── local-storage-provider.ts
│   │       └── index.ts
│   │
│   ├── auth/
│   │   ├── package.json
│   │   └── src/
│   │       ├── password.ts
│   │       ├── session.ts
│   │       └── tokens.ts
│   │
│   ├── ledger/
│   │   ├── package.json
│   │   └── src/
│   │       ├── canonicalize.ts
│   │       ├── hash.ts
│   │       └── verify.ts
│   │
│   └── config/
│       ├── package.json
│       └── src/
│           └── env.ts
│
├── scripts/
│   └── generate-demo-documents.ts
│
├── storage/
│   └── demo-uploads/
│
└── tests/
    └── e2e/
        └── demo-flow.spec.ts
```

## Monorepo Boundaries

### `apps/web`
Only responsible for:
- pages;
- presentation;
- browser state;
- calling the API;
- rendering property data.

It must not talk directly to PostgreSQL.

### `apps/api`
Owns:
- authentication;
- authorization;
- business orchestration;
- property queries;
- writes;
- document workflows;
- AI workflows;
- transfers;
- ledger verification.

### `packages/db`
Owns:
- PostgreSQL connection;
- Drizzle schema;
- migrations;
- seed data;
- repositories/query helpers.

Neither UI components nor Claude prompts belong here.

### `packages/contracts`
Owns shared:
- Zod schemas;
- request/response types;
- enums;
- DTOs.

Both `apps/web` and `apps/api` depend on these contracts.

### `packages/ai`
Owns:
- Anthropic client;
- prompts;
- structured-output parsing;
- AI-specific retry logic.

It must not query PostgreSQL directly.

### `packages/providers`
Owns external-system interfaces and implementations.

Hackathon:
- mock tax provider;
- mock permit provider;
- mock transaction provider;
- mock insurance provider;
- local document storage provider.

Future:
- county integrations;
- RESO/MLS;
- title;
- insurer;
- S3/storage;
- contractor systems.

### `packages/auth`
Owns password/session/JWT helpers for the demo.

Future SSO/OIDC/Okta can replace the implementation without changing route contracts.

### `packages/ledger`
Owns:
- canonical event serialization;
- SHA-256 hashing;
- chain verification.

This package must have no HTTP/UI dependency.

---

# 22. Environment Variables

`.env.example`

```bash
APP_NAME="RE/MAX HomeToken"
NODE_ENV=development
DEMO_MODE=true

WEB_PORT=3000
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
API_BASE_URL=http://localhost:4000

DATABASE_URL=postgresql://hometoken:hometoken@localhost:5432/hometoken

AUTH_JWT_SECRET=replace-with-local-dev-secret
DEMO_AGENT_EMAIL=agent@hometoken.demo
DEMO_AGENT_PASSWORD=demo-password

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./storage/demo-uploads
```

Do not hard-code production secrets.

When `DEMO_MODE=true`:
- mock external providers are used;
- the seeded demo agent account is enabled;
- the app displays a subtle `Demo Data` indicator;
- uploaded documents are stored through the local storage provider;
- no external government/MLS/title/insurance calls occur.

## Docker Compose

The hackathon should require only PostgreSQL as infrastructure.

Example:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: hometoken
      POSTGRES_USER: hometoken
      POSTGRES_PASSWORD: hometoken
    ports:
      - "5432:5432"
    volumes:
      - hometoken_postgres:/var/lib/postgresql/data

volumes:
  hometoken_postgres:
```

Do not add Redis, Kafka, Elasticsearch, Kubernetes, or other infrastructure for the one-day demo.

---

# 23. API Service

Exact transport can be Route Handlers or server actions, but keep business logic in feature modules.

Required capabilities:

```text
GET  /api/properties/search?q=
GET  /api/properties/:tokenId
GET  /api/properties/:tokenId/events
POST /api/properties/:tokenId/events
POST /api/properties/:tokenId/documents
POST /api/properties/:tokenId/extractions
POST /api/properties/:tokenId/extractions/:id/approve
POST /api/properties/:tokenId/ask
POST /api/properties/:tokenId/transfers
GET  /api/properties/:tokenId/ledger/verify
```

Every write endpoint must:
- authenticate;
- validate request with Zod;
- verify the property exists;
- perform server-side authorization;
- return structured errors.

---

# 24. Error Handling

Use a shared application error shape:

```ts
export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

Required user-facing states:
- property not found;
- invalid token ID;
- no search results;
- AI temporarily unavailable;
- document extraction failed;
- unsupported document type;
- ledger verification failed;
- upload failed;
- unauthorized;
- session expired.

For the live demo, AI failure must not break the property dashboard or manual record creation.

---

# 25. Authentication

Do not use demo authentication.

For the hackathon, implement a minimal authentication service inside the monorepo:

- seeded agent account;
- password hashed with a standard password hashing library;
- login endpoint in `apps/api`;
- secure HTTP-only session cookie or signed JWT cookie;
- auth middleware for protected API routes;
- role stored in the profile/user record.

Suggested demo identity:

```text
Alex Morgan
RE/MAX Demo Agent
agent@hometoken.demo
```

Required API:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Keep the authentication boundary replaceable.

Future production integrations may use:
- Okta;
- Microsoft Entra ID;
- RE/MAX identity/SSO;
- OIDC/SAML provider.

Do not spend hackathon time implementing enterprise SSO.

---

# 26. Security / Product Guardrails

Even in demo code:

- keep Anthropic key server-side;
- validate all structured AI output;
- escape/render user content safely;
- limit uploads by MIME type and size;
- do not allow public access to restricted documents;
- never claim HomeToken replaces legal title;
- never claim Home Health is an inspection;
- never call AI-extracted content verified until human approval;
- never display prior owners publicly by name;
- never expose raw restricted event metadata to buyer/public routes.

---

# 27. Testing Strategy

Prioritize tests that protect the demo.

## Unit Test: Ledger

Test:
1. genesis event hash;
2. second event includes previous event hash;
3. valid chain returns `valid: true`;
4. altered event data returns `valid: false`.

## Unit Test: Health Score

Test known system statuses produce deterministic score.

Example:

```ts
expect(
  calculateHealthScore([
    { type: "roof", status: "EXCELLENT" },
    { type: "hvac", status: "GOOD" },
    { type: "electrical", status: "EXCELLENT" },
    { type: "plumbing", status: "GOOD" },
    { type: "waterHeater", status: "EXCELLENT" },
    { type: "foundation", status: "EXCELLENT" },
    { type: "other", status: "GOOD" },
  ]).score
).toBeGreaterThanOrEqual(85);
```

## Unit Test: AI Schemas

Validate:
- proper Ask This Home JSON passes;
- malformed responses fail;
- extraction output with missing optional fields passes;
- unsupported event type fails.

## End-to-End Test

Playwright critical path:

```text
login
→ search 123 Main
→ open property
→ verify token ID
→ verify timeline
→ open Ask This Home
→ ask roof question
→ receive answer
→ navigate Add Record
→ upload demo invoice
→ review extraction
→ approve event
→ verify new timeline event
→ verify ledger indicator
```

If testing AI live is unstable, intercept/mock Claude only in automated tests. The actual demo should use Claude live with a graceful fallback.

---

# 28. Implementation Tasks

## Task 1 — Scaffold Monorepo and Demo Shell

**Deliverable:** Running Next.js app with app shell, branding, environment validation, and test configuration.

### Steps

- [ ] Create pnpm workspace and Turborepo configuration.
- [ ] Create `apps/web` as a Next.js TypeScript application.
- [ ] Create `apps/api` as a Fastify TypeScript service.
- [ ] Create shared packages: `db`, `contracts`, `ai`, `providers`, `auth`, `ledger`, `config`.
- [ ] Add `docker-compose.yml` with PostgreSQL.
- [ ] Configure Tailwind.
- [ ] Add shadcn/ui or selected component library.
- [ ] Add Zod, Fastify, Drizzle ORM, PostgreSQL driver, Anthropic SDK, Vitest, and Playwright.
- [ ] Create `.env.example`.
- [ ] Create shared environment validation in `packages/config` validating required server/client variables.
- [ ] Create global app shell and navigation.
- [ ] Create branded login and dashboard placeholder pages.
- [ ] Add a basic Vitest smoke test.
- [ ] Run lint/typecheck/tests.
- [ ] Commit: `chore: scaffold HomeToken demo`

Acceptance:
- `pnpm dev` starts web and API;
- PostgreSQL starts with Docker Compose;
- app starts;
- no TypeScript errors;
- shell looks presentable;
- test command succeeds.

---

## Task 2 — Database Schema and Seeded Property Dataset

**Deliverable:** PostgreSQL contains the complete showcase property plus nine lighter demo properties.

### Steps

- [ ] Define Drizzle schema files in `packages/db/src/schema/`.
- [ ] Generate/create the initial migration in `packages/db/src/migrations/001_initial_schema.sql`.
- [ ] Add indexes for `token_id`, address fields, `parcel_id`, `property_id`, and event dates.
- [ ] Add TypeScript domain types.
- [ ] Implement seed generation.
- [ ] Seed the showcase property.
- [ ] Seed all timeline events.
- [ ] Seed system summaries.
- [ ] Seed ownership periods.
- [ ] Seed tax/sale/permit data as events.
- [ ] Seed nine additional properties.
- [ ] Generate demo documents.
- [ ] Start PostgreSQL with Docker Compose.
- [ ] Run migrations and seed from a clean database.
- [ ] Verify property/event counts.
- [ ] Commit: `feat: add HomeToken data model and demo data`

Acceptance:
- showcase property can be queried by token ID;
- at least 10 properties exist;
- showcase property has at least 20 events.

---

## Task 3 — Ledger Hashing

**Deliverable:** Every property event can be chained and verified.

### Steps

- [ ] Write failing ledger unit tests.
- [ ] Implement deterministic metadata serialization.
- [ ] Implement `computeEventHash`.
- [ ] Implement append-event logic obtaining the previous hash.
- [ ] Implement `verifyPropertyLedger`.
- [ ] Create utility to backfill hashes for seed events.
- [ ] Run ledger tests.
- [ ] Verify showcase ledger.
- [ ] Commit: `feat: add tamper-evident property ledger`

Acceptance:
- valid chain passes;
- modified historical event fails verification;
- dashboard can request verification result.

---

## Task 4 — Authentication and Property Search

**Deliverable:** Agent can log in and find HomeTokens.

### Steps

- [ ] Implement the demo authentication service and seeded agent account.
- [ ] Create demo user profile.
- [ ] Protect dashboard/property mutation routes.
- [ ] Implement `searchProperties`.
- [ ] Search address, token ID, parcel ID using Postgres.
- [ ] Create search component.
- [ ] Create search result cards.
- [ ] Add recent/demo properties to dashboard.
- [ ] Add no-results/error states.
- [ ] Add test for search query.
- [ ] Commit: `feat: add agent login and property search`

Acceptance:
- `123 Main` finds showcase property;
- token ID finds showcase property;
- unauthenticated mutation route is rejected.

---

## Task 5 — HomeToken Property Dashboard

**Deliverable:** Showcase page is visually compelling enough for judging.

### Steps

- [ ] Build property hero.
- [ ] Build token identity badge.
- [ ] Build Home Health card.
- [ ] Build major-system cards.
- [ ] Build recent timeline preview.
- [ ] Build tax/sales summary.
- [ ] Build verification legend.
- [ ] Build ledger status.
- [ ] Add property navigation.
- [ ] Add loading/not-found states.
- [ ] Verify responsive desktop layout.
- [ ] Commit: `feat: build HomeToken property dashboard`

Acceptance:
- judge understands the product from this screen alone;
- token, health, major systems, recent history, and verification state are visible.

---

## Task 6 — Full Property Timeline and Documents

**Deliverable:** Complete browsable history with supporting evidence.

### Steps

- [ ] Build event timeline component.
- [ ] Add category filters.
- [ ] Build verification badge component.
- [ ] Build event details card/drawer.
- [ ] Show source name/reference.
- [ ] Link event documents.
- [ ] Create documents page.
- [ ] Enforce document visibility.
- [ ] Add empty/error states.
- [ ] Commit: `feat: add verified property timeline`

Acceptance:
- all showcase events are browsable;
- roof record exposes invoice/permit/warranty;
- restricted document does not appear in public mode.

---

## Task 7 — Home Health Calculation

**Deliverable:** Deterministic score and system risk summary.

### Steps

- [ ] Write failing health-score tests.
- [ ] Implement system weights.
- [ ] Implement status multipliers.
- [ ] Implement confidence calculation.
- [ ] Display score explanation.
- [ ] Display informational disclaimer.
- [ ] Update seeded systems until showcase property is approximately 92.
- [ ] Run unit tests.
- [ ] Commit: `feat: add HomeToken health score`

Acceptance:
- score is deterministic;
- score is not generated by AI;
- UI explains available-record dependency.

---

## Task 8 — Ask This Home

**Deliverable:** Claude answers questions grounded in the property record.

### Steps

- [ ] Create compact property-context builder.
- [ ] Create `HomeAnswerSchema`.
- [ ] Implement server-side Claude client.
- [ ] Add system prompt from this plan.
- [ ] Implement question endpoint/action.
- [ ] Validate Claude JSON output.
- [ ] Add retry once for invalid structured output.
- [ ] Create Ask This Home UI.
- [ ] Render confidence.
- [ ] Resolve returned event IDs into clickable citations.
- [ ] Add graceful AI-unavailable state.
- [ ] Test the three required questions against showcase data.
- [ ] Commit: `feat: add grounded Ask This Home assistant`

Acceptance:
- roof question returns 2023 replacement facts;
- basement question describes recorded water intrusion without claiming no flooding;
- replacement-soon question uses recorded systems only.

---

## Task 9 — Document Upload and AI Extraction

**Deliverable:** Uploading a demo invoice creates an editable AI-generated proposal.

### Steps

- [ ] Configure the `StorageProvider` abstraction and local private upload directory.
- [ ] Add document MIME/size validation.
- [ ] Save uploaded document metadata and SHA-256.
- [ ] Create extraction job.
- [ ] Create `ExtractedPropertyEventSchema`.
- [ ] Call Claude with extraction prompt.
- [ ] Validate structured response.
- [ ] Save extraction result.
- [ ] Build extraction review form.
- [ ] Allow user to edit all extracted fields.
- [ ] Keep extraction as pending until approval.
- [ ] Add manual fallback form.
- [ ] Commit: `feat: add AI document extraction`

Acceptance:
- demo invoice becomes a structured proposal;
- AI does not silently create a permanent event;
- manual path works without Claude.

---

## Task 10 — Approve Event and Update Ledger

**Deliverable:** Reviewed extraction becomes a new permanent HomeToken event.

### Steps

- [ ] Create approval transaction.
- [ ] Validate reviewed event.
- [ ] Create append-only event.
- [ ] Link document to event.
- [ ] Update relevant property-system summary.
- [ ] Mark extraction job approved.
- [ ] Verify ledger after append.
- [ ] Redirect to timeline/event.
- [ ] Display success toast/state.
- [ ] Add test for approved event.
- [ ] Commit: `feat: add verified record approval workflow`

Acceptance:
- new repair appears immediately;
- linked source document is visible;
- ledger remains valid.

---

## Task 11 — HomeToken Transfer Simulation

**Deliverable:** Demo proves the digital history survives property stewardship changes.

### Steps

- [ ] Build transfer page.
- [ ] Add explicit legal-title disclaimer.
- [ ] Validate new steward label.
- [ ] Create transfer record.
- [ ] Append `TRANSFER` ledger event.
- [ ] End current ownership period.
- [ ] Start new anonymized ownership period.
- [ ] Show success screen.
- [ ] Verify ledger.
- [ ] Commit: `feat: add HomeToken stewardship transfer demo`

Acceptance:
- history remains;
- new transfer event appears;
- ownership periods update;
- copy never claims legal title transferred.

---

## Task 12 — Demo Polish and Reliability

**Deliverable:** Stable presentation-quality build.

### Steps

- [ ] Replace placeholder copy.
- [ ] Add loading skeletons.
- [ ] Add error boundaries.
- [ ] Add empty states.
- [ ] Add property imagery.
- [ ] Make verification badges visually distinct.
- [ ] Add `Demo Data` label.
- [ ] Run lint.
- [ ] Run typecheck.
- [ ] Run unit tests.
- [ ] Run Playwright demo-flow test.
- [ ] Run production build.
- [ ] Perform demo flow manually.
- [ ] Fix every issue encountered.
- [ ] Commit: `chore: polish HomeToken hackathon demo`

Acceptance:
- production build succeeds;
- critical demo path succeeds twice consecutively;
- AI outage does not destroy the rest of the demo.

---

# 29. Suggested One-Day Build Order

This is priority order, not a promise of exact duration.

## Phase A — Foundation

Build:
- project shell;
- database;
- seed;
- property search;
- property dashboard.

At the end of this phase the product must already be demoable as a read-only HomeToken.

## Phase B — "Wow" Features

Build:
- timeline;
- Home Health;
- Ask This Home;
- document upload/extraction;
- approval.

This is the core innovation.

## Phase C — Story Completion

Build:
- ledger verification indicator;
- HomeToken transfer;
- additional UI polish;
- automated demo-flow test.

## Cut Order If Time Runs Short

Cut features in this order:

1. Saved properties.
2. Public buyer route.
3. QR code.
4. Compare properties.
5. Dark mode.
6. Advanced dashboard analytics.
7. Transfer UI polish.

Never cut:
- property search;
- detailed token page;
- timeline;
- verification status;
- Ask This Home;
- upload/extraction;
- approval flow.

---

# 29.5. Required Root Commands

Root `package.json` should expose:

```json
{
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "playwright test",
    "db:up": "docker compose up -d postgres",
    "db:down": "docker compose down",
    "db:migrate": "pnpm --filter @hometoken/db migrate",
    "db:seed": "pnpm --filter @hometoken/db seed",
    "db:reset": "pnpm --filter @hometoken/db reset"
  }
}
```

A new developer should be able to run the demo with:

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

---

# 30. Demo Script

Use this exact narrative for the live presentation.

## Scene 1 — The Problem

> A home may be the largest purchase someone makes, but its history is
> fragmented across MLS systems, counties, contractors, homeowners,
> inspectors, insurers, receipts, emails, and filing cabinets.

> Cars have VINs. We believe homes should have a persistent digital identity.

## Scene 2 — Search

Log in.

Search:

`123 Main Street`

Open result.

## Scene 3 — HomeToken

Show:

`HT-US-CO-DEN-00001234`

Explain:

> This token is not cryptocurrency and it is not the deed. It is the
> persistent digital identity of the property.

Show:
- Home Health 92;
- major systems;
- Ledger Verified;
- recent history.

## Scene 4 — Property History

Open timeline.

Highlight:
- 2018 water intrusion;
- 2018 grading correction;
- 2021 electrical upgrade;
- 2023 roof;
- 2024 water heater;
- property taxes;
- inspection.

Point out verification badges and source documents.

## Scene 5 — Ask the Home

Ask:

`Has this basement ever had water problems?`

Show Claude's grounded answer and references.

Then:

`When was the roof replaced?`

Show exact verified record.

## Scene 6 — Add New Knowledge

Upload a demo invoice.

Show AI extraction.

Explain:

> AI can read the paperwork, but AI is not allowed to silently rewrite the
> home's history.

Review the proposal.

Click:

**Approve & Add to HomeToken**

Show new timeline event.

Show:

**Ledger Verified**

## Scene 7 — The Home Changes Hands

Open Transfer.

Explain that the property history survives owner changes.

Perform simulated stewardship transfer.

## Scene 8 — Vision

Close with:

> Today this is seeded with demo data. Tomorrow the same provider interfaces
> can connect to MLS, county records, permits, title, insurers, inspectors,
> contractors, and closing systems.

> The owner changes. The agent changes. The mortgage changes.
> The HomeToken remains.

---

# 31. Future Integration Roadmap

The hackathon architecture should support these later without redesigning core domain models.

## Phase 1 — Real RE/MAX / MLS Data
- MLS property facts;
- listings;
- transaction history;
- agent association.

## Phase 2 — Public Property Data
- county assessor;
- property taxes;
- deeds/recorder data where permitted;
- permit systems.

## Phase 3 — Transaction Ecosystem
- title;
- closing;
- mortgage;
- inspection;
- appraisal.

## Phase 4 — Property Lifecycle
- contractors;
- warranties;
- manufacturers;
- maintenance providers;
- solar;
- utilities;
- smart-home systems.

## Phase 5 — Authorized Insurance Data
- property-loss records;
- claim history;
- risk information;
- explicit consumer authorization and appropriate compliance.

## Phase 6 — Industry API

Potential future API:

```text
GET /v1/hometokens/{tokenId}
GET /v1/hometokens/{tokenId}/events
GET /v1/hometokens/{tokenId}/systems
GET /v1/hometokens/{tokenId}/documents
POST /v1/hometokens/{tokenId}/events
POST /v1/hometokens/{tokenId}/verify
```

The future moat is not just the app. It is the trusted property-history network and standardized API.

---

# 32. Production Concerns for a Post-Hackathon Team

These are deliberately deferred from the one-day build but should be captured for follow-up:

- legal review of data rights;
- privacy and consumer-reporting requirements;
- state-specific property-record rules;
- insurance-data authorization;
- data-source licensing;
- MLS/RESO licensing and compliance;
- identity proofing;
- property-owner authorization;
- dispute/correction workflow;
- immutable-record correction semantics;
- retention policies;
- document malware scanning;
- encryption strategy;
- audit logging;
- role-based permissions;
- brokerage boundaries;
- source provenance;
- contractor verification;
- title/closing integration;
- data reconciliation;
- duplicate property identity resolution;
- address normalization;
- parcel changes/subdivisions;
- condos and shared parcels;
- new construction lifecycle;
- disaster/rebuild lifecycle.

---

# 33. Acceptance Checklist

Before calling the hackathon build complete:

- [ ] Login works.
- [ ] Search works.
- [ ] Showcase property loads.
- [ ] HomeToken ID is visible.
- [ ] Property facts are visible.
- [ ] Home Health score is visible.
- [ ] Major systems are visible.
- [ ] Timeline has at least 20 events.
- [ ] Verification badges render.
- [ ] Sale history renders.
- [ ] Tax history renders.
- [ ] Repair history renders.
- [ ] Permit history renders.
- [ ] Inspection history renders.
- [ ] Supporting documents open.
- [ ] Ledger validates.
- [ ] Ask This Home works.
- [ ] AI answers cite property events.
- [ ] AI admits when data is unavailable.
- [ ] Upload works.
- [ ] Extraction works.
- [ ] Extraction requires human approval.
- [ ] Approved event appears in timeline.
- [ ] Ledger remains valid after event append.
- [ ] Manual add-record fallback works.
- [ ] Transfer simulation works.
- [ ] No page claims token is legal title.
- [ ] No page uses cryptocurrency/NFT language.
- [ ] Production build succeeds.
- [ ] Critical Playwright demo test passes.
- [ ] Manual demo flow succeeds twice.

---

# 34. Claude Code Starting Instruction

Paste the following into Claude Code after placing this file in the repository:

```text
Build the RE/MAX HomeToken hackathon demo described in this plan.

Read the entire markdown file before making changes.

Priorities:
1. Produce a complete working end-to-end demo in one day.
2. Follow the Must Have / Out of Scope boundaries exactly.
3. Use TypeScript throughout.
4. Use the pnpm/Turborepo monorepo structure defined in this plan. Keep
   `apps/web` and `apps/api` separate and place reusable domain concerns in
   shared packages.
5. Use PostgreSQL + Drizzle. Do not add Supabase.
6. Keep external property-data integrations behind provider interfaces and
   use mock/seeded providers for the hackathon.
7. Treat HomeToken as a persistent digital property identity, never as
   cryptocurrency, an NFT, fractional ownership, or legal title.
8. Property events are append-only and tamper-evident.
9. AI-extracted information must require human approval before becoming a
   permanent event.
10. Claude answers about a home must be grounded only in that property's
    supplied HomeToken record.
11. Build the showcase property and demo flow first. Do not spend time on
    optional features before the end-to-end demo works.
12. Maintain a running checklist from the Implementation Tasks section.
13. Run typecheck, lint, unit tests, and the critical Playwright demo flow
    before considering the build complete.

Start by inspecting the repository. If it is empty, scaffold the application
described here. If code already exists, preserve useful existing conventions
unless they conflict with this plan.

Implement tasks in order and keep commits small and descriptive.
```

---

# 35. Final Product Vision

**RE/MAX HomeToken**

**The Digital Identity of Real Estate**

A home should not become an information mystery every time it changes hands.

HomeToken creates a persistent, trusted property record that can eventually connect:
- buyers;
- sellers;
- agents;
- brokers;
- contractors;
- inspectors;
- title;
- mortgage;
- insurance;
- MLS;
- county systems.

The hackathon demo proves the core experience without pretending those integrations already exist.

**The owner changes. The agent changes. The mortgage changes. The HomeToken remains.**
