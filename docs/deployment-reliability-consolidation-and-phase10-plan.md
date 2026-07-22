# Deployment Reliability Consolidation and Phase 10 Master Plan

> Authority: implementation plan. This records Phase 10 requirements and rationale; it is not a production runbook or authorization to access production.

## Purpose

This plan describes how to consolidate the Phase 1–8 deployment-reliability work,
correct the inconsistencies found during the repository audit, and complete Phase
10's operator interface, documentation, and observability goals without changing,
invoking, or depending on the current production deployment.

The intended result is one understandable release system built from small,
testable components. It must qualify the exact code being released, protect all
irreplaceable state, optionally verify a production-style build against safely
copied data, assess host health without mutation, support fast application-only
rollback, minimize routine downtime, and produce an auditable evidence chain.

This is an implementation plan, not authorization to deploy or access production.

## Non-negotiable production safety boundary

### Current production path remains unchanged

Until a separately approved Phase 11 cutover, the supported production path
remains:

```bash
./scripts/prepare-deploy-readiness.sh -v <VERSION> -e .env-prod
./scripts/deploy-production.sh -v <VERSION> -e .env-prod
```

Implementation of this plan must not:

- change the behavior, arguments, ordering, or subprocesses of these commands;
- redirect either command into a new Phase 5–10 implementation;
- change `deploy.sh`, `server.sh`, `rollback.sh`, or production Compose behavior;
- enable any `productionIntegrationEnabled` or equivalent feature flag;
- create a real production adapter for a fixture-only command;
- make new commands discover or consume `.env-prod` by default;
- connect to production through SSH, HTTP, DNS, Docker contexts, or provider APIs;
- create, copy, upload, restore, mutate, clean, update, restart, or delete production
  data or resources;
- modify VPS cron jobs, timers, services, firewall rules, packages, Docker resources,
  release directories, backups, locks, or environment files.

### Permitted implementation environment

All implementation and tests must use:

- synthetic databases and uploads;
- temporary owner-only directories;
- injected command adapters and stubs;
- disposable Docker projects with non-production names when real integration is
  necessary;
- isolated networks with no production connectivity;
- local S3-compatible emulators rather than real providers;
- generated credentials that cannot authenticate anywhere outside the fixture;
- fixture receipts with explicit `scope: fixture` evidence.

No test may require `.env-prod`, a production hostname, production DNS, an SSH key,
or production credentials. A test that cannot prove this boundary must not run in
the normal suite.

### Change-isolation rule

New orchestration must live behind a new command or fixture-only interface. Existing
commands may receive documentation-only deprecation notices or tested aliases only
after behavior-equivalence tests exist. Removal or redirection of an existing command
is reserved for Phase 11.

## Why consolidation is required

The individual Phase 1–8 components contain strong safety ideas, but the audit found
that they do not yet form one reliable system:

1. Phase 5 expects `appliedMigrations`, while Phase 6 defines `migrations[]`.
2. Several tools validate a policy separately but hard-code their operational rules,
   allowing the policy and implementation to drift.
3. Some cross-phase gates accept fuzzy receipt names or plain booleans instead of
   verifying exact, hash-bound evidence.
4. Application/state service topology and activation order are duplicated and
   inconsistent.
5. Backup freshness, restore cadence, and SLO values appear in multiple policies.
6. Receipt formats lack a common envelope and centrally enforced schemas.
7. PostgreSQL fixture tags and required production digests are conflated.
8. Safe JSON parsing, path validation, hashing, permissions, timestamps, atomic
   publication, and argument parsing are repeatedly reimplemented.
9. Preparation and backup-validation commands overlap without a clear assurance
   model.
10. The current runbook and Phase 10 proposal use competing command vocabularies.
11. App-only rollback and database-restoring `rollback.sh` are too easy to confuse.
12. Historical plans contain runnable-looking instructions that compete with the
    authoritative runbook.

Adding wrappers before resolving these issues would hide inconsistency rather than
remove it. Contract reconciliation and shared infrastructure therefore precede the
operator interface.

## Target terminology

Use these terms consistently in code, receipts, help, and documentation:

