import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { z } from "zod";

/**
 * The monorepo root, or the working directory when there is no workspace above
 * it (a built deployment, for instance).
 *
 * `pnpm --filter` runs each script in its own package directory, so a relative
 * storage path means three different folders depending on who is asking: the
 * seeder writes under packages/db, the web app reads under apps/web, and the
 * standalone API under apps/api. Documents then exist and are missing at the
 * same time. Anchoring the path to the workspace gives every process the same
 * answer.
 */
function workspaceRoot(): string {
  let directory = process.cwd();
  for (;;) {
    if (existsSync(resolve(directory, "pnpm-workspace.yaml"))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return process.cwd();
    directory = parent;
  }
}

/**
 * Server environment. Validated once, at process start, so a misconfigured
 * deployment fails loudly instead of surfacing as a confusing runtime error
 * three screens into the demo.
 */
const ServerEnvSchema = z.object({
  APP_NAME: z.string().default("REAL / REMAX HomeFax"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DEMO_MODE: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),

  WEB_PORT: z.coerce.number().int().default(3000),
  API_PORT: z.coerce.number().int().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  API_BASE_URL: z.string().default("http://localhost:4000"),

  /**
   * Vercel's Supabase integration injects POSTGRES_URL rather than
   * DATABASE_URL, so either is accepted. That lets the platform wire the
   * credential in directly and keeps the connection string out of anyone's
   * clipboard.
   */
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, "DATABASE_URL is required")
    .refine((value) => /^postgres(ql)?:\/\//i.test(value), {
      // The driver parses a connection string against a dummy base URL, so
      // anything that is not a complete URI silently becomes a host named
      // "base" and fails much later as a DNS error that names nothing useful.
      // A paste that brought along the variable name, a comment, quotes or an
      // unreplaced [YOUR-PASSWORD] placeholder all land here.
      message:
        "DATABASE_URL must be a complete postgres:// or postgresql:// URI — the value alone, with no variable name, quotes, comment or placeholder around it",
    }),

  AUTH_JWT_SECRET: z
    .string()
    .min(8, "AUTH_JWT_SECRET must be at least 8 characters"),

  // Optional. When absent the AI features degrade to their documented
  // fallbacks rather than failing: Ask This Home answers from the local
  // record index, and Add Record drops to manual entry.
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),

  /**
   * A shared demo is a shared database: one reviewer appending a record, or
   * releasing a claim, changes what the next one sees. Read-only mode lets a
   * link be handed out without that.
   *
   * It is a real restriction, not a UI one — the API refuses the write. That
   * also means the contribution flows this product exists to show are off, so
   * it is the right setting for a browse-only link and the wrong one for a
   * live walkthrough.
   */
  READ_ONLY: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  STORAGE_DRIVER: z.enum(["local", "database"]).default("local"),
  LOCAL_STORAGE_PATH: z
    .string()
    .default("./storage/demo-uploads")
    .transform((path) => (isAbsolute(path) ? path : resolve(workspaceRoot(), path))),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let cached: ServerEnv | null = null;

export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cached) return cached;
  const normalized: NodeJS.ProcessEnv = {
    ...source,
    DATABASE_URL:
      source.DATABASE_URL ?? source.POSTGRES_URL ?? source.POSTGRES_PRISMA_URL,
  };
  const parsed = ServerEnvSchema.safeParse(normalized);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new Error(`Invalid server environment:\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper — clears the memoized environment. */
export function resetServerEnv(): void {
  cached = null;
}

export function aiEnabled(env: ServerEnv): boolean {
  return Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim());
}

/**
 * Public config, safe to ship to the browser. Nothing secret may be added here.
 */
export const publicConfig = {
  appName: "REAL / REMAX HomeFax",
  tagline: "The Digital Identity of Real Estate",
} as const;
