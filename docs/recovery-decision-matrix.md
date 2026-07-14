# Recovery Decision Matrix

> Authority: operator decision reference. The release runbook remains the only current live-window procedure.

| Decision | Availability | Affected state | Data-loss boundary | Expected RTO | Authority | Receipt |
| --- | --- | --- | --- | --- | --- | --- |
| automatic current non-database recovery | current production wrapper | application files/images | database preserved | fastest | approved release operator | legacy deploy receipt |
| `release rollback-app` | fixture candidate only | `server`, `ui` | database and Redis preserved | fixture target ≤300s | fixture operator | `app-only-rollback` |
| restore-data | advanced current recovery | database/runtime files | writes after selected backup may be lost | backup-dependent | separately approved destructive recovery | restore receipts |
| legacy `rollback.sh` | advanced destructive | application and database | writes after target backup may be lost | slower | separately approved destructive recovery | legacy rollback evidence |
| restore-disaster | deferred Phase 9 | clean host and all runtime state | selected recovery point | not qualified | disaster authority | Phase 9 evidence |

If migration compatibility is incompatible or expired, do not choose application rollback. Preserve evidence, inspect database state, and escalate before selecting a destructive restore.
