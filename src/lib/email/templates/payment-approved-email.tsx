import type { ReactElement } from "react";

/**
 * Payment Approved Email Template
 * 
 * Sent to customer when admin approves their payment proof.
 */

export function PaymentApprovedEmailTemplate({
  orderId,
  productName,
  approvedAt,
}: {
  orderId: string;
  productName: string;
  approvedAt: string;
}): ReactElement {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", lineHeight: 1.6, color: "#333" }}>
      <div style={{ padding: 20 }}>
        <h1 style={{ margin: "0 0 20px", color: "#000" }}>Order #{orderId}</h1>
        
        <p>Your payment has been <strong>approved</strong></p>
        
        <div style={{ background: "#f0fdf4", padding: 20, borderRadius: 8, margin: "20px 0", borderLeft: "4px solid #22c55e" }}>
          <h3 style={{ margin: "0 0 10px", color: "#166534" }}>Payment Status: Approved ✓</h3>
          <p style={{ margin: 0 }}><strong>Product:</strong> {productName}</p>
        </div>
        
        <p style={{ color: "#666", marginTop: 20 }}>
          Your order is now being processed. You will receive your Ownership Code via email once it&apos;s ready.
        </p>
        
        <div style={{ background: "#f5f5f5", padding: 15, borderRadius: 8, margin: "20px 0" }}>
          <p style={{ margin: 0 }}><strong>Approved at:</strong></p>
          <p style={{ margin: "5px 0 0", color: "#666" }}><small>{approvedAt}</small></p>
        </div>
        
        <p style={{ color: "#666", fontSize: 14, marginTop: 30 }}>
          Thank you for shopping with Garieva Prince.
        </p>
      </div>
    </div>
  );
}