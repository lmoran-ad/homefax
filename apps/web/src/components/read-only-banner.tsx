/**
 * Says the deployment is read-only, before anyone finds out by being refused.
 *
 * The restriction is enforced in the API — this is the courtesy half. It names
 * what still works rather than only what does not, because everything this
 * demo is worth showing is on that list.
 */
export function ReadOnlyBanner() {
  return (
    <div
      data-testid="read-only-banner"
      role="status"
      className="border-b border-line bg-card px-[22px] py-[10px] text-center text-[13px] text-body"
    >
      <strong className="font-bold text-ink">Read-only demo.</strong>{" "}
      Every record, timeline, document, ledger check and Ask This Home answer is
      live. Contributions, claims and account changes are switched off, so
      nothing you do here changes what the next person sees.
    </div>
  );
}
