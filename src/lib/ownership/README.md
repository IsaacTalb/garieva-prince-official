# Ownership boundary

Reserved for transactional garment issuance, claims, and transfers. All owner
foreign keys reference application `users.id`. Ownership history must remain
independent from catalog edits, account provider changes, and resale listings.
No ownership mutation service is implemented in this phase.
