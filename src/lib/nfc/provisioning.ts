export type ProvisioningStatus =
  | "unassigned"
  | "testing"
  | "provisioned"
  | "qa_passed"
  | "retired";

export type ReaderConnection =
  | { state: "NOT_CONNECTED"; message: string }
  | { state: "CONNECTED"; readerName: string };

export type NfcTagReadResult =
  | { state: "NOT_CONNECTED"; message: string }
  | { state: "READ"; chipUid: string; tagType: string };

export type ProvisioningResult =
  | { state: "NOT_CONNECTED"; message: string }
  | { state: "PROVISIONED"; keyVersion: number };

export interface NfcProvisioningAdapter {
  getReaderConnection(): Promise<ReaderConnection>;
  readTag(): Promise<NfcTagReadResult>;
  provision(input: {
    productItemId: string;
    serialNumber: string;
  }): Promise<ProvisioningResult>;
}

const readerUnavailableMessage =
  "No NFC reader integration is configured. No tag operation was attempted.";

export const unavailableNfcProvisioningAdapter: NfcProvisioningAdapter = {
  async getReaderConnection() {
    return { state: "NOT_CONNECTED", message: readerUnavailableMessage };
  },
  async readTag() {
    return { state: "NOT_CONNECTED", message: readerUnavailableMessage };
  },
  async provision() {
    return { state: "NOT_CONNECTED", message: readerUnavailableMessage };
  },
};
