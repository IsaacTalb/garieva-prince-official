"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function TransferOwnershipForm({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/ownership-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, recipientEmail }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "The transfer request could not be created.");
        return;
      }
      setRecipientEmail("");
      setMessage("Request sent. The recipient must sign in and accept it.");
      router.refresh();
    } catch {
      setMessage("The transfer request could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="transfer-ownership-form" onSubmit={submit}>
      <label htmlFor={`transfer-recipient-${publicId}`}>Recipient account email</label>
      <input
        id={`transfer-recipient-${publicId}`}
        autoComplete="email"
        type="email"
        required
        maxLength={255}
        value={recipientEmail}
        onChange={(event) => setRecipientEmail(event.currentTarget.value)}
      />
      <p className="form-hint">
        The recipient must already have a Garieva Prince account. You remain the
        owner until you complete the transfer.
      </p>
      <button className="outline-button" type="submit" disabled={busy}>
        {busy ? "Sending..." : "Request ownership transfer"}
      </button>
      <p className="form-message" role="status" aria-live="polite">{message}</p>
    </form>
  );
}

export function OwnershipTransferActions({
  transferId,
  actions,
}: {
  transferId: string;
  actions: ("accept" | "confirm" | "complete" | "cancel")[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function runAction(action: (typeof actions)[number]) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/ownership-transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, action }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "The transfer could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("The transfer could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ownership-transfer-actions">
      {actions.map((action) => (
        <button
          className={action === "complete" ? "primary-link" : "outline-button"}
          disabled={busy}
          key={action}
          onClick={() => void runAction(action)}
          type="button"
        >
          {busy
            ? "Working..."
            : {
                accept: "Accept transfer",
                confirm: "Confirm handoff",
                complete: "Complete transfer",
                cancel: action === "accept" ? "Decline" : "Cancel request",
              }[action]}
        </button>
      ))}
      <p className="form-message" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
