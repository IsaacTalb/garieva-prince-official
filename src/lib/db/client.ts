import "server-only";
import postgres from "postgres";
import { databaseConfigSchema, readConfiguration } from "@/lib/config";

let client: ReturnType<typeof postgres> | undefined;

export function isDatabaseConfigured() {
  return databaseConfigSchema.safeParse(process.env).success;
}

export function getDatabase() {
  if (!client) {
    const env = readConfiguration(databaseConfigSchema, "Database");
    client = postgres(env.DATABASE_URL, {
      // Compatible with Supabase's transaction pooler; no session-local state.
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "verify-full",
    });
  }
  return client;
}
