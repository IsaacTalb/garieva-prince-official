/** Future domain identifiers. A garment instance is not a catalog variant.
 * No ownership claim or NFC verification endpoint exists in the foundation.
 */
export type GarmentIdentity = {
  id: string;
  variantId: string;
  serialNumber: string;
};

export type OwnershipRecord = {
  garmentId: string;
  ownerUserId: string; // Application users.id, never a provider subject.
};
