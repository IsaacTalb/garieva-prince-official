import type { ReactElement } from "react";

/**
 * Claim Code Email Template
 * 
 * Sent to customer when ownership claim code is generated
 * after payment approval.
 */

export function ClaimCodeEmailTemplate({
  productName,
  size,
  serial,
  claimCode,
  expiryDate,
}: {
  productName: string;
  size: string;
  serial: string;
  claimCode: string;
  expiryDate: string;
}): ReactElement {
  return (
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="padding: 20px;">
        <h1 style="margin: 0 0 20px 0; color: #000;">Your Ownership Code is Ready!</h1>
        
        <p>Thank you for your purchase of:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0;">{productName}</h2>
          <p><strong>Size:</strong> {size}</p>
          <p><strong>Serial Number:</strong> {serial}</p>
        </div>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">Your Ownership Code:</h3>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 10px 0;" className="claim-code">{claimCode}</p>
          <p style="color: #999; margin: 0;">Tap your NFC tag on our verification reader, then enter this code to claim ownership.</p>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0;"><strong>⏰ Important:</strong> This code will expire in 24 hours.</p>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Need help? Contact our support team at <a href="mailto:support@garieva-prince.com" style="color: #0070f3;">support@garieva-prince.com</a>
        </p>
      </div>
    </div>
  );
}