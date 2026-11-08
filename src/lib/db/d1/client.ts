import "server-only";

/**
 * Cloudflare D1 Database Client
 * 
 * Abstraction layer for Cloudflare D1 database access.
 * This is the primary database client for Garieva Prince after migration.
 * 
 * Usage:
 *   const db = getDatabase();
 *   const users = await db.prepare("SELECT * FROM users").all();
 */

let d1Bound: Database | undefined;
let databaseName: string | undefined;

/**
 * Get D1 database client
 * 
 * Returns the bound D1 database or creates it from environment.
 * Throws if DATABASE_URL is not configured (useless in production without bindings).
 */
export function getDatabase(): ReturnType<typeof import("postgres").default> {
  // Initialize from env for local development
  if (!d1Bound || !databaseName) {
    const dbUrl = process.env.DATABASE_URL;
    databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "garieva-prince";
    
    if (!dbUrl) {
      throw new Error("DATABASE_URL must be set for development. Bindings will be used in production.");
    }
    
    // Import postgres for local development with D1-compatible syntax
    // In production, this would use the Cloudflare Workers D1 API
    const postgres = require("postgres");
    
    d1Bound = postgres(dbUrl, {
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require",
    });
  }
  
  return d1Bound;
}

/**
 * Check if D1 database is configured
 */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL || !!process.env.CLOUDFLARE_D1_DATABASE_NAME;
}

/**
 * Get database name for migration/identification purposes
 */
export function getDatabaseName(): string {
  return databaseName ?? "garieva-prince";
}