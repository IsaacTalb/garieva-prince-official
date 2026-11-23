import { notFound } from "next/navigation";
import { PageIntro } from "@/components/shared/page-intro";
import { getPublicNfcPassport } from "@/lib/nfc/repository";
import { nfcVerificationInputSchema } from "@/lib/nfc/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/piece/[publicId]">) {
  const { publicId } = await params;
  return { title: `Garment passport ${publicId}` };
}

export default async function DigitalPassportPage({
  params,
}: PageProps<"/piece/[publicId]">) {
  const { publicId } = await params;
  if (!nfcVerificationInputSchema.shape.publicId.safeParse(publicId).success) {
    notFound();
  }
  const passport = await getPublicNfcPassport(publicId);
  if (!passport) notFound();

  return (
    <>
      <PageIntro eyebrow="Garieva Prince / Digital passport" title={passport.productName}>
        <p>A digital record for this individual garment.</p>
      </PageIntro>
      <section className="page-content passport-layout">
        <section className="content-card">
          <p className="eyebrow">Authenticity status</p>
          <h2 className="passport-status" data-status={passport.authenticity}>
            {passport.authenticity}
          </h2>
          <p>
            This page identifies a registered garment. A static page or URL does
            not verify the physical NFC tag.
          </p>
        </section>

        <section className="content-card">
          <h2>Garment details</h2>
          <dl className="passport-fields">
            <div><dt>Product</dt><dd>Garieva Prince</dd></div>
            <div><dt>Model</dt><dd>{passport.model}</dd></div>
            <div><dt>Drop</dt><dd>{passport.drop ?? "Not assigned"}</dd></div>
            <div><dt>Size</dt><dd>{passport.size ?? "Not specified"}</dd></div>
            <div><dt>Color</dt><dd>{passport.color ?? "Not specified"}</dd></div>
            <div><dt>Serial</dt><dd>{passport.serialNumber}</dd></div>
          </dl>
        </section>

        <section className="content-card">
          <h2>Public ownership</h2>
          {passport.currentOwner ? (
            <p>Current public owner: {passport.currentOwner}</p>
          ) : (
            <p>The current owner has not chosen to share this information.</p>
          )}
          {passport.ownershipHistory.length > 0 ? (
            <ol className="passport-history">
              {passport.ownershipHistory.map((ownership, index) => (
                <li key={`${ownership.startedAt}-${index}`}>
                  <strong>{ownership.displayName}</strong>
                  <span>{ownership.startedAt} – {ownership.endedAt ?? "Current"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p>No ownership history has been shared publicly.</p>
          )}
        </section>
      </section>
    </>
  );
}
