import { describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppContext } from "../lib/context";
import { errorHandlerPlugin } from "../plugins/error-handler";
import { readOnlyPlugin } from "../plugins/read-only";

/**
 * The gate itself, with no database behind it.
 *
 * What matters here is which method and path combinations get through, and
 * that is decided before a route ever runs — so a bare instance tests it
 * exactly as well as a seeded one, and does it in milliseconds.
 */
async function buildGated(readOnly: boolean): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const ctx = { env: { READ_ONLY: readOnly } } as unknown as AppContext;

  await app.register(errorHandlerPlugin);
  await app.register(readOnlyPlugin, { ctx });

  for (const method of ["get", "post", "patch", "delete"] as const) {
    app[method]("/api/*", async () => ({ reached: true }));
  }
  await app.ready();
  return app;
}

describe("read-only mode", () => {
  it("refuses every write that changes the record", async () => {
    const app = await buildGated(true);
    try {
      for (const [method, url] of [
        ["POST", "/api/properties/HF-US-CO-DEN-00001234/events"],
        ["POST", "/api/properties/HF-US-CO-DEN-00001234/claim"],
        ["POST", "/api/properties/HF-US-CO-DEN-00001234/transfers"],
        ["POST", "/api/properties/provision"],
        ["POST", "/api/jobs/requests"],
        ["POST", "/api/jobs/submit"],
        ["PATCH", "/api/auth/profile"],
        ["POST", "/api/auth/password"],
        ["POST", "/api/billing/upgrade"],
        ["DELETE", "/api/properties/HF-US-CO-DEN-00001234/save"],
      ] as const) {
        const response = await app.inject({ method, url });
        expect(response.statusCode, `${method} ${url}`).toBe(403);
        expect(response.json<{ error: { code: string } }>().error.code).toBe(
          "READ_ONLY",
        );
      }
    } finally {
      await app.close();
    }
  });

  it("still lets someone sign in, ask a question, and reseed", async () => {
    const app = await buildGated(true);
    try {
      for (const url of [
        // Without these nobody reaches a read-only page at all.
        "/api/auth/login",
        "/api/auth/logout",
        // A POST because a question does not fit in a query string, but it
        // writes nothing — refusing it would remove a headline feature to
        // protect data it never touches.
        "/api/properties/HF-US-CO-DEN-00001234/ask",
        // Secret-gated already, and the way the dataset gets restored. Locking
        // it here would mean read-only mode removes the only way to undo
        // whatever prompted turning it on.
        "/api/admin/seed",
      ]) {
        const response = await app.inject({ method: "POST", url });
        expect(response.statusCode, url).toBe(200);
      }
    } finally {
      await app.close();
    }
  });

  it("reads are never gated", async () => {
    const app = await buildGated(true);
    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/properties/HF-US-CO-DEN-00001234",
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it("changes nothing when it is off", async () => {
    const app = await buildGated(false);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/properties/HF-US-CO-DEN-00001234/events",
      });
      expect(response.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
