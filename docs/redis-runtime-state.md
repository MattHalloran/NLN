# Redis Runtime-State Classification

> Authority: runtime-state reference. It does not authorize restore or production mutation.

Redis is classified as operationally important but recoverable.

PostgreSQL remains the data of record for business data. Runtime-state backups still include `data/redis`, but that copy is a best-effort filesystem backup of Redis operational state, not a database-grade consistency guarantee.

## Current Redis Uses

Bull queues:
Email, SMS, image cleanup, and label sync jobs use Bull queues backed by Redis. Losing Redis can lose queued-but-unprocessed jobs and recent queue history. Scheduled cleanup/sync jobs are idempotently re-created on application startup.

Rate limiting:
API and image-upload rate limit counters use Redis with TTLs. Losing this data resets rate-limit windows.

Distributed locks:
Image/file operations use Redis locks with TTLs. Losing this data releases transient locks.

Cache:
Landing-page cache data is derived and can be rebuilt from the application/database source.

## Backup Semantics

`backup.sh` includes `data/redis` in runtime-state backups so restore can recover useful operational state when possible. The manifest records:

- `redis_data_classification=operationally-important-recoverable`
- `redis_backup_semantics=best-effort-file-copy`

Do not treat the Redis copy as proof that every queued job or transient counter was captured at an exact point in time. For data-loss decisions, rely on the logical PostgreSQL dump, uploads/assets backup, and any documented emergency dump.

## Restore Expectations

If Redis restore is incomplete or intentionally skipped:

- queued emails/SMS may need manual review or re-triggering;
- cleanup and label-sync schedules should be re-created by app startup;
- rate-limit counters reset;
- landing-page cache warms again from normal traffic;
- transient locks expire or are recreated by new operations.

## Future Critical-Redis Path

If queued email/SMS delivery becomes business-critical, revisit this classification. A stronger design should avoid relying on Redis filesystem snapshots alone, for example by persisting outbound message intent in PostgreSQL and making queue processing idempotent from that durable table.
