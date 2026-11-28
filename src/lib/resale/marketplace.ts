import type { DatabaseBatchStatement } from "@/lib/db/d1/client";

type MarketplaceDatabase = ((
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>) & {
  batch(statements: DatabaseBatchStatement[]): Promise<number[]>;
};

export type ResaleCondition = "new" | "like_new" | "good" | "fair";
export type ResaleListingStatus =
  | "draft"
  | "active"
  | "reserved"
  | "sold"
  | "withdrawn";
export type ResaleSaleStatus =
  | "pending_payment"
  | "paid"
  | "shipped"
  | "completed"
  | "payment_rejected"
  | "cancelled"
  | "expired";
export type ResalePaymentStatus = "pending" | "approved" | "rejected" | "expired";
export type ResalePayoutStatus = "pending" | "ready" | "paid";

export type ResaleListing = {
  id: string;
  publicId: string;
  serialNumber: string;
  productName: string;
  price: number;
  condition: ResaleCondition;
  description: string;
  photos: string[];
  status: ResaleListingStatus;
  sellerUserId: string;
  createdAt: string;
};

export type ResaleItem = {
  productItemId: string;
  publicId: string;
  serialNumber: string;
  productName: string;
  photos: string[];
};

export type ResaleSale = {
  id: string;
  orderNumber: string;
  listingId: string;
  productName: string;
  serialNumber: string;
  publicId: string;
  sellerUserId: string;
  sellerName: string | null;
  sellerEmail: string;
  buyerUserId: string;
  buyerName: string | null;
  buyerEmail: string;
  amount: number;
  platformFee: number;
  sellerAmount: number;
  paymentExpiresAt: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  paymentReference: string | null;
  paymentStatus: ResalePaymentStatus;
  status: ResaleSaleStatus;
  trackingNumber: string | null;
  payoutStatus: ResalePayoutStatus;
  payoutReference: string | null;
  createdAt: string;
};

function photoUrls(value: unknown, publicBaseUrl?: string): string[] {
  if (!publicBaseUrl) return [];
  const parsed: unknown = JSON.parse(String(value));
  if (!Array.isArray(parsed) || parsed.some((key) => typeof key !== "string")) {
    throw new TypeError("Invalid resale listing photo data.");
  }
  const baseUrl = publicBaseUrl.replace(/\/$/, "");
  return parsed.map((key) => `${baseUrl}/${key}`);
}

function parseListing(
  row: Record<string, unknown>,
  publicBaseUrl?: string,
): ResaleListing {
  return {
    id: String(row.id),
    publicId: String(row.public_id),
    serialNumber: String(row.serial_number),
    productName: String(row.product_name),
    price: Number(row.price),
    condition: String(row.condition) as ResaleCondition,
    description: String(row.description),
    photos: photoUrls(row.photos_json, publicBaseUrl),
    status: String(row.status) as ResaleListingStatus,
    sellerUserId: String(row.seller_user_id),
    createdAt: String(row.created_at),
  };
}

function parseSale(row: Record<string, unknown>): ResaleSale {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    listingId: String(row.listing_id),
    productName: String(row.product_name),
    serialNumber: String(row.serial_number),
    publicId: String(row.public_id),
    sellerUserId: String(row.seller_user_id),
    sellerName: row.seller_name == null ? null : String(row.seller_name),
    sellerEmail: String(row.seller_email),
    buyerUserId: String(row.buyer_user_id),
    buyerName: row.buyer_name == null ? null : String(row.buyer_name),
    buyerEmail: String(row.buyer_email),
    amount: Number(row.amount),
    platformFee: Number(row.platform_fee),
    sellerAmount: Number(row.seller_amount),
    paymentExpiresAt: String(row.payment_expires_at),
    shippingName: String(row.shipping_name),
    shippingPhone: String(row.shipping_phone),
    shippingAddress: String(row.shipping_address),
    paymentReference:
      row.payment_reference == null ? null : String(row.payment_reference),
    paymentStatus: String(row.payment_status) as ResalePaymentStatus,
    status: String(row.status) as ResaleSaleStatus,
    trackingNumber:
      row.tracking_number == null ? null : String(row.tracking_number),
    payoutStatus: String(row.payout_status) as ResalePayoutStatus,
    payoutReference:
      row.payout_reference == null ? null : String(row.payout_reference),
    createdAt: String(row.created_at),
  };
}

