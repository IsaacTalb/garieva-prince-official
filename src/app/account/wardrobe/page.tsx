import { AccountNavigation } from "@/components/account/account-navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro } from "@/components/shared/page-intro";
import { requirePageUser } from "@/lib/auth/session";
import { getUserWardrobe } from "@/lib/db/d1/ownership";

export const dynamic = "force-dynamic";
export const metadata = { title: "My wardrobe" };

export default async function AccountWardrobePage() {
  const user = await requirePageUser();
  const items = await getUserWardrobe(user.id);

  return (
    <>
      <PageIntro eyebrow="Your account" title="My wardrobe">
        <p>Your pieces and their verified garment serials.</p>
      </PageIntro>
      <section className="page-content">
        <AccountNavigation active="wardrobe" />
        {items.length === 0 ? (
          <div className="content-card">
            <EmptyState
              title="Your wardrobe is waiting."
              description="Pieces linked to your account will appear here."
            />
          </div>
        ) : (
          <div className="account-record-list">
            {items.map((item) => (
              <article className="content-card account-record" key={item.product_item_id}>
                <div>
                  <p className="eyebrow">Owned piece</p>
                  <h2>{item.product_name}</h2>
                  <p>
                    {item.variant_size ? `Size ${item.variant_size}` : "Size not specified"}
                    {item.variant_color ? ` / ${item.variant_color}` : ""}
                  </p>
                </div>
                <dl>
                  <div><dt>Serial number</dt><dd>{item.serial_number}</dd></div>
                  <div><dt>Ownership started</dt><dd>{item.owned_since}</dd></div>
                  <div><dt>NFC tag</dt><dd>{item.nfc_status ?? "Not linked"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