| Term                             | Meaning                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| release qualification            | Evidence that an exact commit and its artifacts are eligible for rehearsal or deployment |
| backup integrity verification    | Cryptographic and structural verification without claiming restorability                 |
| database restore verification    | Disposable restoration plus database invariants                                          |
| application restore verification | Production-style app operation against restored data in an isolated fixture              |
| app rollback                     | Restore application code/images/configuration while preserving the live database         |
| database restore                 | Replace database/runtime state from a selected backup, with stated RPO consequences      |
| disaster restore                 | Rebuild a clean host from independent release and backup artifacts                       |
| health observation               | Read-only collection and classification of system facts                                  |
| maintenance                      | Separately authorized host mutation, never part of deployment                            |
| fixture                          | Synthetic/disposable environment incapable of reaching production                        |
| production observation           | Separately authorized read-only production access                                        |
| production mutation              | Separately authorized production-changing action                                         |

Avoid the unqualified word `rollback` in new operator-facing output. Always say
`app rollback`, `database restore`, or `disaster restore`.

## Target architecture

The target is a layered system:

```text
Operator interface
  release prepare | verify-local | deploy | rollback-app | health
  release restore-database | restore-disaster | maintenance
                         |
Release orchestration and state machine
                         |
Evidence verifier registry and typed receipts
                         |
Small Phase 1–8 domain helpers
                         |
Injected fixture/production adapters
```

The operator interface must not duplicate domain logic. It selects, orders, and
verifies helpers. Domain helpers remain independently testable. Adapters isolate
external commands and must declare their permitted scope and operations.

## Program-wide engineering rules

Every phase below must follow these rules:

1. Fail closed before mutation.
2. Plan or dry-run is the default for every potentially mutating new command.
3. Never infer evidence from filenames, strings, or booleans when a typed receipt can
   be verified.
4. Never overwrite qualified evidence.
5. Write receipt directories as `0700` and receipt/data files as `0600`.
6. Reject symlinks, special files, path traversal, duplicate keys/objects, unexpected
   files, and unsafe permissions.
7. Use atomic staging and rename/link publication.
8. Preserve useful failure evidence without logging secrets, personal data, database
   contents, provider output, or environment values.
9. Bind every decision to exact input hashes, policy hashes, release version, commit,
   scope, and timestamps.
10. Retain compatibility readers for existing evidence; do not rewrite historical
    backups or receipts.
11. Test cleanup after success, failure, timeout, and interruption.
12. Keep production integration disabled until Phase 11 explicitly changes it.

## Phase A: Baseline, ownership, and traceability freeze

### Goal

Create a reproducible inventory of the Phase 1–8 implementation before refactoring.

### Work

1. Inventory every deployment-related:
   - shell and Node command;
   - package script;
   - public entry point and internal helper;
   - policy/configuration file;
   - receipt producer and consumer;
   - adapter and fixture;
   - Compose file and service role;
   - runbook, plan, SLO, and maintenance document.
2. Create a machine-readable traceability inventory containing:
   - owning phase and concern;
   - public/internal/legacy status;
   - read-only or mutating behavior;
   - supported scope;
   - default mode;
   - confirmation requirements;
   - policies consumed;
   - receipts produced and consumed;
   - external commands invoked;
   - production connectivity potential;
   - tests covering the surface.
3. Record the exact existing production command order as a frozen contract test.
4. Classify current uncommitted Phase 5–8 changes by readiness and dependency.
5. Record known inconsistencies as failing or quarantined contract tests where
   practical, without changing existing runtime behavior.
6. Split future implementation into reviewable commits by phase/concern. Do not mix
   contract migration, operator UI, documentation, and production adoption.

### Validation

- Inventory contains every `scripts/*` public candidate and every `package.json`
  deployment-related alias.
- Every receipt type has at least one producer and all consumers listed.
- Existing deployment-order tests pass unchanged.
- Repository safety audit and `git diff --check` pass.
- No test invokes an unstubbed production-capable command.

### Exit criteria

- Reviewers can trace any operator command to policies, helpers, receipts, adapters,
  and tests.
