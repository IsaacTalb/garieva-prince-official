import { AccountNavigation } from "@/components/account/account-navigation";
import { OwnershipTransferActions } from "@/components/ownership/ownership-transfer-controls";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { requirePageUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/d1/client";
import { getUserOwnershipTransfers } from "@/lib/ownership/transfers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ownership transfers" };

const activeStatuses = new Set([
  "initiated",
  "recipient_pending",
  "recipient_verified",
  "confirmed",
]);

export default async function AccountTransfersPage() {
  const user = await requirePageUser();
  const transfers = await getUserOwnershipTransfers(getDatabase(), user.id);
  const incoming = transfers.filter(
    (transfer) => transfer.recipientUserId === user.id,
  );
  const outgoing = transfers.filter((transfer) => transfer.fromUserId === user.id);

  return (
    <>
      <PageIntro eyebrow="Your account" title="Ownership transfers">
        <p>Accept, confirm, or cancel requests to move a garment between accounts.</p>
      </PageIntro>
      <section className="page-content">
        <AccountNavigation active="transfers" />
        <div className="transfer-sections">
          <section>
            <h2>Incoming requests</h2>
            {incoming.length === 0 ? (
              <EmptyState
                title="No incoming requests."
                description="Transfer requests from other account holders will appear here."
              />
            ) : (
              <div className="account-record-list">
                {incoming.map((transfer) => (
                  <article className="content-card transfer-card" key={transfer.id}>
                    <p className="eyebrow">{transfer.serialNumber}</p>
                    <h3>{transfer.productName}</h3>
                    <p>
                      From {transfer.fromUserName ?? "another account"} ·{" "}
                      {transfer.status.replaceAll("_", " ")}
                    </p>
                    <p className="form-hint">Request expires {transfer.expiresAt}.</p>
                    {transfer.status === "recipient_pending" ||
                    transfer.status === "recipient_verified" ||
                    transfer.status === "confirmed" ? (
                      <OwnershipTransferActions
                        transferId={transfer.id}
                        actions={
                          transfer.status === "recipient_pending"
                            ? ["accept", "cancel"]
                            : ["cancel"]
                        }
                      />
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>Outgoing requests</h2>
            {outgoing.length === 0 ? (
              <EmptyState
                title="No outgoing requests."
                description="Start a transfer from an item in your wardrobe."
              />
            ) : (
              <div className="account-record-list">
                {outgoing.map((transfer) => (
                  <article className="content-card transfer-card" key={transfer.id}>
                    <p className="eyebrow">{transfer.serialNumber}</p>
                    <h3>{transfer.productName}</h3>
                    <p>
                      To {transfer.recipientUserName ?? "another account"} ·{" "}
                      {transfer.status.replaceAll("_", " ")}
                    </p>
                    <p className="form-hint">Request expires {transfer.expiresAt}.</p>
                    {activeStatuses.has(transfer.status) ? (
                      <OwnershipTransferActions
                        transferId={transfer.id}
                        actions={
                          transfer.status === "recipient_verified"
                            ? ["confirm", "cancel"]
                            : transfer.status === "confirmed"
                              ? ["complete", "cancel"]
                              : ["cancel"]
                        }
                      />
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
