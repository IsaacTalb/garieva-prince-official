import {
  nfcVerificationInputSchema,
  type NfcVerificationInput,
  type NfcVerificationResult,
  type NfcVerificationTarget,
  type SdmProofResult,
} from "./types";

export type NfcVerificationDependencies = {
  findTarget(publicId: string): Promise<NfcVerificationTarget | null>;
  verifySdm(
    input: NfcVerificationInput,
    target: NfcVerificationTarget,
  ): Promise<SdmProofResult>;
  recordTapCounter(input: {
    productItemId: string;
    keyVersion: number;
    tapCounter: number;
  }): Promise<boolean>;
};

export const pendingNfcSdmVerifier: NfcVerificationDependencies["verifySdm"] =
  async () => ({ state: "UNVERIFIED" });

export async function verifyNfcScan(
  input: unknown,
  dependencies: NfcVerificationDependencies,
): Promise<NfcVerificationResult> {
  const parsed = nfcVerificationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { state: "INVALID", message: "Invalid verification request." };
  }

  const target = await dependencies.findTarget(parsed.data.publicId);
  if (!target) {
    return { state: "INVALID", message: "No registered item matches this scan." };
  }
  if (
    target.itemStatus === "retired" ||
    target.provisioningStatus === "retired"
  ) {
    return { state: "INVALID", message: "This item is no longer verifiable." };
  }
  if (
    !target.sdmEnabled ||
    (target.provisioningStatus !== "provisioned" &&
      target.provisioningStatus !== "qa_passed") ||
    target.keyVersion === null
  ) {
    return {
      state: "UNVERIFIED",
      message: "Cryptographic tag verification is not available for this item.",
    };
  }

  const proof = await dependencies.verifySdm(parsed.data, target);
  if (proof.state !== "VERIFIED") {
    return proof.state === "INVALID"
      ? { state: "INVALID", message: "The tag proof could not be verified." }
      : {
          state: "UNVERIFIED",
          message: "Cryptographic tag verification is not configured.",
        };
  }
  if (
    proof.keyVersion !== target.keyVersion ||
    !Number.isSafeInteger(proof.tapCounter) ||
    proof.tapCounter < 0
  ) {
    return { state: "INVALID", message: "The tag proof could not be verified." };
  }

  const counterAccepted = await dependencies.recordTapCounter({
    productItemId: target.productItemId,
    keyVersion: proof.keyVersion,
    tapCounter: proof.tapCounter,
  });
  if (!counterAccepted) {
    return { state: "INVALID", message: "The tag proof could not be verified." };
  }
  return { state: "VERIFIED", message: "The tag proof was verified." };
}
