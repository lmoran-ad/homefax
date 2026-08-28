"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AskResponse, Plan, PropertyDetail } from "@homefax/contracts";
import { Button } from "./buttons";
import { PaywallModal, useToast, type PaywallData } from "./feedback";
import { Spinner } from "./ui";
import { ClientApiError, request } from "@/lib/client";

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; answer: AskResponse };

const SUGGESTIONS = [
  "When was the roof replaced?",
  "Has the basement ever had water problems?",
  "What major systems may need replacement soon?",
  "What work has been done without a permit on file?",
];

export function AskThisHome({
  property,
  plan,
}: {
  property: PropertyDetail;
  plan: Plan;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [paywall, setPaywall] = useState<PaywallData | null>(null);
  const [used, setUsed] = useState(0);

  const quota = plan === "free" ? 3 : null;
  const remaining = quota === null ? null : Math.max(0, quota - used);

  const eventById = new Map(property.events.map((event) => [event.id, event]));

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || asking) return;

    setMessages((previous) => [...previous, { role: "user", text: trimmed }]);
    setInput("");
    setAsking(true);

    try {
      const answer = await request<AskResponse>(
        `/properties/${property.tokenId}/ask`,
        { method: "POST", body: { question: trimmed } },
      );
      setMessages((previous) => [...previous, { role: "assistant", answer }]);
      setUsed(answer.questionsUsed);
    } catch (error) {
      if (error instanceof ClientApiError && error.paywall) {
        setPaywall(error.paywall as unknown as PaywallData);
        // Drop the unanswered question rather than leaving it hanging.
        setMessages((previous) => previous.slice(0, -1));
      } else {
        toast(
          error instanceof ClientApiError
            ? error.error.message
            : "The assistant could not be reached.",
        );
        setMessages((previous) => previous.slice(0, -1));
      }
    } finally {
      setAsking(false);
    }
  }

  async function upgrade() {
    await request("/billing/upgrade", {
      method: "POST",
      body: { plan: "agent_pro", cycle: "monthly" },
    });
    setPaywall(null);
    toast("Upgraded to Agent Pro. Questions are now unlimited.");
    router.refresh();
  }

  return (
    <div className="track-min-0 grid items-start gap-[22px] lg:grid-cols-[minmax(0,1.7fr)_minmax(270px,0.8fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-[14px]">
          <div
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-brand text-[18px] text-white"
            aria-hidden="true"
          >
            ✦
          </div>
          <div className="min-w-0">
            <h1 className="m-0 text-[24px] font-extrabold tracking-[-0.025em] text-ink">
              Ask This Home
            </h1>
            <p data-testid="ask-quota" className="mt-[4px] mb-0 text-[13px] text-muted">
              {property.events.length} events · {property.documents.length} documents
              in context ·{" "}
              {remaining === null
                ? "Agent Pro, unlimited"
                : `${remaining} of 3 free questions left`}
            </p>
          </div>
        </div>

        <div className="mt-[22px] min-h-[280px] space-y-[16px]">
          {messages.length === 0 ? (
            <div className="rounded-[16px] border border-line bg-white p-[26px_28px]">
              <p className="m-0 text-[14.5px] leading-[1.65] text-body">
                Ask anything about {property.address}. The assistant sees only this
                property&apos;s record — its events, systems and document summaries —
                and cites the events it used.
              </p>
              <p className="mt-[12px] mb-0 text-[13.5px] leading-[1.6] text-muted">
                When the record has no answer it says so. It will never treat the
                absence of a record as proof that something did not happen.
              </p>
            </div>
          ) : null}

          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} data-testid="ask-message-user" className="flex justify-end">
                <div className="max-w-[70%] rounded-[14px] bg-navy px-[18px] py-[13px] text-[14.5px] leading-[1.55] text-white">
                  {message.text}
                </div>
              </div>
            ) : (
              <div key={index} data-testid="ask-message-assistant" className="flex">
                <div className="max-w-[86%] min-w-0 rounded-[14px] border border-line bg-card p-[18px_20px]">
                  <p
                    data-testid="ask-answer"
                    className="m-0 text-[14.5px] leading-[1.65] whitespace-pre-wrap text-body"
                  >
                    {message.answer.answer}
                  </p>

                  {message.answer.eventIds.length > 0 ? (
                    <div className="mt-[16px]">
                      <div className="text-[10.5px] font-bold tracking-[0.14em] text-softer">
                        REFERENCED EVENTS
                      </div>
                      <div className="mt-[8px] flex flex-wrap gap-[8px]">
                        {message.answer.eventIds.map((id) => {
                          const event = eventById.get(id);
                          return (
                            <Link
                              key={id}
                              href={`/properties/${property.tokenId}/timeline#ev-${id}`}
                              data-testid="ask-citation"
                              data-event-id={id}
                              className="rounded-[8px] border border-line bg-white px-[10px] py-[6px] text-[12.5px] font-semibold text-link no-underline hover:border-navy"
                            >
                              {event ? event.title : id}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {message.answer.caveat ? (
                    <div
                      data-testid="ask-caveat"
                      className="mt-[16px] rounded-[10px] border border-warn-line bg-warn-panel p-[12px_14px] text-[12.5px] leading-[1.6] text-amber"
                    >
                      {message.answer.caveat}
                    </div>
                  ) : null}

                  <div className="mt-[14px] flex flex-wrap items-center gap-[10px] border-t border-line pt-[10px] text-[11.5px] text-faint">
                    <span data-testid="ask-confidence">
                      Confidence: {message.answer.confidence}
                    </span>
                    {message.answer.fallback ? (
                      <span
                        data-testid="ask-fallback-flag"
                        className="rounded-[5px] bg-neutral-bg px-[7px] py-[2px] font-bold text-grey"
                      >
                        LOCAL RECORD INDEX
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ),
          )}

          {asking ? (
            <div className="flex items-center gap-3 text-[14px] text-muted">
              <Spinner /> Reading the HomeFax record…
            </div>
          ) : null}
        </div>

        <form
          className="mt-[22px] flex flex-wrap gap-[10px]"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={`Ask about ${property.address}…`}
            data-testid="ask-input"
          aria-label="Your question"
            disabled={asking}
            className="min-w-[220px] flex-1 rounded-[10px] border border-input bg-white px-4 py-[14px] text-[15px] text-ink placeholder:text-faint"
          />
          <Button
            type="submit"
            size="lg"
            disabled={asking || !input.trim()}
            testId="ask-submit"
          >
            Ask
          </Button>
        </form>
      </div>

      <aside className="min-w-0 space-y-[18px]">
        <div className="rounded-[16px] border border-line bg-white p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            Try asking
          </h3>
          <div className="mt-[14px] space-y-[8px]">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void ask(suggestion)}
                disabled={asking}
                data-testid="ask-suggestion"
                className="w-full cursor-pointer rounded-[10px] border border-line bg-white p-[11px_13px] text-left text-[13px] leading-[1.5] text-body hover:border-navy hover:text-navy"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-line bg-card p-[22px_24px]">
          <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.015em] text-ink">
            How grounding works
          </h3>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            The model receives only this property&apos;s events, systems and document
            summaries. It has no access to any other property, and no outside
            knowledge about this one.
          </p>
          <p className="mt-[10px] mb-0 text-[13px] leading-[1.6] text-muted">
            Citations are filtered against the events that actually exist here, so a
            reference you can click is a reference that is real. If the assistant is
            unreachable, the answer comes from a local keyword index and says so.
          </p>
        </div>
      </aside>

      <PaywallModal
        paywall={paywall}
        onClose={() => setPaywall(null)}
        onUpgrade={() => void upgrade()}
      />
    </div>
  );
}
