import Link from "next/link";
import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/shared/empty-state";
import { getNfcInventory } from "@/lib/nfc/repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "NFC inventory" };

export default async function AdminNfcPage() {
  const items = await getNfcInventory();
  return (
    <>
      <PageIntro eyebrow="Garieva Prince operations" title="NFC inventory">
        <p>Review physical item assignments and NFC readiness.</p>
      </PageIntro>
      <section className="page-content">
        <p>
          <Link className="primary-link" href="/admin/nfc/provision">
            Open provisioning workflow
          </Link>
        </p>
        {items.length === 0 ? (
          <EmptyState title="No garment items yet." description="Registered physical items will appear here." />
        ) : (
          <div className="nfc-inventory">
            {items.map((item) => (
              <article className="content-card nfc-inventory-item" key={item.productItemId}>
                <div>
                  <p className="eyebrow">{item.serialNumber}</p>
                  <h2>{item.productName}</h2>
                  <p>
                    {[item.size, item.color].filter(Boolean).join(" / ") || "Variant not specified"}
                  </p>
                </div>
                <dl>
                  <div><dt>Tag status</dt><dd>{item.provisioningStatus}</dd></div>
                  <div><dt>Key version</dt><dd>{item.keyVersion ?? "Not assigned"}</dd></div>
                  <div><dt>SDM</dt><dd>{item.sdmEnabled ? "Enabled" : "Not enabled"}</dd></div>
                  <div><dt>Item status</dt><dd>{item.itemStatus}</dd></div>
                </dl>
                <Link
                  className="text-link"
                  href={`/admin/nfc/provision?item=${encodeURIComponent(item.productItemId)}`}
                >
                  Continue provisioning workflow
                </Link>
                <Link className="text-link" href={`/piece/${encodeURIComponent(item.publicId)}`}>
                  Open public passport
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
