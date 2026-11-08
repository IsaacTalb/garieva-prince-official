# Email boundary

Reserved for a provider adapter and transactional outbox delivery. No provider
is chosen and no messages are sent in this phase. Future order/ownership emails
must be enqueued in the same database transaction as their triggering event.
