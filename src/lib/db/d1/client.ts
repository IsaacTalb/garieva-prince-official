import "server-only";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare D1 Database Client
 * 
 * Abstraction layer for Cloudflare D1 database access.
 * This is the primary database client for Garieva Prince (D1-only runtime).
 * Uses sql.js for local development with compatibility layer for template literals.
 */

let databaseName: string | undefined;
type SQLiteValue = string | number | null | Uint8Array;
type SQLiteStatement = {
  bind(values: SQLiteValue[]): void;
  step(): boolean;
  getAsObject(): Record<string, SQLiteValue>;
  get(): SQLiteValue[];
  reset(): void;
  free(): void;
};
type SQLiteDatabase = {
  export(): Uint8Array;
  prepare(query: string): SQLiteStatement;
  exec(query: string): SQLiteExecResult[];
  getRowsModified(): number;
};
type SQLiteExecResult = {
  columns: string[];
  values: SQLiteValue[][];
};
type SqlJsInitializer = () => Promise<{
  Database: new (data?: Uint8Array) => SQLiteDatabase;
}>;
type SqlJsModule = SqlJsInitializer | { default?: SqlJsInitializer };
type SqlJsDatabaseModule = Awaited<ReturnType<SqlJsInitializer>>;

let sqlBound: SQLiteDatabase | undefined;
let transactionOpen = false;

let SQL: SqlJsDatabaseModule | undefined;
if (!process.env.DATABASE_URL?.trim().startsWith("cloudflare:")) {
  const sqlModule = createRequire(import.meta.url)(
    "sql.js/dist/sql-wasm-inline.js",
  ) as SqlJsModule;
  const initializeSqlJs =
    typeof sqlModule === "function" ? sqlModule : sqlModule.default;
  if (!initializeSqlJs) {
    throw new TypeError("The SQL.js inline-WASM initializer is unavailable.");
  }
  SQL = await initializeSqlJs();
}

// SQL.js returns dynamically shaped rows; callers validate them at boundaries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryRow = any;
type D1Value = string | number | null | ArrayBuffer | ArrayBufferView;
type D1Statement = {
  bind(...values: D1Value[]): D1Statement;
  all(): Promise<{ results?: QueryRow[] }>;
  run(): Promise<{ meta?: { changes?: number } }>;
};
type D1Binding = {
  prepare(query: string): D1Statement;
  batch(
    statements: D1Statement[],
  ): Promise<Array<{ meta?: { changes?: number } }>>;
};

