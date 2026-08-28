import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { AppContext } from "../lib/context";
import { AppError } from "../lib/errors";

/**
 * Paths that still accept a write while read-only mode is on.
 *
 * Signing in and out is how anyone reaches a read-only page at all. Ask This
 * Home is a POST because a question does not fit in a query string, but it
 * writes nothing — it reads the record and answers from it, so refusing it
 * would remove a headline feature to protect data it never touches. The admin
 * routes are how the dataset gets restored, and they are already gated behind
 * a secret; locking them along with everything else would mean read-only mode
 * could take away the only way to undo whatever prompted turning it on.
 */
const ALWAYS_ALLOWED = [
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/logout$/,
  /^\/api\/admin\//,
  /^\/api\/properties\/[^/]+\/ask$/,
] as const;

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isAllowed(request: FastifyRequest): boolean {
  const path = request.url.split("?")[0] ?? "";
  return ALWAYS_ALLOWED.some((pattern) => pattern.test(path));
}

/**
 * Refuses writes when the deployment is read-only.
 *
 * Enforced here rather than by hiding buttons: a shared demo link reaches
 * people whose browsers this app does not control, and a restriction that
 * lives in the interface is not a restriction. Hiding the controls as well is
 * worth doing, but as a courtesy on top of this, never instead of it.
 */
async function plugin(app: FastifyInstance, options: { ctx: AppContext }) {
  if (!options.ctx.env.READ_ONLY) return;

  app.addHook("onRequest", async (request) => {
    if (!WRITE_METHODS.has(request.method)) return;
    if (isAllowed(request)) return;

    throw new AppError(
      "READ_ONLY",
      "This is a read-only demo. Everything is browsable — records, timelines, documents, the ledger check and Ask This Home — but nothing can be changed.",
    );
  });
}

export const readOnlyPlugin = fp(plugin, { name: "homefax-read-only" });
