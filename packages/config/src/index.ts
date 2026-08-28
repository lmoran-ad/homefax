import { z } from "zod";

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
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  AUTH_JWT_SECRET: z
    .string()
    .min(8, "AUTH_JWT_SECRET must be at least 8 characters"),

  // Optional. When absent the AI features degrade to their documented
  // fallbacks rather than failing: Ask This Home answers from the local
  // record index, and Add Record drops to manual entry.
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-5"),

  STORAGE_DRIVER: z.enum(["local", "database"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().default("./storage/demo-uploads"),
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