async function expireUnpaidResaleReservations(
  database: MarketplaceDatabase,
): Promise<void> {
  await database.batch([
    {
      query: `
        UPDATE resale_sales
        SET status = 'expired', payment_status = 'expired',
            updated_at = datetime('now')
        WHERE status = 'pending_payment'
          AND payment_status = 'pending'
          AND payment_reference IS NULL
          AND datetime(payment_expires_at) <= datetime('now')
      `,
      params: [],
    },
    {
      query: `
        UPDATE resale_listings
        SET status = 'active', updated_at = datetime('now')
        WHERE status = 'reserved'
          AND id IN (
            SELECT listing_id FROM resale_sales
            WHERE status = 'expired' AND payment_status = 'expired'
          )
          AND NOT EXISTS (
            SELECT 1 FROM resale_sales open_sale
            WHERE open_sale.listing_id = resale_listings.id
              AND open_sale.status IN ('pending_payment', 'paid', 'shipped')
          )
      `,
      params: [],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, entity_type, entity_id, action, after_json)
        SELECT lower(hex(randomblob(16))), 'resale_sale', sale.id,
          'resale_payment_expired', ?
        FROM resale_sales sale
        WHERE sale.status = 'expired'
          AND sale.payment_status = 'expired'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_sale'
              AND audit.entity_id = sale.id
              AND audit.action = 'resale_payment_expired'
          )
      `,
      params: [JSON.stringify({ status: "expired" })],
    },
  ]);
}

export async function getActiveResaleListings(
  database: MarketplaceDatabase,
  publicBaseUrl?: string,
): Promise<ResaleListing[]> {
  await expireUnpaidResaleReservations(database);
  const rows = await database`
    SELECT listing.id, listing.product_item_id, listing.seller_user_id,
           listing.price, listing.condition, listing.description,
           listing.photos_json, listing.status, listing.created_at,
           pi.public_id, pi.serial_number, product.name AS product_name
    FROM resale_listings listing
    JOIN product_items pi ON pi.id = listing.product_item_id
    JOIN products product ON product.id = pi.product_id
    WHERE listing.status = 'active'
      AND pi.status = 'listed_for_resale'
    ORDER BY listing.created_at DESC, listing.id DESC
    LIMIT 100
  `;
  return rows.map((row) => parseListing(row, publicBaseUrl));
}

export async function getActiveResaleListing(
  database: MarketplaceDatabase,
  listingId: string,
  publicBaseUrl?: string,
): Promise<ResaleListing | null> {
  await expireUnpaidResaleReservations(database);
  const rows = await database`
    SELECT listing.id, listing.product_item_id, listing.seller_user_id,
           listing.price, listing.condition, listing.description,
           listing.photos_json, listing.status, listing.created_at,
           pi.public_id, pi.serial_number, product.name AS product_name
    FROM resale_listings listing
    JOIN product_items pi ON pi.id = listing.product_item_id
    JOIN products product ON product.id = pi.product_id
    WHERE listing.id = ${listingId}
      AND listing.status = 'active'
      AND pi.status = 'listed_for_resale'
    LIMIT 1
  `;
  return rows[0] ? parseListing(rows[0], publicBaseUrl) : null;
}

export async function getEligibleResaleItems(
  database: MarketplaceDatabase,
  userId: string,
  publicBaseUrl?: string,
): Promise<ResaleItem[]> {
  const rows = await database`
    SELECT pi.id AS product_item_id, pi.public_id, pi.serial_number,
           product.name AS product_name, media.object_key
    FROM product_items pi
    JOIN products product ON product.id = pi.product_id
    JOIN ownerships owner
      ON owner.product_item_id = pi.id
      AND owner.user_id = ${userId}
      AND owner.is_current = 1
    LEFT JOIN product_media media ON media.product_id = product.id
    WHERE pi.status = 'owned'
      AND NOT EXISTS (
        SELECT 1 FROM ownership_transfers transfer
        WHERE transfer.product_item_id = pi.id
          AND transfer.status IN (
            'initiated',
            'recipient_pending',
            'recipient_verified',
            'confirmed'
          )
      )
      AND NOT EXISTS (
        SELECT 1 FROM resale_listings listing
        WHERE listing.product_item_id = pi.id
          AND listing.status IN ('draft', 'active', 'reserved')
      )
    ORDER BY owner.started_at DESC, pi.serial_number, media.position
  `;

  const grouped = new Map<string, ResaleItem & { photoKeys: string[] }>();
  for (const row of rows) {
    const id = String(row.product_item_id);
    let item = grouped.get(id);
    if (!item) {
      item = {
        productItemId: id,
        publicId: String(row.public_id),
        serialNumber: String(row.serial_number),
        productName: String(row.product_name),
        photos: [],
        photoKeys: [],
      };
      grouped.set(id, item);
    }
    if (row.object_key != null) item.photoKeys.push(String(row.object_key));
  }

  const baseUrl = publicBaseUrl?.replace(/\/$/, "");
  return [...grouped.values()].map(({ photoKeys, ...item }) => ({
    ...item,
    photos: baseUrl ? photoKeys.map((key) => `${baseUrl}/${key}`) : [],
  }));
}

export async function getUserResaleListings(
  database: MarketplaceDatabase,
  userId: string,
  publicBaseUrl?: string,
): Promise<ResaleListing[]> {
  await expireUnpaidResaleReservations(database);
  const rows = await database`
    SELECT listing.id, listing.product_item_id, listing.seller_user_id,
           listing.price, listing.condition, listing.description,
           listing.photos_json, listing.status, listing.created_at,
           pi.public_id, pi.serial_number, product.name AS product_name
    FROM resale_listings listing
    JOIN product_items pi ON pi.id = listing.product_item_id
    JOIN products product ON product.id = pi.product_id
    WHERE listing.seller_user_id = ${userId}
    ORDER BY listing.created_at DESC, listing.id DESC
    LIMIT 100
  `;
  return rows.map((row) => parseListing(row, publicBaseUrl));
}

export async function getUserResaleSales(
  database: MarketplaceDatabase,
  userId: string,
): Promise<ResaleSale[]> {
  await expireUnpaidResaleReservations(database);
  const rows = await database`
    SELECT sale.id, sale.order_number, sale.listing_id, sale.seller_user_id,
           sale.buyer_user_id, sale.amount, sale.platform_fee, sale.seller_amount,
           sale.shipping_name, sale.shipping_phone, sale.shipping_address,
           sale.payment_reference, sale.payment_status, sale.status,
           sale.tracking_number, sale.payout_status, sale.payout_reference,
           sale.payment_expires_at, sale.created_at,
           pi.public_id, pi.serial_number,
           product.name AS product_name,
           COALESCE(NULLIF(trim(seller.name), ''), seller.username) AS seller_name,
           seller.email AS seller_email,
           COALESCE(NULLIF(trim(buyer.name), ''), buyer.username) AS buyer_name,
           buyer.email AS buyer_email
    FROM resale_sales sale
    JOIN resale_listings listing ON listing.id = sale.listing_id
    JOIN product_items pi ON pi.id = listing.product_item_id
    JOIN products product ON product.id = pi.product_id
    JOIN users seller ON seller.id = sale.seller_user_id
    JOIN users buyer ON buyer.id = sale.buyer_user_id
    WHERE sale.seller_user_id = ${userId}
       OR sale.buyer_user_id = ${userId}
    ORDER BY sale.created_at DESC, sale.id DESC
    LIMIT 100
  `;
  return rows.map(parseSale);
}

export async function getResaleAdminSales(
  database: MarketplaceDatabase,
): Promise<ResaleSale[]> {
  await expireUnpaidResaleReservations(database);
  const rows = await database`
    SELECT sale.id, sale.order_number, sale.listing_id, sale.seller_user_id,
           sale.buyer_user_id, sale.amount, sale.platform_fee, sale.seller_amount,
           sale.shipping_name, sale.shipping_phone, sale.shipping_address,
           sale.payment_reference, sale.payment_status, sale.status,
           sale.tracking_number, sale.payout_status, sale.payout_reference,
           sale.payment_expires_at, sale.created_at,
           pi.public_id, pi.serial_number,
           product.name AS product_name,
           COALESCE(NULLIF(trim(seller.name), ''), seller.username) AS seller_name,
           seller.email AS seller_email,
           COALESCE(NULLIF(trim(buyer.name), ''), buyer.username) AS buyer_name,
           buyer.email AS buyer_email
    FROM resale_sales sale
    JOIN resale_listings listing ON listing.id = sale.listing_id
    JOIN product_items pi ON pi.id = listing.product_item_id
    JOIN products product ON product.id = pi.product_id
    JOIN users seller ON seller.id = sale.seller_user_id
    JOIN users buyer ON buyer.id = sale.buyer_user_id
    ORDER BY
      CASE
        WHEN sale.status = 'pending_payment' THEN 0
        WHEN sale.status = 'shipped' THEN 1
        WHEN sale.payout_status = 'ready' THEN 2
        ELSE 3
      END,
      sale.created_at DESC
    LIMIT 200
  `;
  return rows.map(parseSale);
}

export async function createResaleListing(
  database: MarketplaceDatabase,
  input: {
    listingId: string;
    sellerUserId: string;
    publicId: string;
    price: number;
    condition: ResaleCondition;
    description: string;
  },
): Promise<string | null> {
  const changes = await database.batch([
    {
      query: `
        INSERT INTO resale_listings
          (id, product_item_id, seller_user_id, price, condition, description,
           photos_json, status)
        SELECT ?, pi.id, ?, ?, ?, ?, '[]', 'draft'
        FROM product_items pi
        JOIN ownerships owner
          ON owner.product_item_id = pi.id
          AND owner.user_id = ?
          AND owner.is_current = 1
        WHERE pi.public_id = ?
          AND pi.status = 'owned'
          AND NOT EXISTS (
            SELECT 1 FROM ownership_transfers transfer
            WHERE transfer.product_item_id = pi.id
              AND transfer.status IN (
                'initiated',
                'recipient_pending',
                'recipient_verified',
                'confirmed'
              )
          )
          AND NOT EXISTS (
            SELECT 1 FROM resale_listings listing
            WHERE listing.product_item_id = pi.id
              AND listing.status IN ('draft', 'active', 'reserved')
          )
        LIMIT 1
      `,
      params: [
        input.listingId,
        input.sellerUserId,
        input.price,
        input.condition,
        input.description,
        input.sellerUserId,
        input.publicId,
      ],
    },
    {
      query: `
        UPDATE product_items
        SET status = 'listed_for_resale', updated_at = datetime('now')
        WHERE id = (
          SELECT product_item_id FROM resale_listings
          WHERE id = ? AND status = 'draft' AND seller_user_id = ?
        )
          AND status = 'owned'
      `,
      params: [input.listingId, input.sellerUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, seller_user_id, 'resale_listing', listing.id,
          'resale_listing_created', ?
        FROM resale_listings listing
        JOIN product_items pi ON pi.id = listing.product_item_id
        WHERE listing.id = ?
          AND listing.status = 'draft'
          AND pi.status = 'listed_for_resale'
        UNION ALL
        SELECT ?, ?, 'resale_listing', NULL, 'resale_listing_created', ?
        WHERE EXISTS (
          SELECT 1 FROM resale_listings listing
          JOIN product_items pi ON pi.id = listing.product_item_id
          WHERE listing.id = ?
            AND listing.status = 'draft'
            AND pi.status != 'listed_for_resale'
        )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "draft" }),
        input.listingId,
        crypto.randomUUID(),
        input.sellerUserId,
        JSON.stringify({ status: "creation_failed" }),
        input.listingId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1)
    ? input.listingId
    : null;
}

export async function reserveResaleListingPhoto(
  database: MarketplaceDatabase,
  input: {
    photoId: string;
    listingId: string;
    sellerUserId: string;
    objectKey: string;
    contentType: "image/jpeg" | "image/png";
    byteSize: number;
  },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        INSERT INTO resale_listing_photos
          (id, listing_id, object_key, position, content_type, byte_size, status)
        SELECT ?, listing.id, ?,
          COALESCE((
            SELECT MAX(position) + 1
            FROM resale_listing_photos
            WHERE listing_id = listing.id
          ), 0),
          ?, ?, 'pending'
        FROM resale_listings listing
        JOIN product_items pi ON pi.id = listing.product_item_id
        WHERE listing.id = ?
          AND listing.seller_user_id = ?
          AND listing.status IN ('draft', 'active')
          AND pi.status = 'listed_for_resale'
          AND (
            SELECT COUNT(*) FROM resale_listing_photos photo
            WHERE photo.listing_id = listing.id
              AND photo.status IN ('pending', 'uploaded')
          ) < 5
          AND (
            SELECT COUNT(*)
            FROM resale_listing_photos photo
            JOIN resale_listings owner_listing ON owner_listing.id = photo.listing_id
            WHERE owner_listing.seller_user_id = listing.seller_user_id
              AND datetime(photo.created_at) >= datetime('now', '-24 hours')
          ) < 15
      `,
      params: [
        input.photoId,
        input.objectKey,
        input.contentType,
        input.byteSize,
        input.listingId,
        input.sellerUserId,
      ],
    },
  ]);
  return changes[0] === 1;
}