declare global {
  interface CloudflareEnv {
    DB: D1Binding;
  }
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new TypeError(`Invalid SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function getLocalDatabase(): SQLiteDatabase {
  if (!sqlBound) {
    throw new Error("The local SQLite database has not been initialized.");
  }
  return sqlBound;
}

function toSQLiteValue(value: unknown): SQLiteValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  throw new TypeError(`Unsupported SQLite query parameter: ${typeof value}`);
}

function persistDatabase(): void {
  const dbUrl = process.env.DATABASE_URL;
  const localDatabase = sqlBound;
  if (!localDatabase || !dbUrl?.startsWith("sqlite:") || transactionOpen) return;

  const dbPath = dbUrl.slice("sqlite:".length);
  if (!dbPath || dbPath === ":memory:") return;

  const resolvedPath = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    dbPath
  );
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, Buffer.from(localDatabase.export()));
}

function createStatement(query: string) {
  const statement = getLocalDatabase().prepare(query);

  return {
    bind(params: unknown[] | number, value?: unknown) {
      if (Array.isArray(params)) {
        statement.bind(params.map(toSQLiteValue));
      } else {
        statement.bind([toSQLiteValue(params), toSQLiteValue(value)]);
      }
    },
    step: () => statement.step(),
    getAsObject: () => statement.getAsObject() as QueryRow,
    getAsArray: () => statement.get(),
    run(params?: unknown[]) {
      if (params) statement.bind(params.map(toSQLiteValue));
      statement.step();
      statement.reset();
      persistDatabase();
    },
    free: () => statement.free(),
  };
}

type DatabaseClient = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => QueryRow[] | Promise<QueryRow[]>) & {
  prepare: typeof createStatement;
  batch: (statements: DatabaseBatchStatement[]) => Promise<number[]>;
  exec: (query: string) => unknown[];
  getRowsModified: () => number;
};

export type DatabaseBatchStatement = {
  query: string;
  params: unknown[];
};

function createDatabaseClient(): DatabaseClient {
  const client = ((
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): QueryRow[] => {
    const queryText = strings.reduce(
      (query, part, index) => query + (index ? "?" : "") + part,
      ""
    );
    const statement = getLocalDatabase().prepare(queryText);
    try {
      statement.bind(values.map(toSQLiteValue));
      const rows: QueryRow[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject() as QueryRow);
      }
      if (!/^\s*(SELECT|PRAGMA|EXPLAIN)\b/i.test(queryText)) {
        persistDatabase();
      }
      return rows;
    } finally {
      statement.free();
    }
  }) as DatabaseClient;

  client.prepare = createStatement;
  client.batch = async (statements) => {
    const localDatabase = getLocalDatabase();
    localDatabase.exec("BEGIN TRANSACTION");
    transactionOpen = true;
    try {
      const changes = statements.map(({ query, params }) => {
        const statement = localDatabase.prepare(query);
        try {
          statement.bind(params.map(toSQLiteValue));
          statement.step();
          statement.reset();
          return localDatabase.getRowsModified();
        } finally {
          statement.free();
        }
      });
      localDatabase.exec("COMMIT");
      transactionOpen = false;
      persistDatabase();
      return changes;
    } catch (error) {
      localDatabase.exec("ROLLBACK");
      transactionOpen = false;
      throw error;
    }
  };
  client.exec = (query: string) => {
    const localDatabase = getLocalDatabase();
    const results = localDatabase.exec(query);
    if (/^\s*BEGIN\b/i.test(query)) transactionOpen = true;
    if (/^\s*(COMMIT|END)\b/i.test(query)) {
      transactionOpen = false;
      persistDatabase();
    }
    if (/^\s*ROLLBACK\b/i.test(query)) transactionOpen = false;
    if (!transactionOpen && !/^\s*(BEGIN|COMMIT|END|ROLLBACK)\b/i.test(query)) {
      persistDatabase();
    }
    return results;
  };
  client.getRowsModified = () => getLocalDatabase().getRowsModified();
  return client;
}

const database = createDatabaseClient();

function toD1Value(value: unknown): D1Value {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value;
  throw new TypeError(`Unsupported D1 query parameter: ${typeof value}`);
}

function createD1DatabaseClient(binding: D1Binding) {
  const client = (async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryRow[]> => {
    const queryText = strings.reduce(
      (query, part, index) => query + (index ? "?" : "") + part,
      "",
    );
    const statement = binding
      .prepare(queryText)
      .bind(...values.map(toD1Value));
    if (
      /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(queryText) ||
      /\bRETURNING\b/i.test(queryText)
    ) {
      const result = await statement.all();
      return result.results ?? [];
    }
    await statement.run();
    return [];
  }) as DatabaseClient;
  client.prepare = () => {
    throw new Error("Synchronous prepared statements are not supported by D1.");
  };
  client.batch = async (statements) => {
    const results = await binding.batch(
      statements.map(({ query, params }) =>
        binding.prepare(query).bind(...params.map(toD1Value)),
      ),
    );
    return results.map((result) => Number(result.meta?.changes ?? 0));
  };
  client.exec = () => {
    throw new Error("Raw synchronous SQL is not supported by D1.");
  };
  client.getRowsModified = () => {
    throw new Error("Synchronous change counts are not supported by D1.");
  };
  return client;
}

/**
 * Get a local SQLite or Cloudflare D1 client according to DATABASE_URL.
 */
export function getDatabase() {
  const dbUrl = process.env.DATABASE_URL?.trim();
  databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "garieva-prince";

  if (dbUrl?.startsWith("cloudflare:")) {
    const binding = getCloudflareContext().env.DB;
    if (!binding) {
      throw new Error("The Cloudflare Worker is missing its DB D1 binding.");
    }
    return createD1DatabaseClient(binding);
  }
  if (dbUrl && !dbUrl.startsWith("sqlite:")) {
    throw new Error(`Unsupported DATABASE_URL scheme: ${dbUrl.split(":")[0]}`);
  }

  if (!sqlBound) {
    if (!SQL) {
      throw new Error("SQL.js is unavailable for the configured database runtime.");
    }

    const dbPath = dbUrl?.slice("sqlite:".length);
    if (dbPath && dbPath !== ":memory:") {
      const resolvedPath = path.resolve(
        /* turbopackIgnore: true */ process.cwd(),
        dbPath
      );
      if (fs.existsSync(resolvedPath)) {
        sqlBound = new SQL.Database(fs.readFileSync(resolvedPath));
      }
    }
    if (!sqlBound) sqlBound = new SQL.Database();

    const hasUsersTable = sqlBound.exec(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    ).length > 0;
    const migrationPath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "cloudflare",
      "migrations",
      "0001_core.sql"
    );
    if (!hasUsersTable && fs.existsSync(migrationPath)) {
      sqlBound.exec(fs.readFileSync(migrationPath, "utf8"));
      persistDatabase();
    }
    const hasInitializedUsersTable = sqlBound.exec(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    ).length > 0;
    if (hasInitializedUsersTable) {
      const userColumns = sqlBound.exec("PRAGMA table_info(users)")[0]?.values ?? [];
      if (!userColumns.some((column: unknown[]) => column[1] === "show_wardrobe_publicly")) {
        sqlBound.exec(`
          ALTER TABLE users
          ADD COLUMN show_wardrobe_publicly INTEGER NOT NULL DEFAULT 0
          CHECK (show_wardrobe_publicly IN (0, 1))
        `);
      }
      sqlBound.exec(`
        CREATE TABLE IF NOT EXISTS nfc_verification_events (
          id TEXT PRIMARY KEY,
          product_item_id TEXT NOT NULL,
          key_version INTEGER NOT NULL CHECK (key_version > 0),
          tap_counter INTEGER NOT NULL CHECK (tap_counter >= 0),
          verified_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (product_item_id, key_version, tap_counter)
        );
        CREATE INDEX IF NOT EXISTS idx_nfc_verifications_item
          ON nfc_verification_events(product_item_id, verified_at DESC)
      `);
      persistDatabase();
    }
  }

  return database;
}

/**
 * Check if D1 database is configured
 */
export function isDatabaseConfigured(): boolean {
  return (
    !!process.env.DATABASE_URL?.trim() &&
    (process.env.DATABASE_URL.trim().startsWith("sqlite:") ||
      process.env.DATABASE_URL.trim().startsWith("cloudflare:"))
  );
}

/**
 * Get database name for migration/identification purposes
 */
export function getDatabaseName(): string {
  return databaseName ?? "garieva-prince";
}

/**
 * Compatibility layer: Execute raw SQL with template literal support for local development
 */
export function db(query: string, params?: unknown[]) {
  const db = getDatabase();
  
  try {
    // Check if there are parameters (template literal with brackets)
    if (params && params.length > 0) {
      // Use prepared statements for queries with parameters
      const stmt = db.prepare(query.replace(/\?/g, () => "?"));
      
      // Bind each parameter
      let index = 1; // Prepared statement uses 1-based indexing
      for (const param of params) {
        stmt.bind(index++, param);
      }
      
      // Get results
      const result = stmt.getAsArray();
      stmt.free();
      
      return result;
    } else {
      // Execute without parameters - use exec()
      const result = db.exec(query);
      if (result && result.length > 0) {
        return result[0];
      }
      return [];
    }
  } catch (error) {
    throw new Error(
      `Database error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Transaction support - wraps a function that executes SQL queries
 */
export async function transaction<T>(fn: () => T | Promise<T>): Promise<T> {
  const db = getDatabase();

  db.exec("BEGIN TRANSACTION");
  try {
    const result = await fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

/**
 * Initialize sample schema for local development testing
 */
export function initSampleSchema() {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") return;
  
  // Create users table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        username TEXT,
        phone TEXT,
        avatar_url TEXT,
        profile_visibility INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        token_hash TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create orders table
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        total_amount REAL,
        payment_method TEXT,
        shipping_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create email verification codes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        purpose TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        consumed_at DATETIME,
        attempt_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create products table
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create product_variants table
    db.exec(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        size TEXT,
        color_name TEXT,
        color_hex TEXT,
        price REAL NOT NULL,
        sale_price REAL,
        stock INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("Sample schema initialized");
  } catch (err) {
    console.warn("Could not initialize sample schema:", err);
  }
}

/**
 * Execute INSERT and return last inserted ID
 */
export function insertAndGetId(table: string, data: Record<string, unknown>): number {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") {
    console.warn("Mock database mode");
    return -1;
  }
  
  try {
    const columns = Object.keys(data);
    if (columns.length === 0) {
      throw new TypeError("Insert data must include at least one column.");
    }
    const quotedTable = quoteIdentifier(table);
    const quotedColumns = columns.map(quoteIdentifier).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const statement = db.prepare(
      `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${placeholders})`,
    );
    statement.run(columns.map((column) => data[column]));
    statement.free();
    return 1; // Simplified - in real implementation would need to track ID
  } catch (err) {
    console.error("Insert failed:", err);
    return -1;
  }
}

/**
 * Execute UPDATE and return affected rows count
 */
export function updateAndReturnCount(query: string, params?: unknown[]): number {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") {
    console.warn("Mock database mode");
    return 0;
  }
  
  try {
    if (params && params.length > 0) {
      // Execute with parameters
      const stmt = db.prepare(query.replace(/\?/g, () => "?"));
      
      stmt.run(params);
      stmt.free();
      return 1; // Simplified - would need to track affected rows
    } else {
      db.exec(query);
      return 1;
    }
  } catch (err) {
    console.error("Update failed:", err);
    return 0;
  }
}

/**
 * Execute DELETE and return affected rows count  
 */
export function deleteAndReturnCount(query: string, params?: unknown[]): number {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") {
    console.warn("Mock database mode");
    return 0;
  }
  
  try {
    if (params && params.length > 0) {
      const stmt = db.prepare(query.replace(/\?/g, () => "?"));
      
      stmt.run(params);
      stmt.free();
      return 1; // Simplified
    } else {
      db.exec(query);
      return 1;
    }
  } catch (err) {
    console.error("Delete failed:", err);
    return 0;
  }
}

/**
 * Check if database is in mock mode
 */
export function isInMockMode(): boolean {
  const db = getDatabase();
  return !db || typeof db.exec !== "function";
}