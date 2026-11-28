import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  claimOwnershipAtomically,
  hashOwnershipClaimCode,
} from "../src/lib/nfc/claims";

type SQLiteValue = string | number | null | Uint8Array;
type SQLiteStatement = {
  bind(values: SQLiteValue[]): void;
  step(): boolean;
  free(): void;
};
type SQLiteDatabase = {
  exec(query: string): Array<{ columns: string[]; values: SQLiteValue[][] }>;
  prepare(query: string): SQLiteStatement;
  getRowsModified(): number;
  close(): void;
};
type SqlJsInitializer = () => Promise<{
  Database: new () => SQLiteDatabase;
}>;
type SqlJsModule = SqlJsInitializer | { default?: SqlJsInitializer };

const sqlModule = createRequire(import.meta.url)(
  "sql.js/dist/sql-wasm-inline.js",
) as SqlJsModule;
async function initializeDatabase() {
  if (typeof sqlModule === "function") return sqlModule();
  if (typeof sqlModule.default === "function") return sqlModule.default();
  throw new TypeError("The SQL.js inline-WASM initializer is unavailable.");
}

async function createClaimDatabase() {
  const SQL = await initializeDatabase();
  const db = new SQL.Database();
  const migrationDirectory = path.resolve("cloudflare", "migrations");
  const migrations = (await readdir(migrationDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    db.exec(await readFile(path.join(migrationDirectory, migration), "utf8"));
  }

  const execute = (query: string, params: SQLiteValue[] = []) => {
    const statement = db.prepare(query);
    try {
      statement.bind(params);
      statement.step();
    } finally {
      statement.free();
    }
  };
  execute("INSERT INTO users (id, email) VALUES (?, ?)", ["user-1", "one@example.test"]);
  execute("INSERT INTO users (id, email) VALUES (?, ?)", ["user-2", "two@example.test"]);
  execute(
    "INSERT INTO products (id, name, slug, price, stock) VALUES (?, ?, ?, ?, ?)",
    ["product-1", "Test piece", "test-piece", 100, 1],
  );
  execute(
    "INSERT INTO product_items (id, product_id, public_id, serial_number, status) VALUES (?, ?, ?, ?, ?)",
    ["item-1", "product-1", "GP-CLAIM-1", "GP-CLAIM-1", "available"],
  );
  execute(
    "INSERT INTO nfc_tags (id, product_item_id, chip_uid, provisioning_status) VALUES (?, ?, ?, ?)",
    ["tag-1", "item-1", "04AABBCC", "provisioned"],
  );
  execute(
    `INSERT INTO orders
      (id, order_number, customer_name, customer_email, customer_phone, total_amount, status, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ["order-1", "ORDER-1", "Customer", "one@example.test", "000", 100, "paid", "approved"],
  );
  execute(
    "INSERT INTO order_items (id, order_id, product_id, product_item_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)",
    ["order-item-1", "order-1", "product-1", "item-1", 1, 100],
  );
  execute(
    "INSERT INTO payments (id, order_id, method, amount, status) VALUES (?, ?, ?, ?, ?)",
    ["payment-1", "order-1", "manual", 100, "approved"],
  );
  execute(
    "INSERT INTO ownership_claim_codes (id, product_item_id, code_hash, status, expires_at) VALUES (?, ?, ?, ?, ?)",
    ["claim-1", "item-1", "hash-1", "active", "2099-01-01T00:00:00.000Z"],
  );

  const batch = async (
    statements: Array<{ query: string; params: unknown[] }>,
  ) => {
    db.exec("BEGIN TRANSACTION");
    try {
      const changes = statements.map(({ query, params }) => {
        execute(query, params as SQLiteValue[]);
        return db.getRowsModified();
      });
      db.exec("COMMIT");
      return changes;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  return { db, batch };
}

test("claim transaction creates ownership, updates the item, and audits it", async () => {
  const { db, batch } = await createClaimDatabase();
  try {
    const claimed = await claimOwnershipAtomically({ batch }, {
      publicId: "GP-CLAIM-1",
      userId: "user-1",
      codeHash: "hash-1",
      ownershipId: "ownership-1",
    });

    assert.equal(claimed, true);
    assert.equal(
      db.exec("SELECT status FROM ownership_claim_codes WHERE id = 'claim-1'")[0].values[0][0],
      "redeemed",
    );
    assert.equal(
      db.exec("SELECT status FROM product_items WHERE id = 'item-1'")[0].values[0][0],
      "owned",
    );
    assert.equal(db.exec("SELECT COUNT(*) FROM ownerships WHERE is_current = 1")[0].values[0][0], 1);
    assert.equal(
      db.exec("SELECT action FROM audit_logs WHERE entity_type = 'ownership'")[0].values[0][0],
      "ownership_claimed",
    );
  } finally {
    db.close();
  }
});

test("concurrent attempts with one code have exactly one winner", async () => {
  const { db, batch } = await createClaimDatabase();
  try {
    const results = await Promise.all([
      claimOwnershipAtomically({ batch }, {
        publicId: "GP-CLAIM-1",
        userId: "user-1",
        codeHash: "hash-1",
        ownershipId: "ownership-1",
      }),
      claimOwnershipAtomically({ batch }, {
        publicId: "GP-CLAIM-1",
        userId: "user-2",
        codeHash: "hash-1",
        ownershipId: "ownership-2",
      }),
    ]);

    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(db.exec("SELECT COUNT(*) FROM ownerships WHERE is_current = 1")[0].values[0][0], 1);
    assert.equal(db.exec("SELECT COUNT(*) FROM audit_logs WHERE action = 'ownership_claimed'")[0].values[0][0], 1);
  } finally {
    db.close();
  }
});

test("claim fails without approved payment and leaves the code active", async () => {
  const { db, batch } = await createClaimDatabase();
  try {
    const statement = db.prepare(
      "UPDATE orders SET payment_status = 'rejected' WHERE id = 'order-1'",
    );
    statement.step();
    statement.free();

    const claimed = await claimOwnershipAtomically({ batch }, {
      publicId: "GP-CLAIM-1",
      userId: "user-1",
      codeHash: "hash-1",
      ownershipId: "ownership-1",
    });

    assert.equal(claimed, false);
    assert.equal(
      db.exec("SELECT status FROM ownership_claim_codes WHERE id = 'claim-1'")[0].values[0][0],
      "active",
    );
    assert.equal(db.exec("SELECT COUNT(*) FROM ownerships")[0].values[0][0], 0);
  } finally {
    db.close();
  }
});

test("two valid codes cannot assign the same garment to different users", async () => {
  const { db, batch } = await createClaimDatabase();
  try {
    const statement = db.prepare(
      `INSERT INTO ownership_claim_codes
        (id, product_item_id, code_hash, status, expires_at)
        VALUES ('claim-2', 'item-1', 'hash-2', 'active', '2099-01-01T00:00:00.000Z')`,
    );
    statement.step();
    statement.free();

    const results = await Promise.all([
      claimOwnershipAtomically({ batch }, {
        publicId: "GP-CLAIM-1",
        userId: "user-1",
        codeHash: "hash-1",
        ownershipId: "ownership-1",
      }),
      claimOwnershipAtomically({ batch }, {
        publicId: "GP-CLAIM-1",
        userId: "user-2",
        codeHash: "hash-2",
        ownershipId: "ownership-2",
      }),
    ]);

    assert.equal(results.filter(Boolean).length, 1);
    assert.equal(db.exec("SELECT COUNT(*) FROM ownerships WHERE is_current = 1")[0].values[0][0], 1);
  } finally {
    db.close();
  }
});

test("claim hashing is normalized and uses the configured secret pepper", async () => {
  const priorPepper = process.env.AUTH_OTP_PEPPER;
  process.env.AUTH_OTP_PEPPER = "test-pepper-value-that-is-at-least-32-characters";
  try {
    assert.equal(
      await hashOwnershipClaimCode("aabb-ccdd-0011-2233"),
      await hashOwnershipClaimCode("AABBCCDD00112233"),
    );
  } finally {
    if (priorPepper === undefined) delete process.env.AUTH_OTP_PEPPER;
    else process.env.AUTH_OTP_PEPPER = priorPepper;
  }
});