export async function finalizeResaleListingPhoto(
  database: MarketplaceDatabase,
  input: { photoId: string; listingId: string; sellerUserId: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_listing_photos
        SET status = 'uploaded'
        WHERE id = ? AND listing_id = ? AND status = 'pending'
      `,
      params: [input.photoId, input.listingId],
    },
    {
      query: `
        UPDATE resale_listings
        SET photos_json = (
              SELECT json_group_array(object_key)
              FROM (
                SELECT object_key FROM resale_listing_photos
                WHERE listing_id = ? AND status = 'uploaded'
                ORDER BY position
              )
            ),
            updated_at = datetime('now')
        WHERE id = ?
          AND seller_user_id = ?
          AND status IN ('draft', 'active')
          AND EXISTS (
            SELECT 1 FROM resale_listing_photos
            WHERE id = ? AND listing_id = ? AND status = 'uploaded'
          )
      `,
      params: [
        input.listingId,
        input.listingId,
        input.sellerUserId,
        input.photoId,
        input.listingId,
      ],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'resale_listing', listing.id,
          'resale_listing_photo_uploaded', ?
        FROM resale_listings listing
        WHERE listing.id = ?
          AND listing.seller_user_id = ?
          AND EXISTS (
            SELECT 1 FROM resale_listing_photos photo
            WHERE photo.id = ? AND photo.status = 'uploaded'
              AND EXISTS (
                SELECT 1 FROM json_each(listing.photos_json)
                WHERE value = photo.object_key
              )
          )
        UNION ALL
        SELECT ?, ?, 'resale_listing', NULL,
          'resale_listing_photo_uploaded', ?
        WHERE EXISTS (
          SELECT 1 FROM resale_listing_photos
          WHERE id = ? AND listing_id = ? AND status = 'uploaded'
        )
          AND NOT EXISTS (
            SELECT 1 FROM resale_listings listing
            JOIN resale_listing_photos photo ON photo.listing_id = listing.id
            WHERE listing.id = ?
              AND photo.id = ?
              AND photo.status = 'uploaded'
              AND EXISTS (
                SELECT 1 FROM json_each(listing.photos_json)
                WHERE value = photo.object_key
              )
          )
      `,
      params: [
        crypto.randomUUID(),
        input.sellerUserId,
        JSON.stringify({ action: "photo_uploaded" }),
        input.listingId,
        input.sellerUserId,
        input.photoId,
        crypto.randomUUID(),
        input.sellerUserId,
        JSON.stringify({ action: "photo_finalize_failed" }),
        input.photoId,
        input.listingId,
        input.listingId,
        input.photoId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function failResaleListingPhoto(
  database: MarketplaceDatabase,
  input: { photoId: string; sellerUserId: string },
): Promise<boolean> {
  const [row] = await database`
    SELECT photo.id
    FROM resale_listing_photos photo
    JOIN resale_listings listing ON listing.id = photo.listing_id
    WHERE photo.id = ${input.photoId}
      AND listing.seller_user_id = ${input.sellerUserId}
      AND photo.status = 'pending'
  `;
  if (!row) return false;
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_listing_photos
        SET status = 'failed'
        WHERE id = ? AND status = 'pending'
      `,
      params: [input.photoId],
    },
  ]);
  return changes[0] === 1;
}

export async function publishResaleListing(
  database: MarketplaceDatabase,
  input: { listingId: string; sellerUserId: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_listings
        SET status = 'active', updated_at = datetime('now')
        WHERE id = ?
          AND seller_user_id = ?
          AND status = 'draft'
          AND EXISTS (
            SELECT 1 FROM product_items pi
            WHERE pi.id = resale_listings.product_item_id
              AND pi.status = 'listed_for_resale'
          )
          AND EXISTS (
            SELECT 1 FROM resale_listing_photos photo
            WHERE photo.listing_id = resale_listings.id
              AND photo.status = 'uploaded'
          )
      `,
      params: [input.listingId, input.sellerUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'resale_listing', listing.id,
          'resale_listing_published', ?
        FROM resale_listings listing
        WHERE listing.id = ? AND listing.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_listing'
              AND audit.entity_id = listing.id
              AND audit.action = 'resale_listing_published'
          )
      `,
      params: [
        crypto.randomUUID(),
        input.sellerUserId,
        JSON.stringify({ status: "active" }),
        input.listingId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function withdrawResaleListing(
  database: MarketplaceDatabase,
  input: { listingId: string; sellerUserId: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_listings
        SET status = 'withdrawn', updated_at = datetime('now')
        WHERE id = ? AND seller_user_id = ? AND status IN ('draft', 'active')
          AND EXISTS (
            SELECT 1 FROM product_items pi
            WHERE pi.id = resale_listings.product_item_id
              AND pi.status = 'listed_for_resale'
          )
      `,
      params: [input.listingId, input.sellerUserId],
    },
    {
      query: `
        UPDATE product_items
        SET status = 'owned', updated_at = datetime('now')
        WHERE id = (
          SELECT product_item_id FROM resale_listings
          WHERE id = ? AND seller_user_id = ? AND status = 'withdrawn'
        )
          AND status = 'listed_for_resale'
          AND EXISTS (
            SELECT 1 FROM ownerships owner
            WHERE owner.product_item_id = product_items.id
              AND owner.user_id = ?
              AND owner.is_current = 1
          )
      `,
      params: [input.listingId, input.sellerUserId, input.sellerUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'resale_listing', listing.id, 'resale_listing_withdrawn', ?
        FROM resale_listings listing
        JOIN product_items pi ON pi.id = listing.product_item_id
        WHERE listing.id = ?
          AND listing.seller_user_id = ?
          AND listing.status = 'withdrawn'
          AND pi.status = 'owned'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_listing'
              AND audit.entity_id = listing.id
              AND audit.action = 'resale_listing_withdrawn'
          )
        UNION ALL
        SELECT ?, ?, 'resale_listing', NULL, 'resale_listing_withdrawn', ?
        WHERE EXISTS (
          SELECT 1 FROM resale_listings listing
          JOIN product_items pi ON pi.id = listing.product_item_id
          WHERE listing.id = ?
            AND listing.seller_user_id = ?
            AND listing.status = 'withdrawn'
            AND pi.status != 'owned'
        )
      `,
      params: [
        crypto.randomUUID(),
        input.sellerUserId,
        JSON.stringify({ status: "withdrawn" }),
        input.listingId,
        input.sellerUserId,
        crypto.randomUUID(),
        input.sellerUserId,
        JSON.stringify({ status: "withdrawal_failed" }),
        input.listingId,
        input.sellerUserId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function createResaleSale(
  database: MarketplaceDatabase,
  input: {
    saleId: string;
    orderNumber: string;
    listingId: string;
    buyerUserId: string;
    shippingName: string;
    shippingPhone: string;
    shippingAddress: string;
    paymentExpiresAt: string;
  },
): Promise<boolean> {
  await expireUnpaidResaleReservations(database);
  const changes = await database.batch([
    {
      query: `
        INSERT INTO resale_sales
          (id, listing_id, order_number, seller_user_id, buyer_user_id,
           amount, platform_fee, seller_amount, shipping_name, shipping_phone,
           shipping_address, payment_expires_at, status, payment_status, payout_status)
        SELECT ?, listing.id, ?, listing.seller_user_id, ?,
          listing.price,
          CAST((listing.price * 5 + 50) / 100 AS INTEGER),
          listing.price - CAST((listing.price * 5 + 50) / 100 AS INTEGER),
          ?, ?, ?, ?, 'pending_payment', 'pending', 'pending'
        FROM resale_listings listing
        JOIN product_items pi ON pi.id = listing.product_item_id
        JOIN ownerships owner
          ON owner.product_item_id = pi.id
          AND owner.user_id = listing.seller_user_id
          AND owner.is_current = 1
        WHERE listing.id = ?
          AND listing.status = 'active'
          AND listing.seller_user_id != ?
          AND pi.status = 'listed_for_resale'
          AND NOT EXISTS (
            SELECT 1 FROM ownership_transfers transfer
            WHERE transfer.product_item_id = pi.id
              AND transfer.status IN (
                'initiated',
                'recipient_pending',
                'recipient_verified',
                'confirmed'
              )
          )
        LIMIT 1
      `,
      params: [
        input.saleId,
        input.orderNumber,
        input.buyerUserId,
        input.shippingName,
        input.shippingPhone,
        input.shippingAddress,
        input.paymentExpiresAt,
        input.listingId,
        input.buyerUserId,
      ],
    },
    {
      query: `
        UPDATE resale_listings
        SET status = 'reserved', updated_at = datetime('now')
        WHERE id = ?
          AND status = 'active'
          AND EXISTS (
            SELECT 1 FROM resale_sales sale
            WHERE sale.id = ?
              AND sale.listing_id = resale_listings.id
              AND sale.status = 'pending_payment'
          )
      `,
      params: [input.listingId, input.saleId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, buyer_user_id, 'resale_sale', sale.id,
          'resale_sale_created', ?
        FROM resale_sales sale
        JOIN resale_listings listing ON listing.id = sale.listing_id
        WHERE sale.id = ?
          AND sale.status = 'pending_payment'
          AND listing.status = 'reserved'
        UNION ALL
        SELECT ?, ?, 'resale_sale', NULL, 'resale_sale_created', ?
        WHERE EXISTS (
          SELECT 1 FROM resale_sales sale
          WHERE sale.id = ? AND sale.status = 'pending_payment'
        )
          AND NOT EXISTS (
            SELECT 1 FROM resale_listings listing
            WHERE listing.id = ? AND listing.status = 'reserved'
          )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "pending_payment" }),
        input.saleId,
        crypto.randomUUID(),
        input.buyerUserId,
        JSON.stringify({ status: "reservation_failed" }),
        input.saleId,
        input.listingId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function submitResalePaymentReference(
  database: MarketplaceDatabase,
  input: { saleId: string; buyerUserId: string; reference: string },
): Promise<boolean> {
  await expireUnpaidResaleReservations(database);
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_sales
        SET payment_reference = ?, updated_at = datetime('now')
        WHERE id = ?
          AND buyer_user_id = ?
          AND status = 'pending_payment'
          AND payment_status = 'pending'
      `,
      params: [input.reference, input.saleId, input.buyerUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, buyer_user_id, 'resale_sale', id,
          'resale_payment_reference_submitted', ?
        FROM resale_sales
        WHERE id = ?
          AND buyer_user_id = ?
          AND status = 'pending_payment'
          AND payment_reference = ?
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ paymentReference: "submitted" }),
        input.saleId,
        input.buyerUserId,
        input.reference,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function cancelResaleSale(
  database: MarketplaceDatabase,
  input: { saleId: string; buyerUserId: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_sales
        SET status = 'cancelled', updated_at = datetime('now')
        WHERE id = ?
          AND buyer_user_id = ?
          AND status = 'pending_payment'
          AND payment_reference IS NULL
      `,
      params: [input.saleId, input.buyerUserId],
    },
    {
      query: `
        UPDATE resale_listings
        SET status = 'active', updated_at = datetime('now')
        WHERE id = (
          SELECT listing_id FROM resale_sales
          WHERE id = ? AND status = 'cancelled'
        )
          AND status = 'reserved'
      `,
      params: [input.saleId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, buyer_user_id, 'resale_sale', id, 'resale_sale_cancelled', ?
        FROM resale_sales
        WHERE id = ? AND status = 'cancelled'
          AND EXISTS (
            SELECT 1 FROM resale_listings listing
            WHERE listing.id = resale_sales.listing_id
              AND listing.status = 'active'
          )
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_sale'
              AND audit.entity_id = resale_sales.id
              AND audit.action = 'resale_sale_cancelled'
          )
        UNION ALL
        SELECT ?, buyer_user_id, 'resale_sale', NULL, 'resale_sale_cancelled', ?
        FROM resale_sales
        WHERE id = ? AND status = 'cancelled'
          AND NOT EXISTS (
            SELECT 1 FROM resale_listings listing
            WHERE listing.id = resale_sales.listing_id
              AND listing.status = 'active'
          )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "cancelled" }),
        input.saleId,
        crypto.randomUUID(),
        input.saleId,
        JSON.stringify({ status: "cancellation_failed" }),
        input.saleId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function approveResalePayment(
  database: MarketplaceDatabase,
  input: { saleId: string; adminUserId: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_sales
        SET payment_status = 'approved', status = 'paid',
            paid_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
          AND status = 'pending_payment'
          AND payment_status = 'pending'
          AND payment_reference IS NOT NULL
          AND length(trim(payment_reference)) > 0
      `,
      params: [input.saleId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'resale_sale', id, 'resale_payment_approved', ?
        FROM resale_sales
        WHERE id = ? AND status = 'paid' AND payment_status = 'approved'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_sale'
              AND audit.entity_id = resale_sales.id
              AND audit.action = 'resale_payment_approved'
          )
      `,
      params: [
        crypto.randomUUID(),
        input.adminUserId,
        JSON.stringify({ paymentStatus: "approved" }),
        input.saleId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function rejectResalePayment(
  database: MarketplaceDatabase,
  input: { saleId: string; adminUserId: string; notes: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_sales
        SET payment_status = 'rejected', status = 'payment_rejected',
            updated_at = datetime('now')
        WHERE id = ? AND status = 'pending_payment' AND payment_status = 'pending'
      `,
      params: [input.saleId],
    },
    {
      query: `
        UPDATE resale_listings
        SET status = 'active', updated_at = datetime('now')
        WHERE id = (
          SELECT listing_id FROM resale_sales
          WHERE id = ? AND status = 'payment_rejected'
        )
          AND status = 'reserved'
      `,
      params: [input.saleId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'resale_sale', sale.id, 'resale_payment_rejected', ?
        FROM resale_sales sale
        JOIN resale_listings listing ON listing.id = sale.listing_id
        WHERE sale.id = ?
          AND sale.status = 'payment_rejected'
          AND listing.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_sale'
              AND audit.entity_id = sale.id
              AND audit.action = 'resale_payment_rejected'
          )
        UNION ALL
        SELECT ?, ?, 'resale_sale', NULL, 'resale_payment_rejected', ?
        WHERE EXISTS (
          SELECT 1 FROM resale_sales
          WHERE id = ? AND status = 'payment_rejected'
        )
          AND NOT EXISTS (
            SELECT 1 FROM resale_listings listing
            JOIN resale_sales sale ON sale.listing_id = listing.id
            WHERE sale.id = ? AND listing.status = 'active'
          )
      `,
      params: [
        crypto.randomUUID(),
        input.adminUserId,
        JSON.stringify({ paymentStatus: "rejected", notes: input.notes }),
        input.saleId,
        crypto.randomUUID(),
        input.adminUserId,
        JSON.stringify({ status: "rejection_failed" }),
        input.saleId,
        input.saleId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function shipResaleSale(
  database: MarketplaceDatabase,
  input: { saleId: string; sellerUserId: string; trackingNumber: string },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_sales
        SET status = 'shipped', tracking_number = ?,
            shipped_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
          AND seller_user_id = ?
          AND status = 'paid'
          AND payment_status = 'approved'
      `,
      params: [input.trackingNumber, input.saleId, input.sellerUserId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, seller_user_id, 'resale_sale', id, 'resale_shipped', ?
        FROM resale_sales
        WHERE id = ? AND status = 'shipped' AND tracking_number = ?
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_sale'
              AND audit.entity_id = resale_sales.id
              AND audit.action = 'resale_shipped'
          )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "shipped" }),
        input.saleId,
        input.trackingNumber,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function confirmResaleDelivery(
  database: MarketplaceDatabase,
  input: {
    saleId: string;
    buyerUserId: string;
    newOwnershipId: string;
  },
): Promise<boolean> {
  const completedAt = new Date().toISOString();
  const changes = await database.batch([
    {
      query: `
        UPDATE ownerships
        SET is_current = 0, ended_at = ?
        WHERE product_item_id = (
          SELECT listing.product_item_id
          FROM resale_sales sale
          JOIN resale_listings listing ON listing.id = sale.listing_id
          JOIN product_items pi ON pi.id = listing.product_item_id
          WHERE sale.id = ?
            AND sale.buyer_user_id = ?
            AND sale.status = 'shipped'
            AND sale.payment_status = 'approved'
            AND listing.status = 'reserved'
            AND pi.status = 'listed_for_resale'
        )
          AND user_id = (
            SELECT seller_user_id FROM resale_sales WHERE id = ?
          )
          AND is_current = 1
      `,
      params: [
        completedAt,
        input.saleId,
        input.buyerUserId,
        input.saleId,
      ],
    },
    {
      query: `
        INSERT INTO ownerships
          (id, product_item_id, user_id, started_at, acquisition_type, is_current)
        SELECT ?, listing.product_item_id, sale.buyer_user_id, ?, 'resale', 1
        FROM resale_sales sale
        JOIN resale_listings listing ON listing.id = sale.listing_id
        WHERE sale.id = ?
          AND sale.buyer_user_id = ?
          AND sale.status = 'shipped'
          AND sale.payment_status = 'approved'
          AND listing.status = 'reserved'
          AND EXISTS (
            SELECT 1 FROM ownerships previous
            WHERE previous.product_item_id = listing.product_item_id
              AND previous.user_id = sale.seller_user_id
              AND previous.is_current = 0
              AND previous.ended_at = ?
          )
          AND NOT EXISTS (
            SELECT 1 FROM ownerships current_owner
            WHERE current_owner.product_item_id = listing.product_item_id
              AND current_owner.is_current = 1
          )
      `,
      params: [
        input.newOwnershipId,
        completedAt,
        input.saleId,
        input.buyerUserId,
        completedAt,
      ],
    },
    {
      query: `
        UPDATE product_items
        SET status = 'owned', updated_at = datetime('now')
        WHERE id = (
          SELECT listing.product_item_id
          FROM resale_sales sale
          JOIN resale_listings listing ON listing.id = sale.listing_id
          WHERE sale.id = ?
            AND sale.buyer_user_id = ?
            AND sale.status = 'shipped'
            AND listing.status = 'reserved'
        )
          AND status = 'listed_for_resale'
          AND EXISTS (
            SELECT 1 FROM ownerships current_owner
            WHERE current_owner.product_item_id = product_items.id
              AND current_owner.user_id = ?
              AND current_owner.id = ?
              AND current_owner.is_current = 1
          )
      `,
      params: [
        input.saleId,
        input.buyerUserId,
        input.buyerUserId,
        input.newOwnershipId,
      ],
    },
    {
      query: `
        UPDATE resale_listings
        SET status = 'sold', sold_at = ?, updated_at = datetime('now')
        WHERE id = (
          SELECT listing_id FROM resale_sales
          WHERE id = ? AND buyer_user_id = ? AND status = 'shipped'
        )
          AND status = 'reserved'
          AND EXISTS (
            SELECT 1 FROM ownerships current_owner
            JOIN resale_sales sale ON sale.id = ?
            WHERE current_owner.product_item_id = resale_listings.product_item_id
              AND current_owner.user_id = sale.buyer_user_id
              AND current_owner.is_current = 1
              AND current_owner.id = ?
          )
      `,
      params: [
        completedAt,
        input.saleId,
        input.buyerUserId,
        input.saleId,
        input.newOwnershipId,
      ],
    },
    {
      query: `
        UPDATE resale_sales
        SET status = 'completed', delivery_confirmed_at = ?,
            ownership_transferred_at = ?, payout_status = 'ready',
            updated_at = datetime('now')
        WHERE id = ?
          AND buyer_user_id = ?
          AND status = 'shipped'
          AND payment_status = 'approved'
          AND EXISTS (
            SELECT 1 FROM resale_listings listing
            JOIN product_items pi ON pi.id = listing.product_item_id
            JOIN ownerships current_owner
              ON current_owner.product_item_id = pi.id
              AND current_owner.user_id = resale_sales.buyer_user_id
              AND current_owner.is_current = 1
            WHERE listing.id = resale_sales.listing_id
              AND listing.status = 'sold'
              AND pi.status = 'owned'
          )
      `,
      params: [
        completedAt,
        completedAt,
        input.saleId,
        input.buyerUserId,
      ],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, buyer_user_id, 'resale_sale', sale.id,
          'resale_delivery_confirmed', ?
        FROM resale_sales sale
        JOIN resale_listings listing ON listing.id = sale.listing_id
        JOIN product_items pi ON pi.id = listing.product_item_id
        JOIN ownerships current_owner
          ON current_owner.product_item_id = pi.id
          AND current_owner.user_id = sale.buyer_user_id
          AND current_owner.is_current = 1
        WHERE sale.id = ?
          AND sale.buyer_user_id = ?
          AND sale.status = 'completed'
          AND sale.payout_status = 'ready'
          AND listing.status = 'sold'
          AND pi.status = 'owned'
          AND current_owner.id = ?
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_sale'
              AND audit.entity_id = sale.id
              AND audit.action = 'resale_delivery_confirmed'
          )
        UNION ALL
        SELECT ?, ?, 'resale_sale', NULL, 'resale_delivery_confirmed', ?
        WHERE EXISTS (
          SELECT 1 FROM resale_sales
          WHERE id = ? AND buyer_user_id = ? AND status = 'shipped'
        )
          AND NOT EXISTS (
            SELECT 1 FROM resale_sales sale
            JOIN resale_listings listing ON listing.id = sale.listing_id
            JOIN ownerships current_owner
              ON current_owner.product_item_id = listing.product_item_id
              AND current_owner.user_id = sale.buyer_user_id
              AND current_owner.is_current = 1
            WHERE sale.id = ? AND sale.status = 'completed'
              AND listing.status = 'sold'
          )
      `,
      params: [
        crypto.randomUUID(),
        JSON.stringify({ status: "completed", payoutStatus: "ready" }),
        input.saleId,
        input.buyerUserId,
        input.newOwnershipId,
        crypto.randomUUID(),
        input.buyerUserId,
        JSON.stringify({ status: "completion_failed" }),
        input.saleId,
        input.buyerUserId,
        input.saleId,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}

export async function markResalePayoutPaid(
  database: MarketplaceDatabase,
  input: {
    saleId: string;
    adminUserId: string;
    payoutReference: string;
  },
): Promise<boolean> {
  const changes = await database.batch([
    {
      query: `
        UPDATE resale_sales
        SET payout_status = 'paid', payout_reference = ?,
            payout_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
          AND status = 'completed'
          AND payout_status = 'ready'
          AND delivery_confirmed_at IS NOT NULL
          AND ownership_transferred_at IS NOT NULL
      `,
      params: [input.payoutReference, input.saleId],
    },
    {
      query: `
        INSERT INTO audit_logs
          (id, actor_user_id, entity_type, entity_id, action, after_json)
        SELECT ?, ?, 'resale_sale', id, 'resale_payout_paid', ?
        FROM resale_sales
        WHERE id = ? AND payout_status = 'paid'
          AND payout_reference = ?
          AND NOT EXISTS (
            SELECT 1 FROM audit_logs audit
            WHERE audit.entity_type = 'resale_sale'
              AND audit.entity_id = resale_sales.id
              AND audit.action = 'resale_payout_paid'
          )
      `,
      params: [
        crypto.randomUUID(),
        input.adminUserId,
        JSON.stringify({ payoutStatus: "paid" }),
        input.saleId,
        input.payoutReference,
      ],
    },
  ]);
  return changes.every((changeCount) => changeCount === 1);
}
