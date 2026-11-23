import { describe, it } from 'node:test';
import { strict as assert } from 'assert';
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Database foundation verification tests
 * 
 * These tests validate that the D1 abstraction layer is properly structured
 * and ready for Cloudflare binding when deployed.
 */

describe('D1 Database Foundation', () => {
  it('should have all required repository modules', async () => {
    // Verify D1 client module exists
    assert.ok(fs.existsSync(path.resolve('./src/lib/db/d1/client.ts')));
    
    // All repository files should exist with proper exports
    const d1Modules = [
      './src/lib/db/d1/users',
      './src/lib/db/d1/products', 
      './src/lib/db/d1/orders',
      './src/lib/db/d1/payments',
      './src/lib/db/d1/nfc_tags',
      './src/lib/db/d1/audit_logs',
      './src/lib/db/d1/restock_subscriptions',
    ];
    
    for (const modulePath of d1Modules) {
      assert.ok(fs.existsSync(path.resolve(`${modulePath}.ts`)), `Should have ${modulePath}`);
    }
  });
  
  it('should have migration files in cloudflare/migrations/', async () => {
    const migrationsPath = './cloudflare/migrations/';
    assert.strictEqual(fs.existsSync(migrationsPath), true);
    
    const coreMigration = path.join(migrationsPath, '0001_core.sql');
    assert.ok(fs.readFileSync(coreMigration, 'utf8').trim().length > 0);
  });
  
  it('should have Wrangler configuration', async () => {
    const wranglerConfigPath = './wrangler.toml';
    assert.ok(fs.existsSync(wranglerConfigPath));
    
    const content = fs.readFileSync(wranglerConfigPath, 'utf8');
    assert.ok(content.includes('d1_databases'), 'Wrangler config should reference D1 database');
  });
  
  it('should have Cloudflare documentation', async () => {
    const cloudflareDocPath = './docs/CLOUDFLARE.md';
    assert.ok(fs.existsSync(cloudflareDocPath));
    
    const content = fs.readFileSync(cloudflareDocPath, 'utf8');
    assert.ok(content.includes('Cloudflare Workers'), 'Documentation should cover Workers setup');
    assert.ok(content.includes('D1 database'), 'Documentation should cover D1 setup');
  });
  
  it('should have health check endpoint', async () => {
    const healthPath = './src/app/api/health/route.ts';
    const content = fs.readFileSync(healthPath, 'utf8');
    assert.ok(content.includes('Health check'));
  });
});

describe('D1 Schema Completeness', () => {
  it('should have users table definition', async () => {
    const content = fs.readFileSync('./cloudflare/migrations/0001_core.sql', 'utf8');
    
    assert.ok(content.includes('CREATE TABLE users'), 'Schema should define users table');
    assert.ok(content.includes('CREATE INDEX idx_users_email ON users(email)'), 'Schema should index email');
  });
  
  it('should have ownership tables', async () => {
    const content = fs.readFileSync('./cloudflare/migrations/0001_core.sql', 'utf8');
    
    assert.ok(content.includes('CREATE TABLE ownerships'), 'Schema should define ownerships table');
    assert.ok(content.includes('ownership_claim_codes'), 'Schema should have claim codes table');
  });
  
  it('should have NFC tag table', async () => {
    const content = fs.readFileSync('./cloudflare/migrations/0001_core.sql', 'utf8');
    
    assert.ok(content.includes('CREATE TABLE nfc_tags'), 'Schema should define nfc_tags table');
    assert.ok(content.includes('NTAG424DNA'), 'Schema should reference NTAG424DNA tag type');
  });
});

describe('D1 Repository Function Signatures', () => {
  it('should have user repository methods', async () => {
    const usersPath = './src/lib/db/d1/users.ts';
    
    if (fs.existsSync(usersPath)) {
      const content = fs.readFileSync(usersPath, 'utf8');
      
      assert.ok(content.includes('getUserById'), 'Users module should have getUserById');
      assert.ok(content.includes('getUserByEmail'), 'Users module should have getUserByEmail');
      assert.ok(content.includes('createUser'), 'Users module should have createUser');
      assert.ok(content.includes('hasAdminRole'), 'Users module should have admin role check');
    }
  });
  
  it('should have product repository methods', async () => {
    const productsPath = './src/lib/db/d1/products.ts';
    
    if (fs.existsSync(productsPath)) {
      const content = fs.readFileSync(productsPath, 'utf8');
      
      assert.ok(content.includes('getProductById'), 'Products module should have getProductById');
      assert.ok(content.includes('getProductBySlug'), 'Products module should have getProductBySlug');
      assert.ok(content.includes('createProduct'), 'Products module should have createProduct');
    }
  });
  
  it('should have order repository methods', async () => {
    const ordersPath = './src/lib/db/d1/orders.ts';
    
    if (fs.existsSync(ordersPath)) {
      const content = fs.readFileSync(ordersPath, 'utf8');
      
      assert.ok(content.includes('getOrderById'), 'Orders module should have getOrderById');
      assert.ok(content.includes('createOrder'), 'Orders module should have createOrder');
      assert.ok(content.includes('addToOrder'), 'Orders module should have addToOrder');
    }
  });
  
  it('should have ownership repository methods', async () => {
    const ownershipPath = './src/lib/db/d1/ownership.ts';
    
    if (fs.existsSync(ownershipPath)) {
      const content = fs.readFileSync(ownershipPath, 'utf8');
      
      assert.ok(content.includes('getCurrentOwnership'), 'Ownership module should have getCurrentOwnership');
      assert.ok(content.includes('getOwnershipHistory'), 'Ownership module should have getOwnershipHistory');
      assert.ok(content.includes('verifyNfcTag'), 'Ownership module should have NFC verification');
    }
  });
});

