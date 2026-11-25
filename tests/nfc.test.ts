import assert from "node:assert/strict";
import { test } from "node:test";
import {
  verifyNfcScan,
  type NfcVerificationDependencies,
} from "../src/lib/nfc/verify";
import { unavailableNfcProvisioningAdapter } from "../src/lib/nfc/provisioning";
import type { NfcVerificationTarget } from "../src/lib/nfc/types";

const target: NfcVerificationTarget = {
  productItemId: "item-001",
  keyVersion: 2,
  provisioningStatus: "qa_passed",
  sdmEnabled: true,
  itemStatus: "owned",
};

const request = { publicId: "GP001", sdmPayload: "bounded-test-payload" };

function dependencies(
  overrides: Partial<NfcVerificationDependencies> = {},
): NfcVerificationDependencies {
  return {
    findTarget: async () => target,
    verifySdm: async () => ({
      state: "VERIFIED",
      keyVersion: 2,
      tapCounter: 10,
    }),
    recordTapCounter: async () => true,
    ...overrides,
  };
}

test("NFC scan rejects malformed input before repository access", async () => {
  let repositoryCalled = false;
  const result = await verifyNfcScan(
    { publicId: "../other", sdmPayload: "test" },
    dependencies({
      findTarget: async () => {
        repositoryCalled = true;
        return target;
      },
    }),
  );
  assert.equal(result.state, "INVALID");
  assert.equal(repositoryCalled, false);
});

test("unknown items are invalid and known but unprovisioned tags stay unverified", async () => {
  const unknown = await verifyNfcScan(
    request,
    dependencies({ findTarget: async () => null }),
  );
  assert.equal(unknown.state, "INVALID");

  const unprovisioned = await verifyNfcScan(
    request,
    dependencies({
      findTarget: async () => ({ ...target, provisioningStatus: "testing" }),
      verifySdm: async () => {
        throw new Error("Unprovisioned tag must not reach cryptographic verification");
      },
    }),
  );
  assert.equal(unprovisioned.state, "UNVERIFIED");
});

test("valid cryptographic proof requires matching key version and a fresh counter", async () => {
  const verified = await verifyNfcScan(request, dependencies());
  assert.equal(verified.state, "VERIFIED");

  const staleCounter = await verifyNfcScan(
    request,
    dependencies({ recordTapCounter: async () => false }),
  );
  assert.equal(staleCounter.state, "INVALID");

  const wrongKey = await verifyNfcScan(
    request,
    dependencies({
      verifySdm: async () => ({
        state: "VERIFIED",
        keyVersion: 1,
        tapCounter: 11,
      }),
    }),
  );
  assert.equal(wrongKey.state, "INVALID");
});

test("pending cryptographic adapter never asserts authenticity", async () => {
  const result = await verifyNfcScan(
    request,
    dependencies({ verifySdm: async () => ({ state: "UNVERIFIED" }) }),
  );
  assert.equal(result.state, "UNVERIFIED");
});

test("unavailable provisioning adapter makes no tag or provisioning claims", async () => {
  const connection = await unavailableNfcProvisioningAdapter.getReaderConnection();
  const read = await unavailableNfcProvisioningAdapter.readTag();
  const provision = await unavailableNfcProvisioningAdapter.provision({
    productItemId: "item-001",
    serialNumber: "GP001",
  });

  assert.equal(connection.state, "NOT_CONNECTED");
  assert.equal(read.state, "NOT_CONNECTED");
  assert.equal(provision.state, "NOT_CONNECTED");
});
