import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  acceptOwnershipTransfer,
  cancelOwnershipTransfer,
  completeOwnershipTransfer,
  confirmOwnershipTransfer,
  createOwnershipTransfer,
  getUserOwnershipTransfers,
} from "../src/lib/ownership/transfers";

type SQLiteValue = string | number | null | Uint8Array;
type SQLiteStatement = {
  bind(values: SQLiteValue[]): void;
  step(): boolean;
  getAsObject(): Record<string, SQLiteValue>;
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

async function initializeSqlJs() {
  if (typeof sqlModule === "function") return sqlModule();
  if (typeof sqlModule.default === "function") return sqlModule.default();
  throw new TypeError("The SQL.js inline-WASM initializer is unavailable.");
}

async function createTransferDatabase() {
  const SQL = await initializeSqlJs();
  const db = new SQL.Database();
  const migrationsDirectory = path.resolve("cloudflare", "migrations");
  const migrations = (await readdir(migrationsDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    db.exec(await readFile(path.join(migrationsDirectory, migration), "utf8"));
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
  execute("INSERT INTO users (id, email, name) VALUES (?, ?, ?)", [
    "sender",
    "sender@example.test",
    "Sender",
  ]);
  execute("INSERT INTO users (id, email, name) VALUES (?, ?, ?)", [
    "recipient",
    "recipient@example.test",
    "Recipient",
  ]);
  execute("INSERT INTO users (id, email, name) VALUES (?, ?, ?)", [
    "other",
    "other@example.test",
    "Other",
  ]);
  execute(
    "INSERT INTO products (id, name, slug, price, stock) VALUES (?, ?, ?, ?, ?)",
    ["product", "Test piece", "test-piece", 100, 1],
  );
  execute(
    `INSERT INTO product_items
      (id, product_id, public_id, serial_number, status)
      VALUES (?, ?, ?, ?, ?)`,
    ["item", "product", "GP-TRANSFER-1", "GP-TRANSFER-1", "owned"],
  );
  execute(
    `INSERT INTO ownerships
      (id, product_item_id, user_id, acquisition_type, is_current)
      VALUES (?, ?, ?, ?, 1)`,
    ["ownership-original", "item", "sender", "original_purchase"],
  );
  execute(
    `INSERT INTO nfc_tags
      (id, product_item_id, chip_uid, provisioning_status)
      VALUES (?, ?, ?, ?)`,
    ["tag", "item", "04AABBCC", "provisioned"],
  );

  const database = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.reduce(
        (text, part, index) => text + (index ? "?" : "") + part,
        "",
      );
      const statement = db.prepare(query);
      try {
        statement.bind(values as SQLiteValue[]);
        const rows: Record<string, unknown>[] = [];
        while (statement.step()) {
          rows.push(
            statement.getAsObject() as Record<string, unknown>,
          );
        }
        return rows;
      } finally {
        statement.free();
      }
    },
    {
      batch: async (statements: { query: string; params: unknown[] }[]) => {
        db.exec("BEGIN TRANSACTION");
        try {
          const changes = statements.map(({ query, params }) => {
            const statement = db.prepare(query);
            try {
              statement.bind(params as SQLiteValue[]);
              statement.step();
              return db.getRowsModified();
            } finally {
              statement.free();
            }
          });
          db.exec("COMMIT");
          return changes;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    },
  );

  return { database, db };
}

const transferInput = {
  publicId: "GP-TRANSFER-1",
  fromUserId: "sender",
  recipientEmail: "recipient@example.test",
  transferId: "transfer-1",
  expiresAt: "2099-01-01T00:00:00.000Z",
};

test("ownership transfer keeps the sender as owner until atomic completion", async () => {
  const { database, db } = await createTransferDatabase();
  try {
    assert.equal(
      await createOwnershipTransfer(database, transferInput),
      true,
    );
    assert.equal(
      await acceptOwnershipTransfer(database, {
        transferId: "transfer-1",
        recipientUserId: "other",
      }),
      false,
    );
    assert.equal(
      await acceptOwnershipTransfer(database, {
        transferId: "transfer-1",
        recipientUserId: "recipient",
      }),
      true,
    );
    assert.equal(
      await confirmOwnershipTransfer(database, {
        transferId: "transfer-1",
        fromUserId: "recipient",
      }),
      false,
    );
    assert.equal(
      await confirmOwnershipTransfer(database, {
        transferId: "transfer-1",
        fromUserId: "sender",
      }),
      true,
    );

    const ownerBeforeCompletion = db.exec(
      "SELECT user_id FROM ownerships WHERE product_item_id = 'item' AND is_current = 1",
    )[0].values[0][0];
    assert.equal(ownerBeforeCompletion, "sender");
    const completionResults = await Promise.all([
      completeOwnershipTransfer(database, {
        transferId: "transfer-1",
        fromUserId: "sender",
        newOwnershipId: "ownership-transfer",
      }),
      completeOwnershipTransfer(database, {
        transferId: "transfer-1",
        fromUserId: "sender",
        newOwnershipId: "ownership-transfer-replay",
      }),
    ]);
    assert.deepEqual(completionResults.sort(), [false, true]);
    const ownerships = db.exec(
      "SELECT user_id, acquisition_type, is_current FROM ownerships WHERE product_item_id = 'item' ORDER BY started_at",
    )[0].values;
    assert.deepEqual(ownerships, [
      ["sender", "original_purchase", 0],
      ["recipient", "transfer", 1],
    ]);
    assert.deepEqual(
      db.exec("SELECT status FROM product_items WHERE id = 'item'")[0].values,
      [["owned"]],
    );
    assert.deepEqual(
      db.exec("SELECT product_item_id, chip_uid FROM nfc_tags WHERE id = 'tag'")[0]
        .values,
      [["item", "04AABBCC"]],
    );
    assert.deepEqual(
      db.exec(
        "SELECT action FROM audit_logs WHERE entity_type = 'ownership_transfer' ORDER BY action",
      )[0].values,
      [
        ["transfer_completed"],
        ["transfer_confirmed"],
        ["transfer_initiated"],
        ["transfer_recipient_verified"],
      ],
    );
  } finally {
    db.close();
  }
});

test("ownership transfer rejects duplicate active requests and replayed actions", async () => {
  const { database, db } = await createTransferDatabase();
  try {
    assert.equal(await createOwnershipTransfer(database, transferInput), true);
    assert.equal(
      await createOwnershipTransfer(database, {
        ...transferInput,
        transferId: "transfer-2",
      }),
      false,
    );
    assert.equal(
      await acceptOwnershipTransfer(database, {
        transferId: "transfer-1",
        recipientUserId: "recipient",
      }),
      true,
    );
    assert.equal(
      await acceptOwnershipTransfer(database, {
        transferId: "transfer-1",
        recipientUserId: "recipient",
      }),
      false,
    );
    assert.equal(
      db.exec(
        "SELECT count(*) FROM audit_logs WHERE action = 'transfer_recipient_verified'",
      )[0].values[0][0],
      1,
    );
  } finally {
    db.close();
  }
});

test("ownership transfer cancellation and expiry preserve ownership", async () => {
  const { database, db } = await createTransferDatabase();
  try {
    assert.equal(await createOwnershipTransfer(database, transferInput), true);
    assert.equal(
      await cancelOwnershipTransfer(database, {
        transferId: "transfer-1",
        actorUserId: "other",
      }),
      false,
    );
    assert.equal(
      await cancelOwnershipTransfer(database, {
        transferId: "transfer-1",
        actorUserId: "recipient",
      }),
      true,
    );
    assert.equal(
      await createOwnershipTransfer(database, {
        ...transferInput,
        transferId: "transfer-2",
        expiresAt: "2000-01-01T00:00:00.000Z",
      }),
      true,
    );
    const transfers = await getUserOwnershipTransfers(database, "sender");
    assert.equal(transfers.find((transfer) => transfer.id === "transfer-2")?.status, "expired");
    assert.deepEqual(
      db.exec(
        "SELECT user_id FROM ownerships WHERE product_item_id = 'item' AND is_current = 1",
      )[0].values,
      [["sender"]],
    );
    assert.equal(
      db.exec(
        "SELECT count(*) FROM audit_logs WHERE action = 'transfer_expired'",
      )[0].values[0][0],
      1,
    );
  } finally {
    db.close();
  }
});
