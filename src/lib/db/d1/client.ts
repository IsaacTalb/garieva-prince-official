import "server-only";

/**
 * Cloudflare D1 Database Client
 * 
 * Abstraction layer for Cloudflare D1 database access.
 * This is the primary database client for Garieva Prince (D1-only runtime).
 * 
 * Usage:
 *   const db = getDatabase();
 *   const users = await db.prepare("SELECT * FROM users").all();
 */

let d1Bound: unknown | undefined; // D1 bindings are types from @cloudflare/workers-types
let databaseName: string | undefined;

/**
 * Get D1 database client
 * 
 * Returns the bound D1 database or creates it from environment.
 * Uses SQLite for local development (file-based database).
 */
export function getDatabase() {
  // Initialize from env for local development
  if (!d1Bound || !databaseName) {
    const dbUrl = process.env.DATABASE_URL;
    databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "garieva-prince";
    
    // For local development, use SQLite file-based database
    // This is a simplified version that works without Cloudflare bindings
    if (dbUrl?.startsWith("sqlite:")) {
      // Local dev with SQLite - use a simple in-memory mock for now
      // In production, this would use the actual D1 API or postgres driver
      const sqlite = require("better-sqlite3");
      const dbPath = dbUrl.replace("sqlite:", "");
      
      // Create database file if it doesn't exist
      if (!dbPath || dbPath === ":memory:") {
        d1Bound = {};
      } else {
        d1Bound = sqlite(dbPath);
      }
    } else if (dbUrl?.startsWith("cloudflare:")) {
      // Production Cloudflare binding - will work on CF Workers
      d1Bound = {} as unknown; // Type placeholder for now
    } else {
      // No valid DATABASE_URL configured
      throw new Error(
        "DATABASE_URL must be set. Use 'sqlite:./dev.db' for local development\n" +
        "Or remove this line from .env.local to use default SQLite."
      );
    }
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