- The current production path is mechanically proven unchanged.
- Known inconsistencies are documented and prioritized.

## Phase B: Canonical shared domain contracts

### Goal

Eliminate duplicated or contradictory definitions before changing orchestration.

### B1. Release identity contract

Define one strict release identity containing:

- release version;
- full lowercase Git commit;
- repository identity where needed;
- trusted validation manifest ID/hash;
- immutable release policy ID/hash;
- creation timestamp;
- explicit fixture/local/production scope.

Version reuse and mismatched commit/version combinations must fail closed.

### B2. Service topology contract

Define application topology once:

- application services: `server`, then `ui` for activation;
- protected state services: `db`, `redis`;
- service dependencies;
- health order;
- allowed lifecycle operations by scope;
- forbidden state-service recreation and destructive Compose operations;
- required container, volume, and sentinel identity checks.

Phase 5 app rollback and Phase 7 activation must consume the same topology hash.

### B3. Migration metadata contract

Replace the incompatible Phase 5/6 shapes with one schema containing:

- release identity;
- release-level compatibility classification;
- ordered `migrations[]`, each with an ID;
- exact expected starting and ending migration sets or deterministic derivation;
- expand/transition/contract phase;
- rollback compatibility and bounded-window expiry;
- lock risk, duration, affected-row estimate, transaction strategy, disk requirement;
- supported/tested PostgreSQL versions;
- resumable/idempotent/batched backfill metadata;
- special deployment/forward-fix plan for incompatible or high-risk changes;
- rationale and evidence references.

Update bundle, migration runner, compatibility evaluator, and app rollback to use
this one schema. Tests must use the canonical checked-in schema rather than a bespoke
look-alike fixture.

### B4. SLO and freshness contract

Create one authoritative policy for:

- trusted receipt maximum age;
- pre-deployment backup maximum age;
- remote-copy maximum age;
- routine RPO exposure;
- fixture restore cadence;
- approved real-backup restore cadence;
- app rollback RTO;
- database/disaster restore RTO;
- routine downtime target;
- health observation freshness;
- incident-hold behavior.

Other policies must reference or embed the authoritative policy hash, not redefine
these values. Clearly distinguish fixture drill cadence from real-backup drill
cadence.

### B5. PostgreSQL image identity contract

Model these separately:

- readable fixture tag, such as a major-version Alpine tag;
- immutable digest used for qualification;
- optional local image archive hash;
- source and target PostgreSQL majors;
- status: required, exploratory, or unsupported.

Fixture tests may use a reviewed tag when explicitly marked non-qualifying. Any
production-eligible evidence must require a digest.

### Validation

- JSON schemas reject unknown properties unless an explicit extension object exists.
- Arrays requiring uniqueness reject duplicates and unexpected elements.
- Phase 5 bundle creation accepts canonical Phase 6 metadata.
- Phase 5–7 all consume the same topology and migration hashes.
- Conflicting SLO values cannot be checked in unnoticed.
- Floating image tags cannot qualify production eligibility.

### Exit criteria

- Each shared concept has one owner and one authoritative contract.
- No consumer carries a private, incompatible interpretation of the same concept.

## Phase C: Shared safety and receipt library

### Goal

Remove repeated security-sensitive plumbing and create trustworthy typed evidence.

### C1. Shared safe primitives

Create a small dependency-light library for:

- strict CLI parsing and consistent usage errors;
- regular non-symlink file checks;
- owner-only permission enforcement;
- safe relative-path validation;
- strict JSON parsing and schema validation;
- canonical JSON serialization;
- SHA-256 file/value hashing;
- ISO timestamp validation and bounded freshness;
- safe directory creation;
- atomic no-overwrite publication;
- temporary staging and idempotent cleanup;
- child-process execution with timeouts and redaction;
- fixture-scope and production-integration guards.

Do not create an oversized framework. Keep domain decisions in domain modules.

### C2. Common receipt envelope

All new JSON receipts should share:

