import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { getNfcInventory } from "@/lib/nfc/repository";
import { unavailableNfcProvisioningAdapter } from "@/lib/nfc/provisioning";

export const dynamic = "force-dynamic";
export const metadata = { title: "NFC provisioning workflow" };

type ProvisioningPageProps = {
  searchParams: Promise<{ item?: string | string[] }>;
};

const workflowSteps = [
  {
    title: "Select a physical garment",
    description: "Confirm the product, variant, serial number, and item lifecycle status.",
  },
  {
    title: "Read and identify the NFC tag",
    description: "A connected reader must confirm the expected NTAG 424 DNA chip and read its UID.",
  },
  {
    title: "Associate the tag with the garment",
    description: "Record the chip UID against the selected item after an operator confirms the match.",
  },
  {
    title: "Provision Secure Dynamic Messaging",
    description: "Provision through a managed key service; AES key material must not enter this app or D1.",
  },
  {
    title: "Verify and complete pre-install QA",
    description: "Read back the configuration and validate cryptographic output before installation.",
  },
  {
    title: "Install and complete post-install QA",
    description: "Verify the installed tag and record the result using the approved reader integration.",
  },
];

export default async function NfcProvisioningPage({
  searchParams,
}: ProvisioningPageProps) {
  const [query, items, readerConnection] = await Promise.all([
    searchParams,
    getNfcInventory(),
    unavailableNfcProvisioningAdapter.getReaderConnection(),
  ]);
  const selectedId = typeof query.item === "string" ? query.item : undefined;
  const selectedItem = items.find((item) => item.productItemId === selectedId);

  return (
    <>
      <PageIntro eyebrow="Garieva Prince operations" title="NFC provisioning workflow">
        <p>
          Select an item and review the physical provisioning steps. This scaffold
          does not read, write, or authenticate NFC tags.
        </p>
      </PageIntro>
      <section className="page-content nfc-provisioning">
        <div className="content-card nfc-reader-status" role="status">
          <div>
            <p className="eyebrow">Reader connection</p>
            <strong>
              {readerConnection.state === "NOT_CONNECTED"
                ? "Not connected"
                : readerConnection.readerName}
            </strong>
          </div>
          <p>
            {readerConnection.state === "NOT_CONNECTED"
              ? readerConnection.message
              : "Reader connected. Provisioning actions remain disabled until a reviewed integration is installed."}
          </p>
        </div>

        <div className="content-card">
          <form className="nfc-item-selector" method="get">
            <label htmlFor="nfc-item">Physical item</label>
            <select id="nfc-item" name="item" defaultValue={selectedItem?.productItemId ?? ""}>
              <option disabled value="">
                Select a registered garment
              </option>
              {items.map((item) => (
                <option key={item.productItemId} value={item.productItemId}>
                  {item.serialNumber} — {item.productName}
                </option>
              ))}
            </select>
            <button className="primary-link" type="submit" disabled={items.length === 0}>
              Load item
            </button>
          </form>
          {items.length === 0 ? (
            <EmptyState
              title="No garment items available."
              description="Register a physical item before starting its provisioning workflow."
            />
          ) : null}
          {selectedId && !selectedItem ? (
            <p className="form-message" role="alert">
              That item is not in the current inventory. Select a registered garment instead.
            </p>
          ) : null}
        </div>

        {selectedItem ? (
          <>
            <div className="content-card nfc-selected-item">
              <div>
                <p className="eyebrow">{selectedItem.serialNumber}</p>
                <h2>{selectedItem.productName}</h2>
                <p>
                  {[selectedItem.size, selectedItem.color].filter(Boolean).join(" / ") ||
                    "Variant not specified"}
                </p>
              </div>
              <dl>
                <div>
                  <dt>Item status</dt>
                  <dd>{selectedItem.itemStatus}</dd>
                </div>
                <div>
                  <dt>NFC status in inventory</dt>
                  <dd>{selectedItem.provisioningStatus}</dd>
                </div>
                <div>
                  <dt>Key version</dt>
                  <dd>{selectedItem.keyVersion ?? "Not assigned"}</dd>
                </div>
              </dl>
              <p>
                <Link
                  className="text-link"
                  href={`/piece/${encodeURIComponent(selectedItem.publicId)}`}
                >
                  Open public passport
                </Link>
              </p>
            </div>

            <div className="content-card">
              <h2>Provisioning steps</h2>
              <ol className="nfc-provision-steps">
                {workflowSteps.map((step, index) => (
                  <li key={step.title} data-state={index === 0 ? "ready" : "blocked"}>
                    <span className="nfc-provision-step-number">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                      {index > 0 ? <span className="nfc-step-state">Unavailable — reader integration pending</span> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : null}

        <p>
          <Link className="text-link" href="/admin/nfc">
            Back to NFC inventory
          </Link>
        </p>
      </section>
    </>
  );
}
