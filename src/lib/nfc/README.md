# NFC identity boundary

The public passport resolves a physical item by its public ID. A public ID,
serial number, chip UID, or static URL is not proof of authenticity or ownership.

The verification route accepts a bounded opaque SDM payload and delegates
verification to a server-side adapter. The current adapter is intentionally
pending and returns `UNVERIFIED`; it does not claim that a tag is authentic.
Only a future implementation that validates NTAG 424 DNA SDM/CMAC data with
managed keys may return `VERIFIED`. AES keys must never be stored in D1, source
control, browser code, or API responses.

After cryptographic validation, the verification service records the extracted
key version and tap counter. A unique database constraint rejects a replayed
counter for the same item and key version. The raw SDM payload is not persisted.

The provisioning adapter is also pending. Physical reader integration, key
management, tag provisioning, and QA belong to the hardware provisioning phase.
Public ownership details are returned only for users who opt in to both public
profiles and public wardrobe visibility.