```json
{
  "schemaVersion": 1,
  "receiptType": "<TYPE>",
  "status": "success",
  "scope": "fixture",
  "producer": {
    "name": "<TOOL>",
    "version": "<VERSION>"
  },
  "release": {
    "version": "<VERSION>",
    "commit": "<FULL_SHA>"
  },
  "policy": {
    "id": "<POLICY_ID>",
    "sha256": "<SHA256>"
  },
  "startedAt": "<ISO_TIMESTAMP>",
  "finishedAt": "<ISO_TIMESTAMP>",
  "durationMilliseconds": 0,
  "inputs": [],
  "outputs": [],
  "childReceipts": [],
  "result": {}
}
```

Type-specific fields belong under `result`. Failure receipts must use a safe error
code and redacted summary.

### C3. Receipt schema and verifier registry

Create versioned schemas and verifiers for at least:

- trusted validation;
- content manifest and archive;
- database invariant/restore verification;
- backup qualification;
- remote publication/download verification;
- backup freshness;
- local application verification;
- immutable release bundle;
- migration rehearsal/execution;
- rollback compatibility;
- VPS health;
- maintenance plan/execution;
- reduced-downtime rehearsal/deployment;
- app rollback;
- known-good release;
- aggregate release qualification and deployment.

The registry must verify exact receipt type/version, status, scope, timestamps,
release identity, policy hash, artifact hashes, permissions, and child evidence.

### C4. Compatibility readers

Add read-only adapters for legacy JSON and `key=value` receipts. Compatibility
readers must:

- identify the original format;
- preserve documented assurance limitations;
- never silently promote weak legacy evidence to full qualification;
- never rewrite the original receipt;
- produce a new compatibility-verification receipt when needed.

### Validation

- Negative tests cover malformed JSON, duplicate keys, unknown fields, symlinks,
  modes, stale/future timestamps, wrong scope, wrong release, wrong policy, hash
  mismatch, missing children, cycles, and duplicated evidence.
- Interrupted publication leaves no qualified final receipt.
- Failure output redacts injected credentials and data.
- Existing legacy fixtures remain readable with explicit limitations.

### Exit criteria

- Receipt consumers call typed verifiers rather than perform ad hoc field checks.
- Shared sensitive primitives have focused security tests.

## Phase D: Repair Phase 1–8 integration contracts

### Goal

Make existing components compose correctly while keeping them fixture-only and
disconnected from current production commands.

### D1. Trusted validation and immutable bundles

- Make bundle creation and verification consume the immutable release policy.
- Copy/hash-bind the exact policy and validation manifest into the bundle.
- Invoke the canonical trusted-receipt verifier for the exact commit.
- Require exact artifact kinds and digest identities from schema, not hard-coded
  duplicated lists.
- Verify an exact inventory and reject extras.

### D2. Backup qualification

Define a single high-assurance backup qualification receipt that binds:

- runtime-state inventory and policy;
- stable content manifest;
- archive size/hash;
- database restore/invariant receipt;
- upload-reference verification;
- source commit/release;
- capture timestamps and age;
- encryption/publication/download verification where required;
- stated limitations for legacy format.

Controlled migrations, release preparation, health, and maintenance must verify this
exact type. Remove substring checks such as “receipt type contains backup.”

### D3. Migration and rollback compatibility

- Bind compatibility to target release and commit.
- Bind it to the canonical metadata hash and observed database-facts hash.
- Record evaluated database migration set and PostgreSQL major.
- Enforce bounded-window expiry at consumption time, not only production time.
- Reject partial/failed migrations and unknown extra migrations.
- Require app rollback to consume the compatibility verifier rather than reimplement
  classification checks.

### D4. Reduced-downtime rehearsal

- Bind all preflight receipts to the same release context.
- Require exact compatibility and bundle evidence.
- Use shared topology.
- Prove only application services are activated.
- Preserve DB/Redis container IDs, volumes, health, and write sentinel.
- Measure user-visible failure intervals through repeated probes.
- Treat recovered deployment as a failed deployment with successful recovery, not a
  successful deployment.

### D5. VPS health and maintenance

- Replace qualified-backup/remote-copy/restore booleans with receipt references.
- Verify freshness and hashes when creating the maintenance plan and again before
  execution.
