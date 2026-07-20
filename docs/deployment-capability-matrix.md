# Deployment Capability and Evidence Matrix

> Authority: generated-status reference. Production eligibility comes only from the release runbook and Phase 11 approval.

| Capability                | Current production                                       | Candidate fixture                                                              | Evidence                                                                 |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| prepare                   | `prepare-deploy-readiness.sh`                            | `release prepare`                                                              | legacy readiness / `release-prepare`                                     |
| deploy                    | `deploy-production.sh`                                   | `release deploy`                                                               | legacy deploy / `release-deploy`                                         |
| backup qualification      | current readiness helpers                                | `release verify-backup`                                                        | `runtime-state-backup-qualification`                                     |
| application-only rollback | automatic current non-database recovery                  | `release rollback-app`                                                         | `app-only-rollback`                                                      |
| evidence chain            | fragmented legacy locations                              | `release evidence verify`                                                      | `release-evidence-index`                                                 |
| maintenance               | separately authorized scripts                            | fixture plan/execute                                                           | maintenance receipts                                                     |
| disaster recovery         | advanced restore procedures remain separately authorized | fixture-only clean-host, salvage, failure-injection, and RTO/RPO qualification | Phase 9 fixture qualification; real-backup qualification remains pending |

Candidate production integration is disabled. A fixture receipt cannot be presented as production evidence.
