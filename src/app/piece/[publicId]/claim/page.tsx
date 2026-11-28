import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimOwnershipForm } from "@/components/ownership/claim-ownership-form";
import { PageIntro } from "@/components/shared/page-intro";
import { requirePageUser } from "@/lib/auth/session";
import { getNfcClaimableItem } from "@/lib/nfc/repository";
import { nfcVerificationInputSchema } from "@/lib/nfc/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Claim garment ownership" };

export default async function ClaimOwnershipPage({
  params,
}: PageProps<"/piece/[publicId]/claim">) {
  await requirePageUser();
  const { publicId } = await params;
  if (!nfcVerificationInputSchema.shape.publicId.safeParse(publicId).success) {
    notFound();
  }

  const item = await getNfcClaimableItem(publicId);
  if (!item) notFound();

  return (
    <>
      <PageIntro eyebrow="Garieva Prince / Digital passport" title="Claim your piece">
        <p>Link this registered garment to your account using its one-time ownership code.</p>
      </PageIntro>
      <section className="page-content claim-ownership-page">
        <div className="content-card">
          <p className="eyebrow">{item.serialNumber}</p>
          <h2>{item.productName}</h2>
          <p>
            {[item.size, item.color].filter(Boolean).join(" / ") || "Variant not specified"}
          </p>
          {item.eligible ? (
            <ClaimOwnershipForm publicId={item.publicId} />
          ) : (
            <p role="status">
              This garment is not currently eligible for a claim. It must have a
              provisioned NFC tag, an approved original order, and an active
              ownership code. Contact support if you believe this is an error.
            </p>
          )}
        </div>
        <Link className="text-link" href={`/piece/${encodeURIComponent(item.publicId)}`}>
          Back to garment passport
        </Link>
      </section>
    </>
  );
}