- Bind selected action IDs and host fingerprint into an immutable plan.
- Keep observation read-only and maintenance separate from release deployment.

### Validation

- Cross-release, cross-commit, cross-policy, stale, fixture/production-scope, and
  substituted receipt tests fail.
- Canonical Phase 5–8 fixtures pass end to end.
- Existing production scripts and ordering tests remain byte/behavior unchanged.

### Exit criteria

- Phase boundaries exchange typed, exact, cryptographically bound evidence.
- No fuzzy receipt or boolean prerequisite remains in a release-critical decision.

## Phase E: Command surface and operator information architecture

### Goal

Make the safe workflow obvious without creating another uncontrolled synonym layer.

### E1. Command registry

Create a machine-readable command catalog containing:

- canonical name and subcommand;
- compatibility aliases;
- audience: routine, advanced, recovery, development;
- scope capabilities;
- read-only/mutating classification;
- default plan/execute behavior;
- exact confirmation phrase rules;
- policies and receipts;
- replacement/deprecation status;
- help/documentation location.

Use the registry for static validation and documentation generation. Do not require
registry parsing in a production mutation path unless its integrity is verified.

### E2. Canonical CLI

Develop one additive fixture/local CLI with subcommands:

```text
release prepare
release verify-local
release deploy
release rollback-app
release health
release restore-database
release restore-disaster
release maintenance plan
release maintenance execute
release evidence verify
release evidence summarize
```

Initially:

- `prepare`, `verify-local`, and `deploy` operate only with fixtures/local adapters;
- all execution-capable commands require explicit fixture context;
- restore and maintenance default to plan mode;
- no subcommand discovers or calls current production entry points;
- production mode exits with an explanation that Phase 11 approval is required.

### E3. Consistent CLI behavior

Every command must provide:

- side-effect-free `--help`;
- a one-line safety classification;
- required inputs and generated outputs;
- plan/default behavior;
- explicit stop conditions;
- consistent `--policy`, `--receipt`, `--output`, `--execute`, and `--confirm` forms;
- stable exit codes for invalid input, failed gate, failed mutation, successful recovery,
  and internal error;
- structured receipt output plus concise human output.

### E4. Compatibility aliases

Do not immediately rename or remove existing scripts. Add aliases only after tests
prove exact delegation. Mark aliases as current, advanced, legacy, or deprecated.
Choose one of `validate:trusted` and `validate:release` as canonical; retain the other
temporarily as an explicit alias.

### E5. Assurance profiles

Consolidate confusing backup checks behind named profiles:

- `integrity`: manifest/archive only;
- `database`: disposable database restore and invariants;
- `application`: isolated production-style application verification;
- `remote`: download, decrypt, and full verification;
- `full`: every required qualification stage.

The profile must be recorded in the receipt. A weaker profile must never satisfy a
stronger gate.

### Validation

- Help is side-effect-free for every command and alias.
- Routine help never recommends destructive recovery.
- Mutation commands default to plan mode.
- Production scope is rejected during this plan.
- Aliases delegate arguments and exit codes exactly.
- Command registry, package scripts, generated reference, and docs cannot drift.

### Exit criteria

- An operator can identify prepare, optional local verification, deploy, app rollback,
  and destructive recovery distinctions in under two minutes.
- There is one canonical vocabulary.

## Phase F: Release state machine and aggregate evidence chain

### Goal

Turn individual receipts into a deterministic release lifecycle.

### States

Define at least:

```text
draft
  -> validated
  -> bundled
  -> backup-qualified
  -> locally-verified (optional)
  -> migration-qualified
  -> health-qualified
  -> deploy-ready
  -> activating
  -> deployed
  -> known-good

Failure branches:
  blocked | activation-failed | recovered-by-app-rollback | recovery-required
```

Transitions must require typed evidence. No state may be selected manually merely by
editing a file.

### Prepare orchestration

The fixture/local `release prepare` flow should:

