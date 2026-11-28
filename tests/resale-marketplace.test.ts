import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  approveResalePayment,
  confirmResaleDelivery,
  createResaleListing,
  createResaleSale,
  finalizeResaleListingPhoto,
  getActiveResaleListings,
  getUserResaleSales,
  markResalePayoutPaid,
  publishResaleListing,
  reserveResaleListingPhoto,
  shipResaleSale,
  submitResalePaymentReference,
} from "../src/lib/resale/marketplace";

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

async function createMarketplaceDatabase() {
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
    ["seller", "seller@example.test", "Seller"],
    ["buyer", "buyer@example.test", "Buyer"],
    ["admin", "admin@example.test", "Admin"],
  ]) {
    execute("INSERT INTO users (id, email, name) VALUES (?, ?, ?)", [
      id,
      email,
      name,
    ]);
  }
  execute(
    "INSERT INTO products (id, name, slug, price, stock) VALUES (?, ?, ?, ?, ?)",
    ["product", "Test piece", "test-piece", 400000, 1],
  );
  execute(
    `INSERT INTO product_items
      (id, product_id, public_id, serial_number, status)
      VALUES (?, ?, ?, ?, 'owned')`,
    ["item", "product", "GP-RESALE-1", "GP-RESALE-1"],
  );
  execute(
    `INSERT INTO ownerships
      (id, product_item_id, user_id, acquisition_type, is_current)
      VALUES (?, ?, ?, 'original_purchase', 1)`,
    ["ownership-original", "item", "seller"],
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

async function createPublishedListing(database: Parameters<typeof createResaleListing>[0]) {
  const listingId = "listing-1";
  assert.equal(
    await createResaleListing(database, {
      listingId,
      sellerUserId: "seller",
      publicId: "GP-RESALE-1",
      price: 400000,
      condition: "good",
      description: "A carefully cared-for piece.",
    }),
    listingId,
  );
  assert.equal(
    (await database`SELECT status FROM resale_listings WHERE id = ${listingId}`)[0]
      .status,
    "draft",
  );
  assert.equal(
    (await database`SELECT status FROM product_items WHERE id = 'item'`)[0]
      .status,
    "listed_for_resale",
  );

  const photoInput = {
    photoId: "photo-1",
    listingId,
    sellerUserId: "seller",
    objectKey: "resale/listing-1/photo-1.jpg",
    contentType: "image/jpeg" as const,
    byteSize: 1024,
  };
  assert.equal(await reserveResaleListingPhoto(database, photoInput), true);
  assert.equal(
    await finalizeResaleListingPhoto(database, {
      photoId: photoInput.photoId,
      listingId,
      sellerUserId: "seller",
    }),
    true,
  );
  assert.equal(
    await publishResaleListing(database, {
      listingId,
      sellerUserId: "seller",
    }),
    true,
  );
  return listingId;
}

test("resale purchase verifies payment and transfers ownership before payout", async () => {
  const { database, db } = await createMarketplaceDatabase();
  try {
    const listingId = await createPublishedListing(database);
    assert.equal(
      await createResaleSale(database, {
        saleId: "sale-1",
        orderNumber: "GP-R-TEST-1",
        listingId,
        buyerUserId: "buyer",
        shippingName: "Buyer",
        shippingPhone: "123456789",
        shippingAddress: "1 Test Street, Test City",
        paymentExpiresAt: "2099-01-01T00:00:00.000Z",
      }),
      true,
    );
    const [sale] = await database`
      SELECT amount, platform_fee, seller_amount
      FROM resale_sales WHERE id = 'sale-1'
    `;
    assert.deepEqual(
      [sale.amount, sale.platform_fee, sale.seller_amount],
      [400000, 20000, 380000],
    );

    assert.equal(
      await markResalePayoutPaid(database, {
        saleId: "sale-1",
        adminUserId: "admin",
        payoutReference: "payout-test",
      }),
      false,
    );
    assert.equal(
      await submitResalePaymentReference(database, {
        saleId: "sale-1",
        buyerUserId: "buyer",
        reference: "payment-test-reference",
      }),
      true,
    );
    assert.equal(
      await approveResalePayment(database, {
        saleId: "sale-1",
        adminUserId: "admin",
      }),
      true,
    );
    assert.equal(
      await shipResaleSale(database, {
        saleId: "sale-1",
        sellerUserId: "seller",
        trackingNumber: "tracking-1",
      }),
      true,
    );
    assert.equal(
      await confirmResaleDelivery(database, {
        saleId: "sale-1",
        buyerUserId: "buyer",
        newOwnershipId: "ownership-resale",
      }),
      true,
    );
    assert.equal(
      (
        await database`
          SELECT user_id FROM ownerships
          WHERE product_item_id = 'item' AND is_current = 1
        `
      )[0].user_id,
      "buyer",
    );
    assert.equal(
      (
        await database`SELECT status FROM resale_listings WHERE id = ${listingId}`
      )[0].status,
      "sold",
    );
    assert.equal(
      await markResalePayoutPaid(database, {
        saleId: "sale-1",
        adminUserId: "admin",
        payoutReference: "payout-test",
      }),
      true,
    );
    const [completedSale] = await database`
      SELECT status, payout_status, payout_reference
      FROM resale_sales WHERE id = 'sale-1'
    `;
    assert.deepEqual(
      [completedSale.status, completedSale.payout_status, completedSale.payout_reference],
      ["completed", "paid", "payout-test"],
    );
  } finally {
    db.close();
  }
});

test("unpaid reservations expire and make their listing available again", async () => {
  const { database, db } = await createMarketplaceDatabase();
  try {
    const listingId = await createPublishedListing(database);
    assert.equal(
      await createResaleSale(database, {
        saleId: "sale-expired",
        orderNumber: "GP-R-EXPIRED",
        listingId,
        buyerUserId: "buyer",
        shippingName: "Buyer",
        shippingPhone: "123456789",
        shippingAddress: "1 Test Street, Test City",
        paymentExpiresAt: "2000-01-01T00:00:00.000Z",
      }),
      true,
    );
    assert.equal(
      await submitResalePaymentReference(database, {
        saleId: "sale-expired",
        buyerUserId: "buyer",
        reference: "too-late-reference",
      }),
      false,
    );
    const sales = await getUserResaleSales(database, "buyer");
    assert.equal(sales[0].status, "expired");
    const listings = await getActiveResaleListings(database);
    assert.equal(listings.length, 1);
    assert.equal(listings[0].id, listingId);
    assert.equal(
      await createResaleSale(database, {
        saleId: "sale-reopened",
        orderNumber: "GP-R-REOPENED",
        listingId,
        buyerUserId: "buyer",
        shippingName: "Buyer",
        shippingPhone: "123456789",
        shippingAddress: "1 Test Street, Test City",
        paymentExpiresAt: "2099-01-01T00:00:00.000Z",
      }),
      true,
    );
    assert.equal((await getActiveResaleListings(database)).length, 0);
  } finally {
    db.close();
  }
});
