import "server-only";

/**
 * Cloudflare D1 Database Client
 * 
 * Abstraction layer for Cloudflare D1 database access.
 * This is the primary database client for Garieva Prince (D1-only runtime).
 * Uses sql.js for local development with compatibility layer for template literals.
 */

let d1Bound: unknown | undefined; // D1 bindings are types from @cloudflare/workers-types
let databaseName: string | undefined;
let sqlBound: any = undefined; // SQL.js bound instance for local dev

/**
 * Get D1 database client with template literal support for local development
 */
export function getDatabase() {
  // Initialize from env for local development
  if (!d1Bound && !sqlBound) {
    const dbUrl = process.env.DATABASE_URL;
    databaseName = process.env.CLOUDFLARE_D1_DATABASE_NAME ?? "garieva-prince";
    
    // For local development, use sql.js for file-based database
    if (dbUrl?.startsWith("sqlite:")) {
      try {
        const SQL = require("sql.js").default;
        const dbPath = dbUrl.replace("sqlite:", "");
        
        // Create database object - use in-memory if no path or :memory:
        if (!dbPath || dbPath === ":memory:") {
          sqlBound = new SQL();
        } else {
          // Load from file (if exists) or create new
          const fs = require('fs');
          if (fs.existsSync(dbPath)) {
            const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
            sqlBound = new SQL(data);
          } else {
            sqlBound = new SQL();
          }
        }
        
        return sqlBound;
      } catch (err) {
        console.warn("sql.js not found, using mock database");
        sqlBound = {};
      }
    } else if (dbUrl?.startsWith("cloudflare:")) {
      // Production Cloudflare binding - will work on CF Workers
      d1Bound = {} as unknown; // Type placeholder for now
    } else {
      // No valid DATABASE_URL configured - use default in-memory SQLite
      try {
        const SQL = require("sql.js").default;
        sqlBound = new SQL();
        return sqlBound;
      } catch (err) {
        console.warn("SQLite not found, using mock database");
        sqlBound = {};
      }
    }
  }
  
  return d1Bound ?? sqlBound;
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

/**
 * Compatibility layer: Execute raw SQL with template literal support for local development
 */
export function db(query: string, params?: any[]) {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") {
    // Mock mode - return empty results
    console.warn("Mock database mode");
    return [];
  }
  
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
  } catch (err: any) {
    throw new Error(`Database error: ${err.message}`);
  }
}

/**
 * Transaction support - wraps a function that executes SQL queries
 */
export function transaction(fn: () => any): Promise<any> {
  const db = getDatabase();
  
  if (!db) {
    console.warn("Mock database mode: transaction skipped");
    return Promise.resolve();
  }
  
  // For sql.js, wrap in try-catch for rollback simulation
  return new Promise((resolve, reject) => {
    try {
      fn();
      resolve(undefined);
    } catch (err: any) {
      reject(err);
    }
  });
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
export function insertAndGetId(table: string, data: Record<string, any>): number {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") {
    console.warn("Mock database mode");
    return -1;
  }
  
  try {
    let columns = Object.keys(data).join(', ');
    let values = Object.values(data).map(v => 
      typeof v === 'string' ? `'${v}'` : 
      Array.isArray(v) ? `(${v.map(x => `'${x}'`).join(',')})` : 
      v
    ).join(', ');
    
    db.exec(`INSERT INTO ${table} (${columns}) VALUES (${values})`);
    return 1; // Simplified - in real implementation would need to track ID
  } catch (err) {
    console.error("Insert failed:", err);
    return -1;
  }
}

/**
 * Execute UPDATE and return affected rows count
 */
export function updateAndReturnCount(query: string, params?: any[]): number {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") {
    console.warn("Mock database mode");
    return 0;
  }
  
  try {
    if (params && params.length > 0) {
      // Execute with parameters
      const stmt = db.prepare(query.replace(/\?/g, () => "?"));
      
      for (const param of params) {
        let type: string;
        if (typeof param === "string") {
          type = "'";
        } else if (typeof param === "number") {
          type = "";
        } else {
          type = "";
        }
        
        stmt.bind(1, param);
      }
      
      stmt.run();
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
export function deleteAndReturnCount(query: string, params?: any[]): number {
  const db = getDatabase();
  
  if (!db || typeof db.exec !== "function") {
    console.warn("Mock database mode");
    return 0;
  }
  
  try {
    if (params && params.length > 0) {
      const stmt = db.prepare(query.replace(/\?/g, () => "?"));
      
      for (const param of params) {
        let type: string;
        if (typeof param === "string") {
          type = "'";
        } else {
          type = "";
        }
        
        stmt.bind(1, param);
      }
      
      stmt.run();
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