1. establish exact release identity;
2. verify clean source and trusted gate evidence;
3. validate canonical migration metadata;
4. create and verify immutable bundle;
5. run backup preflight and fixture backup qualification;
6. verify encrypted remote publication/download in an emulator where selected;
7. optionally run isolated application verification;
8. rehearse controlled migration;
9. evaluate app rollback compatibility;
10. evaluate fixture host health;
11. produce one aggregate deploy-readiness receipt.

### Deploy rehearsal orchestration

The fixture-only `release deploy` flow should:

1. verify the aggregate readiness receipt and every child hash;
2. recheck time-sensitive evidence;
3. acquire a fixture deployment lock;
4. record protected state identity;
5. run one-shot controlled migration;
6. activate server, wait for dependency-aware health, then activate UI;
7. probe public availability continuously;
8. run public and post-deploy smoke tests;
9. confirm protected state identity and sentinel preservation;
10. atomically record known-good release;
11. produce a final aggregate deployment receipt;
12. invoke app rollback only with valid compatibility evidence.

### Evidence graph validation

The aggregate verifier must detect:

- missing or duplicated children;
- cycles;
- mixed release versions/commits/scopes;
- stale evidence;
- incompatible policies;
- changed child receipt bytes;
- qualified parent referencing failed child;
- optional evidence falsely represented as mandatory or vice versa.

### Exit criteria

- One receipt explains why a release is ready or blocked.
- One deployment receipt explains every phase, duration, and recovery decision.
- The chain can be verified offline.

## Phase G: Observability and SLO reporting

### Goal

Make reliability measurable without creating a telemetry or privacy risk.

### Work

1. Record consistent phase timings for validation, build, backup, archive, encryption,
   publication, download, database restore, local app verification, migration,
   activation, health, public downtime, smoke, and rollback.
2. Record safe sizes/counts such as archive bytes and number of files, never contents.
3. Build an offline receipt summarizer producing:
   - release outcome;
   - slowest phases;
   - user-visible downtime;
   - RPO exposure;
   - backup/restore freshness;
   - app rollback RTO;
   - failure code and recovery outcome;
   - SLO pass/fail.
4. Add a local trend summarizer for deployment success rate, duration percentiles,
   downtime percentiles, repeated failure classes, backup duration/size trends, and
   drill freshness.
5. Define alert contracts for stale/missing backups, failed publication, failed
   restore drill, stale trusted evidence, repeated deployment failure, health blockers,
   and SLO violations.
6. Keep alert transport provider-neutral and fixture-tested. Do not configure a real
   alert destination in this plan.
7. Define retention and redaction rules for receipts and diagnostic logs.

### Privacy and security requirements

Receipts and summaries must not contain:

- environment values or connection strings;
- credentials, tokens, keys, or authorization headers;
- production IPs/domains unless separately approved operational evidence requires it;
- database rows, user identifiers, email addresses, phone numbers, or upload names;
- raw child-process/provider output.

### Validation

- Secret/PII canary tests fail if injected values appear in output.
- Malformed or mixed receipt histories cannot produce trustworthy trends.
- SLO calculations use explicit authoritative units and thresholds.
- Failed and recovered deployments are counted accurately.

### Exit criteria

- Reliability trends are derivable from receipts without production connectivity.
- Operators receive concise decision-oriented summaries.

## Phase H: Documentation consolidation

### Goal

Create one authoritative operational information architecture.

### Documents

Maintain exactly these current operational layers:

1. **Release runbook** — short checklist and normal path.
2. **Generated command reference** — arguments, safety classes, and receipts.
3. **Evidence reference** — receipt types, relationships, storage, verification.
4. **Recovery decision guide** — app rollback vs database restore vs disaster restore.
5. **Maintenance guide** — separate health observation and approved maintenance.
6. **Architecture/developer guide** — adapters, policies, schemas, extension/testing.

Historical action plans should be marked clearly as non-authoritative and moved to an
archive/index where practical. Do not delete useful rationale.

### Runbook content

The runbook must include:

- exact current normal production command until Phase 11;
- clearly separated future/shadow commands;
- preflight checklist;
- stop conditions;
- expected evidence;
- downtime expectation;
- failure decision tree;
- safe app rollback route;
- conspicuous database/disaster restore warnings;
- separate maintenance route;
- escalation conditions.

