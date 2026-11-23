import { getNfcVerificationTarget, recordVerifiedTapCounter } from "@/lib/nfc/repository";
import { pendingNfcSdmVerifier, verifyNfcScan } from "@/lib/nfc/verify";
import type { NfcVerificationResult } from "@/lib/nfc/types";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { state: "INVALID", message: "Invalid verification request." } satisfies NfcVerificationResult,
      { status: 400, headers: noStore },
    );
  }

  try {
    const result = await verifyNfcScan(input, {
      findTarget: getNfcVerificationTarget,
      verifySdm: pendingNfcSdmVerifier,
      recordTapCounter: recordVerifiedTapCounter,
    });
    const status = result.state === "INVALID" ? 404 : 200;
    return Response.json(result, { status, headers: noStore });
  } catch (error) {
    console.error("NFC verification failed:", error);
    return Response.json(
      { state: "ERROR", message: "Verification is temporarily unavailable." } satisfies NfcVerificationResult,
      { status: 503, headers: noStore },
    );
  }
}
