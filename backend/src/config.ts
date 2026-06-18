export type AppConfig = {
  port: number;
  supabaseUrl: string;
  databaseUrl: string;
  supabaseJwtSecret?: string;
};

export function loadConfig(): AppConfig {
  const port = Number.parseInt(process.env.PORT ?? "8787", 10);
  const supabaseUrl = process.env.SUPABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required");
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("PORT must be a positive number");
  }

  return {
    port,
    supabaseUrl,
    databaseUrl,
    ...(supabaseJwtSecret ? { supabaseJwtSecret } : {}),
  };
}