### Documentation generation and tests

- Generate command tables from the command registry.
- Test that only one command is labeled the normal production path.
- Test that plans are labeled non-authoritative.
- Test that destructive commands include data-loss boundaries.
- Test that no concrete production secrets or infrastructure values appear.
- Test that every referenced command exists and `--help` succeeds without side effects.

### Exit criteria

- A routine operator does not need to read historical implementation plans.
- Documentation and executable help agree mechanically.

## Phase I: Maintainability cleanup

### Goal

Remove duplication after shared contracts and equivalence tests make removal safe.

### Work

1. Migrate scripts incrementally to shared safe primitives.
2. Remove duplicate argument parsing, JSON reading, hashing, timestamp, permissions,
   and atomic-write code only after focused equivalence tests pass.
3. Separate orchestration, domain validation, adapters, and presentation.
4. Keep files small enough that failure paths and mutation boundaries are reviewable.
5. Replace duplicated constants with shared contracts, not implicit imports from an
   unrelated phase.
6. Standardize error codes and concise redacted messages.
7. Document module ownership and extension points.
8. Add static dependency rules preventing domain helpers from importing production
   adapters or operator presentation code.
9. Retain legacy readers/aliases in a clearly isolated compatibility area.

### Validation

- Before/after golden tests prove unchanged domain behavior.
- Mutation tests prove safety checks are effective rather than merely executed.
- Coverage includes success, negative, interruption, and cleanup paths.
- Lint, type checks, formatting, Node syntax, shell checks, and Bats pass.

### Exit criteria

- Security-sensitive behavior has one implementation.
- Public commands remain thin orchestration layers.
- Compatibility code is visibly separate from canonical code.

## Phase J: Comprehensive fixture and clean-checkout qualification

### Goal

Prove the consolidated system is reproducible, safe, and independent of developer
machine state.

### Required test matrix

#### Evidence and identity

- wrong commit/version/policy/scope;
- stale and future receipts;
- missing, duplicated, unexpected, or cyclic child evidence;
- corrupted bytes and hashes;
- symlink, special-file, unsafe-path, wrong-mode, and overwrite attacks.

#### Backup and local verification

- missing/truncated/changing files;
- corrupt archive and SQL;
- missing uploads referenced by the database;
- wrong encryption key and corrupt remote download;
- no external egress;
- fake delivery sinks receive all attempted side effects;
- empty active Redis and scrubbed queue compatibility;
- cleanup after every interruption point.

#### Migration

- old app/new schema and new app/transition schema;
- destructive/incompatible classification;
- expired bounded window;
- partial migration;
- advisory lock contention;
- timeout, disk shortage, and retry behavior;
- resumable/idempotent batched backfill;
- PostgreSQL compatibility matrix.

#### Deployment and rollback

- server/UI startup and health failures;
- proxy/public route failure;
- post-smoke failure;
- registry unavailable with offline bundle;
- corrupt/missing rollback bundle;
- DB/Redis container and volume preservation;
- database write sentinel preservation;
- measured public downtime;
- compatible recovery and incompatible rollback refusal.

#### Health and maintenance

- blocking/warning/informational classifications;
- stale observation;
- changed host fingerprint;
- missing receipt prerequisites;
- incident holds and protected cleanup targets;
- dry-run default and exact confirmation;
- post-maintenance health failure.

#### Operator interface

- all help is side-effect-free;
- aliases delegate exactly;
- destructive commands are never presented as routine;
- all mutating commands default to planning;
- production scope remains disabled;
- output is concise, complete, and redacted.

### Reproducibility gate

Run the complete trusted gate at least twice from independent clean checkouts with:

- no `.env-prod`;
- no ignored backups or receipts;
- no pre-existing dependencies/build outputs;
- disposable Docker names/networks/volumes;
- bounded per-test timeouts;
- cleanup verification.

### Exit criteria

