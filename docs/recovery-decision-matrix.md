# Recovery Decision Matrix

> Authority: operator decision reference. The release runbook remains the only current live-window procedure.

| Decision                                | Availability                         | Affected state                                    | Data-loss boundary                                                         | Expected RTO                      | Authority                                           | Receipt                                                    |
| --------------------------------------- | ------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| automatic current non-database recovery | current production wrapper           | application files/images                          | database preserved                                                         | fastest                           | approved release operator                           | legacy deploy receipt                                      |
| `release rollback-app`                  | fixture candidate only               | `server`, `ui`                                    | database and Redis preserved                                               | fixture target ≤300s              | fixture operator                                    | `app-only-rollback`                                        |
| restore-data                            | advanced current recovery            | database/runtime files                            | writes after selected backup may be lost                                   | backup-dependent                  | separately approved destructive recovery            | restore receipts                                           |
| legacy `rollback.sh`                    | advanced destructive                 | application and database                          | writes after target backup may be lost                                     | slower                            | separately approved destructive recovery            | legacy rollback evidence                                   |
| `rehearse:disaster-recovery`            | fixture-only Phase 9 candidate       | disposable clean host and synthetic runtime state | measured synthetic recovery point; never real production data              | policy target ≤2h                 | fixture operator                                    | Phase 9 drill, salvage, and program qualification evidence |
| restore-disaster                        | production-disabled pending Phase 11 | clean host and all runtime state                  | writes after selected recovery point may be lost or require manual salvage | real-backup RTO not yet qualified | disaster authority and explicit production approval | approved real-backup Phase 9 evidence                      |

If migration compatibility is incompatible or expired, do not choose application rollback. Preserve evidence, inspect database state, and escalate before selecting a destructive restore.

The three recovery classes are intentionally separate:

- App-only rollback preserves PostgreSQL and Redis.
- Database/runtime restore replaces selected state and requires explicit RPO analysis plus emergency evidence.
- Disaster restore rebuilds a clean host from independently stored release, encrypted backup, identity, and configuration artifacts.

The fixture disaster rehearsal never authorizes either destructive production path.
