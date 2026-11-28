"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type {
  ResaleItem,
  ResaleListing,
  ResaleSale,
} from "@/lib/resale/marketplace";

type ApiResult = { error?: string; listingId?: string; sellerNotified?: boolean };

async function responseError(response: Response) {
  const body = (await response.json()) as ApiResult;
  return body.error ?? "The request could not be completed.";
}

async function uploadPhoto(listingId: string, file: File) {
  const formData = new FormData();
  formData.set("listingId", listingId);
  formData.set("file", file);
  return fetch("/api/resale/listings/photos", { method: "POST", body: formData });
}

export function ResaleListingForm({ item }: { item: ResaleItem }) {
  const router = useRouter();
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("good");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("photos");
    const files =
      fileInput instanceof HTMLInputElement && fileInput.files
        ? Array.from(fileInput.files)
        : [];
    if (files.length === 0 || files.length > 5) {
      setMessage("Choose between one and five JPEG or PNG photos.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const createResponse = await fetch("/api/resale/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: item.publicId,
          price: Number(price),
          condition,
          description,
        }),
      });
      if (!createResponse.ok) {
        setMessage(await responseError(createResponse));
        return;
      }
      const created = (await createResponse.json()) as ApiResult;
      if (!created.listingId) {
        setMessage("The draft listing was created but could not be loaded.");
        router.refresh();
        return;
      }

      for (const file of files) {
        const uploadResponse = await uploadPhoto(created.listingId, file);
        if (!uploadResponse.ok) {
          setMessage(await responseError(uploadResponse));
          router.refresh();
          return;
        }
      }

      const publishResponse = await fetch("/api/resale/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: created.listingId,
          action: "publish",
        }),
      });
      if (!publishResponse.ok) {
        setMessage(await responseError(publishResponse));
        router.refresh();
        return;
      }
      form.reset();
      setPrice("");
      setDescription("");
      setMessage("Your piece is now listed for resale.");
      router.refresh();
    } catch {
      setMessage(
        "The listing could not be completed. Any saved draft can be finished from My resale.",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="resale-form" onSubmit={submit}>
      <label>
        Asking price (MMK)
        <input
          type="number"
          min="1"
          max="10000000000"
          step="1"
          required
          value={price}
          onChange={(event) => setPrice(event.currentTarget.value)}
        />
      </label>
      <label>
        Condition
        <select
          value={condition}
          onChange={(event) => setCondition(event.currentTarget.value)}
        >
          <option value="new">New</option>
          <option value="like_new">Like new</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
        </select>
      </label>
      <label>
        Description
        <textarea
          minLength={10}
          maxLength={2000}
          required
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />
      </label>
      <label>
        Photos (1–5 JPEG or PNG files; maximum 5 MB each)
        <input
          accept="image/jpeg,image/png"
          multiple
          name="photos"
          required
          type="file"
        />
      </label>
      <p className="form-hint">
        Prices are in MMK. GP retains 5% after delivery and ownership transfer;
        your payout is 95%.{" "}
        <a href="mailto:support@garievaprince.com">Contact GP</a> for current
        payment instructions.
      </p>
      <button className="primary-link" disabled={busy} type="submit">
        {busy ? "Creating listing..." : "Create resale listing"}
      </button>
      <p className="form-message" role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

export function ResaleDraftControls({ listing }: { listing: ResaleListing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("draft-photos");
    const files =
      fileInput instanceof HTMLInputElement && fileInput.files
        ? Array.from(fileInput.files)
        : [];
    if (files.length > 5 - listing.photos.length) {
      setMessage(`You can add up to ${5 - listing.photos.length} more photos.`);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      for (const file of files) {
        const response = await uploadPhoto(listing.id, file);
        if (!response.ok) {
          setMessage(await responseError(response));
          router.refresh();
          return;
        }
      }
      if (listing.photos.length + files.length === 0) {
        setMessage("Add at least one photo before publishing.");
        return;
      }
      const response = await fetch("/api/resale/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, action: "publish" }),
      });
      if (!response.ok) {
        setMessage(await responseError(response));
        router.refresh();
        return;
      }
      setMessage("Listing published.");
      router.refresh();
    } catch {
      setMessage("The draft could not be finished. Please try again.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="resale-form" onSubmit={publish}>
      <p className="form-hint">
        Draft saved. Upload at least one photo to publish ({listing.photos.length}/5 uploaded).
      </p>
      <label>
        Add photos
        <input
          accept="image/jpeg,image/png"
          multiple
          name="draft-photos"
          type="file"
        />
      </label>
      <button className="primary-link" disabled={busy} type="submit">
        {busy ? "Saving..." : "Upload photos and publish"}
      </button>
      <p className="form-message" role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

export function ResaleCheckoutForm({
  listingId,
  defaultName,
  defaultPhone,
}: {
  listingId: string;
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [shippingName, setShippingName] = useState(defaultName);
  const [shippingPhone, setShippingPhone] = useState(defaultPhone);
  const [shippingAddress, setShippingAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/resale/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          shippingName,
          shippingPhone,
          shippingAddress,
        }),
      });
      if (!response.ok) {
        setMessage(await responseError(response));
        return;
      }
      router.push("/account/resale");
      router.refresh();
    } catch {
      setMessage("Checkout could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="resale-form" onSubmit={submit}>
      <label>
        Delivery name
        <input
          autoComplete="name"
          maxLength={150}
          required
          value={shippingName}
          onChange={(event) => setShippingName(event.currentTarget.value)}
        />
      </label>
      <label>
        Delivery phone
        <input
          autoComplete="tel"
          maxLength={30}
          required
          value={shippingPhone}
          onChange={(event) => setShippingPhone(event.currentTarget.value)}
        />
      </label>
      <label>
        Delivery address
        <textarea
          autoComplete="street-address"
          minLength={10}
          maxLength={1000}
          required
          value={shippingAddress}
          onChange={(event) => setShippingAddress(event.currentTarget.value)}
        />
      </label>
      <p className="form-hint">
        Shipping is arranged and paid separately between buyer and seller.{" "}
        <a href="mailto:support@garievaprince.com">Contact GP</a> for current
        payment instructions. Your order reserves the piece for 24
        hours until you submit a payment reference.
      </p>
      <button className="primary-link" disabled={busy} type="submit">
        {busy ? "Reserving..." : "Place resale order"}
      </button>
      <p className="form-message" role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

export function ResaleSaleActions({
  sale,
  isSeller,
}: {
  sale: ResaleSale;
  isSeller: boolean;
}) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function act(action: string, extra: Record<string, string> = {}) {
    if (
      action === "confirm_delivery" &&
      !window.confirm(
        "Confirm the garment has arrived? This transfers ownership to you and makes the seller's payout ready.",
      )
    ) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/account/resale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id, action, ...extra }),
      });
      if (!response.ok) {
        setMessage(await responseError(response));
        return;
      }
      setMessage("Order updated.");
      router.refresh();
    } catch {
      setMessage("The order could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!isSeller && sale.status === "pending_payment") {
    return (
      <div className="resale-actions">
        {sale.paymentReference ? (
          <p className="form-hint">
            Payment reference submitted. GP is reviewing payment; the seller will
            be notified after approval.
          </p>
        ) : (
          <>
            <label>
              GP payment transaction reference
              <input
                maxLength={160}
                minLength={3}
                required
                value={reference}
                onChange={(event) => setReference(event.currentTarget.value)}
              />
            </label>
            <button
              className="primary-link"
              disabled={busy}
              onClick={() => void act("submit_payment", { reference })}
              type="button"
            >
              Submit payment reference
            </button>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => void act("cancel")}
              type="button"
            >
              Cancel unpaid order
            </button>
          </>
        )}
      </div>
    );
  }

  if (isSeller && sale.status === "paid") {
    return (
      <div className="resale-actions">
        <p className="form-hint">
          Ship to {sale.shippingName}, {sale.shippingPhone}: {sale.shippingAddress}
        </p>
        <label>
          Tracking number
          <input
            maxLength={100}
            minLength={2}
            required
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.currentTarget.value)}
          />
        </label>
        <button
          className="primary-link"
          disabled={busy}
          onClick={() => void act("ship", { trackingNumber })}
          type="button"
        >
          Mark as shipped
        </button>
      </div>
    );
  }

  if (!isSeller && sale.status === "shipped") {
    return (
      <div className="resale-actions">
        <p className="form-hint">
          Tracking: {sale.trackingNumber ?? "Not provided"}. Confirm only after the
          garment has arrived. Confirmation transfers ownership and makes the 95%
          seller payout ready.
        </p>
        <button
          className="primary-link"
          disabled={busy}
          onClick={() => void act("confirm_delivery")}
          type="button"
        >
          Confirm delivery and transfer ownership
        </button>
      </div>
    );
  }

  if (isSeller && sale.status === "completed") {
    return (
      <p className="form-hint">
        Payout: {sale.payoutStatus.replaceAll("_", " ")}
        {sale.payoutReference ? ` · Reference ${sale.payoutReference}` : ""}
      </p>
    );
  }

  return <p className="form-hint">{message}</p>;
}

