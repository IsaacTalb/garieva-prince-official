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

The admin provisioning workflow at `/admin/nfc/provision` supports item
selection and displays the reader connection boundary and required QA steps.
Its adapter explicitly reports that no reader is connected; it does not read or
write tags, change inventory status, or claim provisioning succeeded. Physical
reader integration, managed key service integration, tag provisioning, and
hardware QA remain pending. Public ownership details are returned only for
users who opt in to both public profiles and public wardrobe visibility.

Ownership claims require an authenticated account, an active pepper-hashed
one-time code, a linked non-retired provisioned tag, an approved original
order/payment allocated to that exact item, and no existing ownership history.
Code consumption, ownership creation, item status update, and the audit event
run in one D1 batch (or one local SQLite transaction). A partial unique index
permits only one current owner; a replay or concurrent claim cannot create a
second owner. `/api/admin/ownership-claims` issues the code by email only for
an administrator-selected approved order/item allocation. This database
association is not cryptographic proof that a physical tag was tapped; the
SDM verification boundary remains explicitly `UNVERIFIED` until hardware and
managed-key verification are integrated.