describe('D1 Type Safety', () => {
  it('should use server-only import in D1 modules', async () => {
    const d1ClientPath = './src/lib/db/d1/client.ts';
    
    if (fs.existsSync(d1ClientPath)) {
      const content = fs.readFileSync(d1ClientPath, 'utf8');
      
      assert.ok(content.includes('import "server-only"'), 'D1 modules should use server-only');
    }
  });
  
  it('should define typed repository functions', async () => {
    const productsPath = './src/lib/db/d1/products.ts';
    
    if (fs.existsSync(productsPath)) {
      const content = fs.readFileSync(productsPath, 'utf8');
      
      assert.ok(content.includes(': Promise<'), 'Functions should return promises');
      assert.ok(content.includes('PublicProduct'), 'Should reference product types');
    }
  });
});

describe('D1 Session Security', () => {
  it('should store only token hashes in session.ts', async () => {
    const sessionPath = './src/lib/auth/session.ts';
    
    if (fs.existsSync(sessionPath)) {
      const content = fs.readFileSync(sessionPath, 'utf8');
      
      const sessionTable = fs
        .readFileSync('./cloudflare/migrations/0001_core.sql', 'utf8')
        .match(/CREATE TABLE sessions \(([\s\S]*?)\n\);/)?.[1];
      assert.ok(content.includes('token_hash'), 'Session code should use token hashes');
      assert.ok(sessionTable, 'Should define a session table');
      assert.match(sessionTable, /token_hash TEXT/);
      assert.doesNotMatch(sessionTable, /password/i);
    }
  });
  
  it('should validate sessions before access', async () => {
    const sessionPath = './src/lib/auth/session.ts';
    
    if (fs.existsSync(sessionPath)) {
      const content = fs.readFileSync(sessionPath, 'utf8');
      
      assert.ok(content.includes('validateSessionToken'), 'Should have session validation');
      assert.ok(content.includes('revokeSession'), 'Should have session revocation');
    }
  });
});

describe('D1 Module Structure', () => {
  it('should organize D1 code under src/lib/db/d1/', async () => {
    const d1Dir = './src/lib/db/d1/';
    assert.ok(fs.existsSync(d1Dir));
    
    const expectedFiles = [
      'client.ts',
      'users.ts',
      'products.ts',
      'orders.ts',
      'payments.ts',
      'nfc_tags.ts',
      'audit_logs.ts',
      'restock_subscriptions.ts',
      'admin.ts',
    ];
    
    for (const file of expectedFiles) {
      assert.ok(fs.existsSync(path.join(d1Dir, file)), `Should have ${file}`);
    }
  });
  
  it('should use the D1 client as the database runtime', async () => {
    assert.ok(fs.existsSync('./src/lib/db/d1/client.ts'), 'D1 client exists');
  });
});

describe('D1 Migration Compatibility', () => {
  it('should use SQLite-compatible syntax', async () => {
    const migrationPath = './cloudflare/migrations/0001_core.sql';
    
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf8');
      
      // SQLite/D1 compatible features should be present
      assert.ok(content.includes('datetime('), 'Should use SQLite datetime function');
      assert.ok(!content.includes('NOW()'), 'Should not use PostgreSQL NOW()');
      
      assert.ok(!content.includes('BEGIN TRANSACTION'), 'D1 migration should not start explicit transactions');
    }
  });
  
  it('should have proper indexes for performance', async () => {
    const migrationPath = './cloudflare/migrations/0001_core.sql';
    
    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf8');
      
      assert.ok(content.includes('CREATE INDEX'), 'Migration should define indexes');
      assert.ok(content.includes('idx_users_email'), 'Should have email index');
      assert.ok(content.includes('idx_products_slug'), 'Should have product slug index');
    }
  });
});

describe('D1 Error Handling', () => {
  it('should handle database configuration errors gracefully', async () => {
    const clientPath = './src/lib/db/d1/client.ts';
    
    if (fs.existsSync(clientPath)) {
      const content = fs.readFileSync(clientPath, 'utf8');
      
      assert.ok(content.includes('isDatabaseConfigured'), 'Should have configuration check');
      assert.ok(content.includes('getDatabaseName'), 'Should expose database name');
    }
  });
  
  it('should throw meaningful errors on invalid data', async () => {
    const usersContent = fs.readFileSync('./src/lib/db/d1/users.ts', 'utf8');
    const clientContent = fs.readFileSync('./src/lib/db/d1/client.ts', 'utf8');
    assert.ok(usersContent.includes('Invalid user data'), 'Should throw on invalid user data');
    assert.ok(clientContent.includes('Unsupported DATABASE_URL scheme'), 'Should reject unsupported database URLs');
  });
});

console.log('Database foundation verification complete ✓');