export function ResaleListingActions({ listing }: { listing: ResaleListing }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function withdraw() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/resale/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, action: "withdraw" }),
      });
      if (!response.ok) {
        setMessage(await responseError(response));
        return;
      }
      setMessage("Listing withdrawn.");
      router.refresh();
    } catch {
      setMessage("The listing could not be withdrawn.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="resale-actions">
      {listing.status === "draft" ? (
        <ResaleDraftControls listing={listing} />
      ) : null}
      {listing.status === "active" ? (
        <button
          className="outline-button"
          disabled={busy}
          onClick={() => void withdraw()}
          type="button"
        >
          Withdraw listing
        </button>
      ) : null}
      <p className="form-message" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

export function ResaleAdminActions({ sale }: { sale: ResaleSale }) {
  const router = useRouter();
  const [payoutReference, setPayoutReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function act(action: string, extra: Record<string, string> = {}) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/resale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: sale.id, action, ...extra }),
      });
      if (!response.ok) {
        setMessage(await responseError(response));
        return;
      }
      const result = (await response.json()) as ApiResult;
      if (action === "approve_payment" && !result.sellerNotified) {
        setMessage("Payment approved, but seller email failed; notify the seller manually.");
      } else {
        setMessage("Order updated.");
      }
      router.refresh();
    } catch {
      setMessage("The order could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="resale-actions">
      {sale.status === "pending_payment" ? (
        <>
          <button
            className="primary-link"
            disabled={busy || !sale.paymentReference}
            onClick={() => void act("approve_payment")}
            type="button"
          >
            Approve verified payment
          </button>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() =>
              void act("reject_payment", { notes: "Payment was not verified." })
            }
            type="button"
          >
            Reject payment
          </button>
        </>
      ) : null}
      {sale.status === "completed" && sale.payoutStatus === "ready" ? (
        <>
          <label>
            Payout reference
            <input
              maxLength={160}
              minLength={3}
              required
              value={payoutReference}
              onChange={(event) => setPayoutReference(event.currentTarget.value)}
            />
          </label>
          <button
            className="primary-link"
            disabled={busy}
            onClick={() =>
              void act("mark_payout_paid", { payoutReference })
            }
            type="button"
          >
            Mark payout paid
          </button>
        </>
      ) : null}
      <p className="form-message" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
