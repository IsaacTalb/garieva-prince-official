"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ClaimOwnershipForm({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ownership/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, code }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "This piece could not be claimed.");
        return;
      }
      router.push(`/piece/${encodeURIComponent(publicId)}`);
      router.refresh();
    } catch {
      setMessage("The claim could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="claim-ownership-form" onSubmit={submitClaim}>
      <label htmlFor="ownership-claim-code">Ownership code</label>
      <input
        id="ownership-claim-code"
        autoComplete="one-time-code"
        required
        minLength={16}
        maxLength={80}
        pattern="[A-Fa-f0-9 -]{16,80}"
        value={code}
        onChange={(event) => setCode(event.currentTarget.value)}
        aria-describedby="ownership-claim-hint ownership-claim-message"
      />
      <p className="form-hint" id="ownership-claim-hint">
        Enter the one-time code issued for this garment.
      </p>
      <button className="primary-link" type="submit" disabled={busy}>
        {busy ? "Claiming..." : "Claim ownership"}
      </button>
      <p
        className="form-message"
        id="ownership-claim-message"
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  );
}
