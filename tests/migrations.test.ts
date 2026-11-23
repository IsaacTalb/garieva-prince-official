import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

type SQLiteValue = string | number | null | Uint8Array;
type SQLiteDatabase = {
  exec(query: string): Array<{ columns: string[]; values: SQLiteValue[][] }>;
  run(query: string, params?: SQLiteValue[]): void;
  close(): void;
};
type SqlJsInitializer = () => Promise<{
  Database: new () => SQLiteDatabase;
}>;
type SqlJsModule = SqlJsInitializer | { default?: SqlJsInitializer };

const sqlModule = createRequire(import.meta.url)(
  "sql.js/dist/sql-wasm-inline.js",
) as SqlJsModule;
const initializeSqlJs =
  typeof sqlModule === "function" ? sqlModule : sqlModule.default;
if (!initializeSqlJs) {
  throw new TypeError("The SQL.js inline-WASM initializer is unavailable.");
}

test("D1 migrations apply and enforce core data constraints", async () => {
  const SQL = await initializeSqlJs();
  const db = new SQL.Database();

  try {
    const migrationsDirectory = path.resolve("cloudflare", "migrations");
    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((name) => /^\d+.*\.sql$/.test(name))
      .sort();

    assert.equal(migrationFiles.length, 7);
    for (const migration of migrationFiles) {
      db.exec(await readFile(path.join(migrationsDirectory, migration), "utf8"));
    }

    const userColumns = db.exec("PRAGMA table_info(users)")[0].values
      .map((column) => column[1]);
    assert.ok(userColumns.includes("show_wardrobe_publicly"));

    db.run("INSERT INTO users (id, email) VALUES (?, ?)", ["user-1", "owner@example.test"]);
    assert.throws(() =>
      db.run("INSERT INTO users (id, email) VALUES (?, ?)", ["user-2", "owner@example.test"]),
    );
    assert.throws(() =>
      db.run(
        "INSERT INTO users (id, email, show_wardrobe_publicly) VALUES (?, ?, ?)",
        ["user-3", "invalid@example.test", 2],
      ),
    );

    db.run(
      "INSERT INTO products (id, name, slug, price, stock) VALUES (?, ?, ?, ?, ?)",
      ["product-1", "Test piece", "test-piece", 100, 2],
    );
    db.run(
      "INSERT INTO product_items (id, product_id, public_id, serial_number) VALUES (?, ?, ?, ?)",
      ["item-1", "product-1", "GP-TEST-1", "GP-TEST-1"],
    );
    db.run(
      "INSERT INTO ownerships (id, product_item_id, user_id, acquisition_type) VALUES (?, ?, ?, ?)",
      ["ownership-1", "item-1", "user-1", "original_purchase"],
    );
    assert.throws(() =>
      db.run(
        "INSERT INTO ownerships (id, product_item_id, user_id, acquisition_type) VALUES (?, ?, ?, ?)",
        ["ownership-2", "item-1", "user-1", "original_purchase"],
      ),
    );

    db.run(
      "INSERT INTO nfc_verification_events (id, product_item_id, key_version, tap_counter) VALUES (?, ?, ?, ?)",
      ["event-1", "item-1", 1, 5],
    );
    assert.throws(() =>
      db.run(
        "INSERT INTO nfc_verification_events (id, product_item_id, key_version, tap_counter) VALUES (?, ?, ?, ?)",
        ["event-2", "item-1", 1, 5],
      ),
    );
  } finally {
    db.close();
  }
});
