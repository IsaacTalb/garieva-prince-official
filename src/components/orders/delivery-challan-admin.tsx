"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type DocumentInfo = {
  id: string;
  mimeType: string;
  uploadedAt: string;
} | null;

export function DeliveryChallanAdmin({
  orderId,
  courier,
  trackingNumber,
  document,
  canShip,
}: {
  orderId: string;
  courier: string | null;
  trackingNumber: string | null;
  document: DocumentInfo;
  canShip: boolean;
}) {
  const router = useRouter();
  const [courierValue, setCourierValue] = useState(courier ?? "");
  const [trackingValue, setTrackingValue] = useState(trackingNumber ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("challan");
    const file =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
    if (!file) {
      setMessage("Choose a PDF, JPEG, PNG, or WebP delivery document.");
      return;
    }

    const data = new FormData();
    data.set("courier", courierValue);
    data.set("trackingNumber", trackingValue);
    data.set("file", file);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/delivery-challan`,
        { method: "POST", body: data },
      );
      const result = (await response.json()) as {
        error?: string;
        cleanupWarning?: boolean;
      };
      if (!response.ok) {
        setMessage(result.error ?? "The delivery document could not be uploaded.");
        return;
      }
      setMessage(
        result.cleanupWarning
          ? "Challan saved, but an older private file could not be removed from R2."
          : "Delivery challan saved and order marked shipped.",
      );
      form.reset();
      router.refresh();
    } catch {
      setMessage("The delivery document could not be uploaded. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!document || !window.confirm("Remove the current delivery challan?")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderId)}/delivery-challan`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: document.id }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        cleanupWarning?: boolean;
      };
      if (!response.ok) {
        setMessage(result.error ?? "The delivery challan could not be removed.");
        return;
      }
      setMessage(
        result.cleanupWarning
          ? "Challan removed from the order, but its private R2 object could not be deleted."
          : "Delivery challan removed.",
      );
      router.refresh();
    } catch {
      setMessage("The delivery challan could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="content-card delivery-challan-admin">
      <h2>Delivery challan</h2>
      {document ? (
        <div className="delivery-challan-current">
          <p>
            Current document: {document.mimeType} · uploaded {document.uploadedAt}
          </p>
          <div className="form-actions">
            <a
              className="outline-button"
              href={`/api/admin/orders/${encodeURIComponent(orderId)}/delivery-challan`}
              rel="noreferrer"
              target="_blank"
            >
              View current challan
            </a>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => void remove()}
              type="button"
            >
              Remove challan
            </button>
          </div>
        </div>
      ) : (
        <p>No delivery document has been uploaded.</p>
      )}
      {!canShip ? (
        <p className="form-hint">
          Upload is enabled for orders whose payment is approved and whose status
          is paid, processing, or already shipped.
        </p>
      ) : (
        <form className="delivery-challan-form" onSubmit={upload}>
          <label>
            Courier
            <input
              maxLength={100}
              minLength={2}
              required
              value={courierValue}
              onChange={(event) => setCourierValue(event.currentTarget.value)}
            />
          </label>
          <label>
            Tracking number
            <input
              maxLength={100}
              minLength={2}
              required
              value={trackingValue}
              onChange={(event) => setTrackingValue(event.currentTarget.value)}
            />
          </label>
          <label>
            PDF, JPEG, PNG, or WebP (maximum 10 MB)
            <input
              accept="application/pdf,image/jpeg,image/png,image/webp"
              name="challan"
              required
              type="file"
            />
          </label>
          <button className="primary-link" disabled={busy} type="submit">
            {busy
              ? "Uploading..."
              : document
                ? "Replace delivery challan"
                : "Upload delivery challan"}
          </button>
        </form>
      )}
      <p className="form-message" role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
