import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  getCurrentDeliveryChallan,
  getCustomerOrder,
  removeDeliveryChallan,
  replaceDeliveryChallan,
} from "../src/lib/orders/delivery-challan";

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

async function createDatabase() {
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
  for (const [id, email, name] of [
    ["customer", "customer@example.test", "Customer"],
    ["admin", "admin@example.test", "Admin"],
  ]) {
    execute("INSERT INTO users (id, email, name) VALUES (?, ?, ?)", [
      id,
      email,
      name,
    ]);
  }
  execute(
    `INSERT INTO orders
      (id, order_number, user_id, customer_name, customer_email, customer_phone,
       total_amount, status, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "order-1",
      "GP-ORDER-1",
      "customer",
      "Customer",
      "customer@example.test",
      "123456789",
      120000,
      "paid",
      "approved",
    ],
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
          rows.push(statement.getAsObject() as Record<string, unknown>);
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

test("delivery challans are private, replaceable, removable, and audited", async () => {
  const { database, db } = await createDatabase();
  try {
    const first = {
      documentId: "00000000-0000-4000-8000-000000000001",
      orderId: "order-1",
      adminUserId: "admin",
      objectKey:
        "order/00000000-0000-4000-8000-000000000010/00000000-0000-4000-8000-000000000001.pdf",
      mimeType: "application/pdf",
      courier: "Courier One",
      trackingNumber: "TRACK-1",
    };
    assert.equal(
      await replaceDeliveryChallan(database, first),
      true,
    );
    const firstDocument = await getCurrentDeliveryChallan(database, "order-1");
    assert.equal(firstDocument?.id, first.documentId);

    const accountOrder = await getCustomerOrder(
      database,
      "order-1",
      "customer",
    );
    assert.equal(accountOrder?.status, "shipped");
    assert.equal(accountOrder?.hasDeliveryChallan, true);
    assert.equal(await getCustomerOrder(database, "order-1", "admin"), null);

    const second = {
      ...first,
      documentId: "00000000-0000-4000-8000-000000000002",
      objectKey:
        "order/00000000-0000-4000-8000-000000000010/00000000-0000-4000-8000-000000000002.png",
      mimeType: "image/png",
      courier: "Courier Two",
      trackingNumber: "TRACK-2",
    };
    assert.equal(await replaceDeliveryChallan(database, second), true);
    const currentDocument = await getCurrentDeliveryChallan(database, "order-1");
    assert.equal(currentDocument?.id, second.documentId);
    const [replaced] = await database`
      SELECT status, replaced_by FROM order_delivery_documents
      WHERE id = ${first.documentId}
    `;
    assert.deepEqual([replaced.status, replaced.replaced_by], [
      "replaced",
      second.documentId,
    ]);
    const [replacementAudit] = await database`
      SELECT action FROM audit_logs
      WHERE entity_id = ${second.documentId}
    `;
    assert.equal(replacementAudit.action, "delivery_challan_replaced");

    assert.equal(
      await removeDeliveryChallan(database, {
        documentId: second.documentId,
        orderId: "order-1",
        adminUserId: "admin",
      }),
      true,
    );
    assert.equal(await getCurrentDeliveryChallan(database, "order-1"), null);
    const [removed] = await database`
      SELECT status FROM order_delivery_documents
      WHERE id = ${second.documentId}
    `;
    assert.equal(removed.status, "removed");
    const [removeAudit] = await database`
      SELECT action FROM audit_logs
      WHERE entity_id = ${second.documentId}
        AND action = 'delivery_challan_removed'
    `;
    assert.equal(removeAudit.action, "delivery_challan_removed");
  } finally {
    db.close();
  }
});
