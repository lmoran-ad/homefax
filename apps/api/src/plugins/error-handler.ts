import type { ApiError } from "@homefax/contracts";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

function zodDetails(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

async function plugin(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = {
      code: "NOT_FOUND",
      message: `No route for ${request.method} ${request.url}`,
    };
    reply.code(404).send({ error: body });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      // Expected outcomes — a rejected claim, a locked record, an expired
      // session. Logged at info because they are the system working.
      request.log.info(
        { code: error.code, message: error.message },
        "handled application error",
      );
      reply.code(error.status).send({ error: error.toJSON() });
      return;
    }

    if (error instanceof ZodError) {
      const body: ApiError = {
        code: "BAD_REQUEST",
        message: error.issues[0]?.message ?? "That request was not valid",
        details: zodDetails(error),
      };
      reply.code(400).send({ error: body });
      return;
    }

    request.log.error({ err: error }, "unhandled error");
    const body: ApiError = {
      // Never surface an internal message to the client; it may carry
      // connection strings or query fragments.
      code: "INTERNAL",
      message: "Something went wrong on our side",
    };
    reply.code(500).send({ error: body });
  });
}

export const errorHandlerPlugin = fp(plugin, { name: "homefax-errors" });
