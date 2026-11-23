export type ProvisioningStatus =
  | "unassigned"
  | "testing"
  | "provisioned"
  | "qa_passed"
  | "retired";

export type ProvisioningResult =
  | { state: "PENDING" }
  | { state: "PROVISIONED"; keyVersion: number };

export interface NfcProvisioningAdapter {
  provision(input: {
    productItemId: string;
    serialNumber: string;
  }): Promise<ProvisioningResult>;
}

export const pendingNfcProvisioningAdapter: NfcProvisioningAdapter = {
  async provision() {
    return { state: "PENDING" };
  },
};