- All tests pass repeatedly from clean checkouts.
- No order dependence, hidden state, or hangs remain.
- CI receipts bind the exact commit and required artifacts.
- Existing production contract tests remain unchanged and green.

## Phase K: Review packaging and merge readiness

### Goal

Make the work reviewable without conflating safe local implementation with production
adoption.

### Recommended commit groups

1. Baseline inventory and failing contract characterization.
2. Canonical shared schemas and policies.
3. Shared safe primitives and receipt envelope.
4. Receipt verifiers and compatibility readers.
5. Phase 1–4 producer/consumer migration.
6. Phase 5/6 contract reconciliation.
7. Phase 7/8 evidence binding.
8. Command registry and fixture-only CLI.
9. Aggregate state machine/evidence graph.
10. Observability and SLO summaries.
11. Documentation consolidation.
12. Duplication cleanup and final fixture qualification.

Each commit must pass its focused tests and preserve current production order. Do not
mix a production integration flag change into any of these commits.

### Review checklist

- No production host/provider/credential values.
- No current deployment behavior change.
- No hidden mutation in validation/help/planning.
- Exact schema and policy enforcement.
- Negative and interruption tests.
- Owner-only evidence permissions.
- Redacted errors.
- Compatibility behavior documented.
- Clean-checkout CI receipt.

## Explicitly deferred work

This plan does not complete or authorize:

- Phase 9 clean-host disaster recovery implementation/adoption;
- a real remote-storage provider configuration;
- production health or maintenance adapters;
- production one-shot migration execution;
- removal of startup-coupled production migrations;
- production reduced-downtime activation;
- automatic production app rollback;
- changing the normal production command;
- enabling branch protection or production timers without administrative approval;
- Phase 11 shadow observation or production cutover.

Interfaces required by Phase 9 may be defined so Phase 10 terminology remains stable,
but Phase 9 implementation and validation will be handled separately.

## Handoff to Phase 11

After this plan is complete, Phase 11 may propose shadow adoption. That later plan
must separately authorize and stage:

1. fixture-only completion;
2. CI/clean-checkout qualification;
3. local disposable Compose rehearsal;
4. reviewed read-only production observation;
5. shadow preparation with no production mutation;
6. explicit per-release go/no-go review;
7. narrowly scoped production cutover;
8. retained legacy path through multiple successful releases and rollback drills.

No completion criterion in this document automatically makes a command production
eligible.

## Program definition of done

This consolidation and Phase 10 program is complete only when:

- one canonical schema connects migration metadata, bundles, execution, and rollback;
- shared topology and SLO contracts replace duplicated definitions;
- every release-critical prerequisite is a typed, hash-bound, freshness-checked
  receipt rather than a boolean or fuzzy label;
- governing policies are consumed and hash-bound by their implementations;
- receipt schemas share a common envelope and have canonical verifiers;
- legacy evidence remains readable with honest limitations;
- one additive operator interface uses consistent terminology and plan-first behavior;
- one offline-verifiable evidence chain explains release readiness and deployment;
- observability reports timings, RPO/RTO, downtime, and failure causes without secrets;
- documentation has one authoritative current production path and clearly labels
  future/shadow behavior;
- duplicated safety-sensitive code has been consolidated behind tested helpers;
- comprehensive fixture and failure-injection tests pass repeatedly from clean
  checkouts;
- existing production commands and deployment ordering remain unchanged;
- all production integration remains disabled pending Phase 11 approval.

## Execution-agent first actions

The execution agent should begin by:

1. reading this plan and the deployment reliability master plan completely;
2. inspecting the dirty working tree without discarding or overwriting existing work;
3. running only read-only repository inventory commands;
4. creating the Phase A traceability inventory;
5. adding characterization tests for the Phase 5/6 metadata incompatibility and weak
   cross-phase receipt acceptance;
6. proposing the canonical schemas before refactoring producers or consumers;
7. confirming existing production-order tests remain unchanged;
8. reporting the intended first reviewable commit boundary before implementing later
   phases.

At every handoff, the agent must state which production-capable commands were not run,
which tests used stubs or disposable resources, which phases remain fixture-only, and
which exit criteria are still outstanding.
