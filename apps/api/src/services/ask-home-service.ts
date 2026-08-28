import { askHome, isConfigured, type AiConfig } from "@homefax/ai";
import type {
  AskResponse,
  PropertyDetail,
  VerificationLevel,
} from "@homefax/contracts";
import { formatDate, formatMoney } from "../lib/format.js";

const VERIFICATION_LABELS: Record<VerificationLevel, string> = {
  SOURCE_VERIFIED: "Source Verified",
  PROFESSIONAL_VERIFIED: "Professional Verified",
  OWNER_REPORTED: "Owner Reported",
  AI_EXTRACTED_PENDING: "AI Extracted — Pending Verification",
  UNVERIFIED: "Unverified",
};

/**
 * Builds the model's entire view of the world: one property's facts, systems,
 * ownership periods and events.
 *
 * Nothing about any other property is in scope, and nothing outside the record
 * is supplied. If the answer is not derivable from this string, the correct
 * response is that the record does not contain it.
 *
 * Restricted events are included by title and verification level but their
 * documents are not — the assistant may acknowledge that a restricted record
 * exists without reciting its contents.
 */
export function buildContext(property: PropertyDetail): string {
  const events = property.events
    .map((e) => {
      const documents =
        e.visibility === "RESTRICTED"
          ? "documents=restricted, not supplied"
          : e.documents.length
            ? `documents=${e.documents.map((d) => `${d.name} (${d.kind}, ${d.visibility})`).join("; ")}`
            : "";
      return [
        e.id,
        e.occurredAt,
        e.eventType,
        e.title,
        e.meta,
        e.description ?? "",
        `verification=${e.verificationLevel}`,
        `visibility=${e.visibility}`,
        documents,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");

  const systems = property.systems
    .filter((s) => !s.hidden)
    .map(
      (s) =>
        `${s.name}: status ${s.status}, verification ${s.verificationLevel}, ` +
        s.rows.map(([k, v]) => `${k} ${v}`).join(", "),
    )
    .join("\n");

  const ownership = property.ownership
    .map(
      (o) =>
        `#${o.sequenceNumber} ${o.label} ${o.range} (${o.verificationLevel})`,
    )
    .join("\n");

  const facts = property.facts;
  return [
    "PROPERTY",
    `${property.address}, ${property.city}, ${property.state} ${property.postalCode}`,
    `HomeFax ${property.tokenId} | parcel ${property.parcelId}`,
    `${facts.bedrooms} bed, ${facts.bathrooms} bath, ${facts.livingSqft} sqft, lot ${facts.lotSqft} sqft, built ${facts.yearBuilt}`,
    `Estimated value ${property.estimatedValue ? formatMoney(property.estimatedValue) : "unknown"}`,
    `Home Health score ${property.health.score}/100 (confidence ${property.health.confidence})`,
    "",
    "SYSTEMS",
    systems,
    "",
    "OWNERSHIP PERIODS",
    ownership,
    "",
    "EVENTS (newest first)",
    events,
  ].join("\n");
}

/**
 * Words that carry no signal here. "Property", "home" and "house" appear in
 * almost every event, so scoring on them ranks the record's oldest boilerplate
 * above whatever was actually asked about.
 */
const STOPWORDS = new Set([
  "property",
  "home",
  "house",
  "this",
  "that",
  "there",
  "these",
  "those",
  "have",
  "has",
  "had",
  "been",
  "ever",
  "with",
  "what",
  "when",
  "where",
  "which",
  "does",
  "did",
  "about",
  "any",
  "the",
  "record",
  "homefax",
]);

/**
 * What answers the question when the assistant service is unreachable: a
 * keyword match over the record that lists what it found and says plainly
 * where the answer came from.
 *
 * It deliberately interprets nothing. Listing four matching events verbatim is
 * honest; paraphrasing them without a model in the loop would be inventing.
 */
export function localAnswer(
  property: PropertyDetail,
  question: string,
): Omit<AskResponse, "questionsUsed" | "questionsAllowed"> {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));

  const scored = property.events
    .map((e) => {
      // Tokenized, not substring-matched. A plain `includes` matches across
      // word interiors — "roof" hits "waterproofing" — which pushed the
      // basement repair above the actual roof replacement when someone asked
      // about the roof.
      const tokens = new Set(
        `${e.title} ${e.meta} ${e.description ?? ""} ${e.eventType}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .split(/\s+/)
          .filter(Boolean),
      );
      const score = words.reduce((acc, w) => acc + (tokens.has(w) ? 1 : 0), 0);
      return { event: e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (scored.length === 0) {
    return {
      answer:
        "The available HomeFax record for this property does not contain information that answers that question. Absence of a record does not mean the event did not occur.",
      confidence: "LOW",
      eventIds: [],
      caveat:
        "Answer generated from the local record index because the assistant service was unavailable.",
      fallback: true,
    };
  }

  const lines = scored.map(
    ({ event: e }) =>
      `${formatDate(e.occurredAt)} — ${e.title}. ${e.meta}${
        e.description ? ` ${e.description}` : ""
      } Verification: ${VERIFICATION_LABELS[e.verificationLevel]}.`,
  );

  return {
    answer: `From this HomeFax record:\n\n${lines.join("\n\n")}`,
    confidence: "MEDIUM",
    eventIds: scored.map((x) => x.event.id),
    caveat:
      "Answer assembled from the local record index because the assistant service was unavailable. It lists matching events without further interpretation.",
    fallback: true,
  };
}

export async function answerQuestion(
  config: AiConfig,
  property: PropertyDetail,
  question: string,
): Promise<Omit<AskResponse, "questionsUsed" | "questionsAllowed">> {
  if (!isConfigured(config)) return localAnswer(property, question);

  try {
    const result = await askHome(config, {
      context: buildContext(property),
      question,
    });

    // Citations are filtered against the events that actually exist on this
    // property. A hallucinated event ID must never render as a clickable
    // citation — a broken link that looks authoritative is worse than none.
    const known = new Set(property.events.map((e) => e.id));
    return {
      answer: result.answer,
      confidence: result.confidence,
      eventIds: result.eventIds.filter((id) => known.has(id)),
      caveat: result.caveat,
      fallback: false,
    };
  } catch {
    return localAnswer(property, question);
  }
}
