import { z } from "zod";

export const nfcVerificationStates = [
  "VERIFIED",
  "UNVERIFIED",
  "INVALID",
  "ERROR",
] as const;

export type NfcVerificationState = (typeof nfcVerificationStates)[number];

export const nfcVerificationInputSchema = z.strictObject({
  publicId: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  sdmPayload: z.string().trim().min(1).max(2048),
});

export type NfcVerificationInput = z.infer<typeof nfcVerificationInputSchema>;

export type NfcVerificationResult = {
  state: NfcVerificationState;
  message: string;
};

export type NfcVerificationTarget = {
  productItemId: string;
  keyVersion: number | null;
  provisioningStatus: string | null;
  sdmEnabled: boolean;
  itemStatus: string;
};

export type VerifiedSdmProof = {
  state: "VERIFIED";
  keyVersion: number;
  tapCounter: number;
};

export type SdmProofResult =
  | VerifiedSdmProof
  | { state: "UNVERIFIED" }
  | { state: "INVALID" };

export type NfcPassport = {
  publicId: string;
  productName: string;
  model: string;
  drop: string | null;
  size: string | null;
  color: string | null;
  serialNumber: string;
  authenticity: NfcVerificationState;
  currentOwner: {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
    telegramUrl: string | null;
  } | null;
  ownershipHistory: {
    displayName: string;
    startedAt: string;
    endedAt: string | null;
    acquisitionType: string;
  }[];
};

export type NfcClaimableItem = {
  publicId: string;
  productName: string;
  serialNumber: string;
  size: string | null;
  color: string | null;
  eligible: boolean;
};
