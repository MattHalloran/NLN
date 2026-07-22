# Phase 10 Operator Interface, Coherence, and Observability Action Plan

> Authority: candidate design and implementation acceptance plan. It does not authorize production activity.

## Status and authority

This is the detailed implementation plan for Phase 10 of
`docs/deployment-reliability-master-plan.md`.

It incorporates a repository audit of the Phase 1–8 implementation. It is a
plan, not a production runbook, and it does not authorize production access,
deployment, maintenance, restore, rollback, Docker mutation, SSH, or cutover.

Until Phase 11 explicitly promotes the candidate workflow:

- the **current supported production path** remains
  `prepare-deploy-readiness.sh` followed by `deploy-production.sh`;
- Phase 5–8 commands remain additive, fixture/rehearsal-only, and disconnected
  from production;
- new Phase 10 wrappers must default to local planning or rehearsal and must not
  silently redirect the current production path;
- Phase 9 disaster-recovery implementation and Phase 11 production adoption are
  intentionally deferred.

## Objective

Turn the Phase 1–8 collection of individually safe tools into one coherent,
auditable release system without weakening their safety boundaries.

Phase 10 is complete when:

1. shared concepts have one authoritative contract;
2. cross-phase evidence is cryptographically and semantically linked;
3. operators see one vocabulary and a small decision-oriented command surface;
4. current and candidate production paths cannot be confused;
5. receipts can be discovered, validated, aggregated, and summarized;
6. documentation has one authoritative live-window procedure;
7. fixture qualification proves usability and failure behavior;
8. no Phase 10 merge changes the current production deployment behavior.

## Audit findings to resolve

### P0: correctness and safety inconsistencies

1. **Phase 5 and Phase 6 migration schemas do not compose.**
   `immutable-release-bundle.mjs` and `app-only-rollback.mjs` expect
   `appliedMigrations`, while the canonical Phase 6 file defines `migrations[]`.
   Current fixture tests can pass using bespoke metadata even though the real
   contracts cannot form one evidence chain.
2. **Controlled migration backup qualification is too broad.** A successful
   receipt whose type merely contains `backup` is accepted. It does not prove
   v2 qualification, restore verification, freshness, source identity, or the
   required database invariant evidence.
3. **Reduced-downtime rollback evidence is weakly linked.** A successful
   compatibility receipt is accepted without rechecking its release, commit,
   metadata hash, observed database facts, freshness, or bounded compatibility
   window against the deployment context.
4. **Maintenance prerequisites are booleans rather than verified evidence.**
   Backup, remote-copy, and restore readiness need receipt references, hashes,
   freshness checks, and policy identities.
5. **Several policy files are validated separately from their implementation.**
   The immutable bundle implementation hard-codes parts of the policy instead
   of consuming and hash-binding the policy it claims to follow.

### P1: duplicated or conflicting contracts

1. Application service ordering is `[ui, server]` in one policy and
   `[server, ui]` in another. Service membership and activation order are
   different concepts and must not share one ambiguous array.
2. Backup freshness, restore cadence, health thresholds, and PostgreSQL support
   are repeated across several policies. Some repeated values happen to match;
   others represent different concepts with similar names.
3. PostgreSQL policy requires digest-pinned production images, while the matrix
   and validator currently require floating tag syntax. Fixture image selection
   and production-qualified image identity need separate fields.
4. A successful publication to one storage provider can be mistaken for proof
   of the global 3-2-1 resilience objective. Publication qualification and
   resilience qualification are distinct states.
5. Provider features such as versioning/object lock and server-side encryption
   are policy assertions without provider capability evidence.
6. Receipt types, status values, timestamps, ownership rules, failure receipts,
   and release/commit binding fields vary by tool.
7. Older restore and local-verification tools emit `key=value` receipts while
   newer tools emit JSON.

### P1: operator-interface duplication

1. `validate:trusted` and `validate:release` currently run the same gates.
2. Preparation and readiness repeat environment and backup preflight work.
3. Restore drill and local production-backup verification share backup input
   resolution but provide different assurance levels that their names do not
   clearly communicate.
4. Runtime-state package command names blur content-manifest verification,
   archive verification, compatibility reading, and full backup qualification.
5. CLI grammar alternates between `validate:*`, `evaluate:*`, `create:*`,
   `record:*`, `run:*`, `plan:*`, `execute:*`, and direct shell commands.
6. Generic “rollback” language can refer either to safe app-only rollback or a
   destructive application-and-database rollback.
7. Important commands are split between package aliases and directly invoked
   scripts, so there is no single discoverability surface.

### P1: documentation and observability inconsistency

1. Three older plans use conflicting phase taxonomies; “Phase 10” does not mean
   the same thing in all of them.
2. Current docs name the existing two-command production path, while the master
   plan proposes three not-yet-created `release-*` wrappers.
3. `deployment-surface-inventory.md` combines a stable ownership inventory,
   implementation journal, clean-checkout notes, and Phase 1–8 narratives.
4. `docs/README.md` and the root README route readers toward an older hardening
   plan instead of the current runbook, master plan, SLO, maintenance, migration,
   and capability references. Its hard-coded update date is not useful evidence
   of operational freshness.
5. The release runbook describes the current recovery model but cannot yet
   present Phase 5 app rollback as production-supported.
6. Receipt locations and names span `.deploy-readiness`, `.validation`, backup
   directories, and `/var/tmp`; there is no evidence catalog or release index.
7. SLOs do not consistently define formulas, time windows, fixture versus
   production evidence, sample sizes, alert ownership, or review rules.
8. Backup terms such as captured, verified, restore-verified, qualified,
   encrypted, remote, off-VPS, and offsite are used too loosely.

### P2: maintainability

1. Argument parsing, safe JSON reading, regular-file checks, SHA-256 hashing,
   owner-only output creation, timestamps, redaction, and receipt publication
   are duplicated across Node scripts.
2. Most validators allow unknown object keys and validate required list members
   without rejecting duplicates or unexpected values.
3. Help text is handwritten and inconsistent. Some validators accept a bare
   positional path while others require named options.
4. Historical narrative appears before current procedures in operator-facing
   documentation.

## Target information model

### Release identity

Define one immutable release identity used by every Phase 1–8 producer:

```text
releaseId
releaseVersion
commitSha
trustedManifestId + trustedManifestSha256
bundleManifestSha256
environmentSchemaSha256
migrationMetadataSha256
```

`releaseId` must not be inferred differently by individual tools. Version reuse
and identity collisions fail closed.

### Shared topology

Define topology once:

- application service membership: `server`, `ui`;
- protected state service membership: `db`, `redis`;
- activation order: `server`, server health, `ui`, UI health;
- protected lifecycle rules: no state recreation, no volume replacement, no
  dependency recreation;
- canonical endpoint and dependency-health contract.

Membership arrays must be unordered sets in schemas. Activation order must be a
separate ordered field.

### Migration contract

Adopt one Phase 6 schema containing:

- release classification;
- exact ordered migration IDs;
- per-migration phase and classification;
- bounded-window deadline where applicable;
- tested PostgreSQL versions;
- lock, duration, disk, transaction, and backfill information;
- special deployment plan reference where required.

Provide one library verifier used by bundle creation, migration execution,
compatibility evaluation, app rollback, and reduced-downtime deployment.

### Backup assurance states

Use these exact terms:

1. `captured`: bytes and initial manifest were produced;
2. `content-verified`: archive and per-file integrity passed;
3. `database-restore-verified`: disposable database restore and invariants passed;
4. `application-restore-verified`: restored application checks passed;
5. `qualified`: all policy-required checks for the intended operation passed;
6. `encrypted-published`: client-side-encrypted objects were finalized remotely;
7. `remote-download-verified`: remote bytes were downloaded, decrypted, and verified;
8. `resilience-qualified`: the separately defined copy/media/location policy is evidenced.

No lower state may be presented as a higher state. “Offsite” must not be used as
an assurance label without naming the storage location and property demonstrated.

### Command effect classes

Every command must declare one class:

- `local-read-only`;
- `local-fixture-mutation`;
- `production-read-only`;
- `production-copy-out`;
- `production-app-mutation`;
- `production-data-destructive`;
- `maintenance-mutation`.

Help and documentation must show the class, default mode, required authority,
receipt produced, and the safest next command.

### Receipt envelope

All new JSON receipts should use a common envelope:

```json
{
  "schemaVersion": 1,
  "receiptType": "...",
  "receiptId": "...",
  "status": "success|failed|planned|recovered|blocked",
  "scope": "fixture|local|production",
  "producer": { "command": "...", "version": "..." },
  "release": { "version": "...", "commit": "..." },
  "startedAt": "...",
  "finishedAt": "...",
  "policy": { "id": "...", "sha256": "..." },
  "inputs": [],
  "checks": [],
  "outputs": [],
  "failure": null
}
```

Type-specific payloads remain allowed, but common meanings must not be renamed.
Receipts must be canonicalized, owner-only, no-overwrite, hashable, and valid on
failure as well as success. Existing receipts remain readable through explicit
compatibility readers; do not rewrite historical evidence.

## Implementation phases

## Phase 10.0: Freeze, baseline, and traceability

### Work

1. Do not add operator wrappers until the P0 contract conflicts are resolved.
2. Inventory every Phase 1–8 policy, command, receipt producer, receipt consumer,
   external adapter operation, documentation entry point, and package alias.
3. Add a traceability table recording:
   - owning phase;
   - current/candidate/advanced/destructive status;
   - input contracts;
   - output receipt type;
   - production effect class;
   - upstream and downstream evidence;
   - implementation and tests.
4. Record the current working tree as uncommitted implementation. Require
   reviewable commits and clean-checkout validation before Phase 10 exit.
5. Capture current command behavior in contract tests before renaming or
   consolidating anything.

### Exit criteria

- Every public and advanced command has one owner and effect class.
- Every receipt producer and consumer appears in the traceability table.
- No behavior has changed and production integration remains disabled.

## Phase 10.1: Canonical vocabulary, topology, and SLO sources

### Work

1. Create one versioned operational vocabulary contract.
2. Create one topology contract separating membership from activation order.
3. Define authoritative policy ownership:
   - backup age/RPO/retention: backup policy;
   - remote publication/provider capability: remote-storage policy;
   - resilience state: separate resilience evidence;
   - health blocking thresholds: health policy referencing backup SLO identities;
   - restore cadence: separate fixture cadence and qualified-backup cadence;
   - PostgreSQL fixture tags versus production digests: compatibility matrix.
4. Replace copied values with explicit references or validator-enforced equality
   where JSON cannot express references safely.
5. Define SLI formulas, clocks, units, evidence sources, aggregation window,
   fixture/production scope, minimum samples, and alert threshold.

### Exit criteria

- No concept has two differently named authoritative definitions.
- Service ordering and restore cadence ambiguity are eliminated.
- PostgreSQL image policy can represent both fixtures and digest-qualified use.

## Phase 10.2: Shared contract and safe-I/O library

### Work

1. Introduce a small dependency-free internal library for:
   - strict option parsing and consistent exit codes;
   - regular non-symlink and owner-only file checks;
   - safe relative paths;
   - canonical JSON serialization;
   - SHA-256 hashing;
   - ISO timestamp parsing and freshness;
   - atomic/no-overwrite owner-only publication;
   - redacted child-process execution;
   - common receipt envelopes.
2. Add versioned JSON schemas with `additionalProperties: false` by default,
   exact enums, unique arrays, safe extension points, and conditional fields.
3. Add a registry mapping each receipt type to its schema and semantic verifier.
4. Keep compatibility readers for legacy JSON and `key=value` receipts.
5. Migrate scripts incrementally; equivalence tests must precede deletion of
   duplicated helpers.

### Exit criteria

- New scripts do not reimplement foundational file/JSON/receipt safety logic.
- Unknown fields, duplicates, malformed timestamps, unsafe files, and schema
  downgrade attempts fail closed.
- Legacy evidence remains readable and clearly labeled with assurance limits.

## Phase 10.3: Resolve cross-phase contract defects

### Work

1. Unify Phase 5/6 migration metadata and migrate all producers, consumers, and
   fixtures to the canonical schema.
2. Make the immutable bundle consume, enforce, copy, and hash-bind its exact
   policy, migration contract, topology, and environment schema.
3. Replace substring backup receipt acceptance with exact backup qualification
   verification, including freshness, commit/release association, policy hash,
   archive identity, database restore evidence, and inventory identity.
4. Bind rollback compatibility receipts to:
   - exact target bundle and release;
   - exact migration metadata hash;
   - observed database facts hash;
   - evaluated database version;
   - generation/expiry time;
   - current deployment context.
5. Replace Phase 8 recovery booleans with verified receipt references.
6. Add provider capability evidence for TLS, versioning/object lock, server-side
   encryption, credential separation, and retention configuration, or explicitly
   classify unevidenced preferences as advisory.
7. Separate publication qualification from 3-2-1 resilience qualification.

### Exit criteria

- Canonical Phase 1–8 fixtures form one valid evidence chain end to end.
- Wrong-release, wrong-commit, stale, swapped, weakened, and cross-environment
  receipts are rejected at every consumer.
- Policies and implementations cannot silently drift.

## Phase 10.4: Command registry and naming consolidation

### Work

1. Add a machine-readable command registry containing:
   - canonical command and aliases;
   - audience and effect class;
   - current/candidate availability;
   - default plan/dry-run/execute behavior;
   - required confirmation;
   - inputs and receipt type;
   - superseded command and deprecation date where applicable.
2. Choose one grammar. Prefer an operator-facing `release <verb>` interface and
   noun-first advanced commands, while retaining tested compatibility aliases.
3. Collapse `validate:trusted` and `validate:release` into one canonical
   qualification command.
4. Make one preparation orchestrator responsible for environment validation,
   evidence reuse, backup qualification, and readiness. Lower-level readiness
   becomes internal/advanced and must not repeat expensive work without an
   explicit reason recorded in evidence.
5. Present backup verification as assurance profiles/stages rather than two
   similarly named commands.
6. Rename runtime-state aliases around the object and action, for example:
   - `runtime-state:manifest:capture|verify`;
   - `runtime-state:archive:create|verify`;
   - `runtime-state:backup:verify-compatible`;
   - `runtime-state:backup:qualify`.
7. Reserve these recovery terms:
   - `rollback-app`: application only, database preserved;
   - `restore-data`: deliberate database/runtime restore;
   - `restore-disaster`: clean-host recovery;
   - legacy `rollback.sh`: destructive legacy recovery, visibly deprecated.
8. Generate package aliases and command reference checks from the registry where
   practical, without making the registry a production runtime dependency.

### Exit criteria

- Operators can discover every routine command from one help surface.
- Dangerous commands cannot be mistaken for routine commands.
- Compatibility aliases delegate exactly and print deprecation guidance.

## Phase 10.5: Candidate operator wrappers

### Work

Implement three thin, testable candidate commands:

```text
release prepare
release verify-backup       # optional assurance profile
release deploy
```

Also expose:

```text
release rollback-app
release status
release evidence verify
```

Requirements:

1. Wrappers orchestrate helpers; they do not duplicate validation logic.
2. Every wrapper supports `--help` without reading secrets or contacting a host.
3. `prepare`, `verify-backup`, `deploy`, and `rollback-app` default to plan or
   fixture mode while production integration remains disabled.
4. Production execution fails closed with a message that Phase 11 cutover has
   not occurred.
5. The prepare receipt becomes the immutable input index for deploy.
6. Deploy revalidates identities and freshness rather than trusting paths.
7. Success output is concise and includes release identity, evidence index,
   migration classification, health/smoke status, measured downtime, and safe
   rollback-app guidance.
8. Failure output identifies:
   - whether production mutation began;
   - whether user-visible downtime began;
   - whether database mutation occurred;
   - safest next action;
   - evidence/diagnostic receipt path.

### Exit criteria

- Wrappers remain local-only and fixture-validated.
- Existing `prepare-deploy-readiness.sh` and `deploy-production.sh` behavior is
  unchanged.
- Phase 11 can later promote wrappers through an explicit flag/config change.

## Phase 10.6: Evidence index and observability

### Work

1. Create one immutable aggregate release evidence index referencing component
   receipts by type, path/object identity, SHA-256, release, commit, scope, and
   freshness—not copying or weakening their contents.
2. Add `release evidence verify` to recursively verify the full chain.
3. Add receipt discovery by release ID and command stage.
4. Define retention and confidentiality for each evidence class.
5. Normalize phase timing, downtime, backup size/duration, restore duration,
   rollback duration, and failure category fields.
6. Build a local summary command that reports trends without secrets or PII.
7. Define alerts for:
   - stale/missing qualified backups;
   - failed or overdue restore drills;
   - stale trusted receipts;
   - repeated preparation/deployment failure;
   - downtime/RTO/RPO threshold violations;
   - missing remote verification or resilience evidence;
   - health and maintenance blockers.
8. Keep alert transport/provider configuration outside Phase 10 production
   adoption; validate emitted alert events with local sinks.

### Exit criteria

- One command proves or rejects the complete fixture release evidence chain.
- Metrics distinguish production observations, fixture rehearsals, and policy
  limits.
- Failed operations are observable and do not disappear for lack of a receipt.

## Phase 10.7: Documentation information architecture

### Work

1. Add an authority banner to every deployment-related document:
   current runbook, candidate design, reference, historical plan, or archive.
2. Reserve phase numbering for the master plan. Mark older action/operations
   plans as superseded historical implementation records.
3. Split `deployment-surface-inventory.md` into:
   - stable command/ownership catalog;
   - generated capability and evidence matrix;
   - archived implementation journal.
4. Create one operator hub with four lanes:
   - current supported routine release;
   - candidate local/rehearsal workflow;
   - advanced recovery and destructive restore;
   - separately authorized maintenance and disaster recovery.
   Make `docs/README.md` that role-based hub and update the root README to point
   to it. Replace hard-coded “last updated” prose with source-controlled contract
   versions or generated capability status where freshness matters.
5. Keep `release-runbook.md` as the only live-window procedure and describe only
   the current supported path until Phase 11.
6. Move chronological “recent improvements” material out of `DEPLOYMENT.md` and
   make it an architecture/reference document.
7. Add a recovery decision matrix showing command availability, affected state,
   data-loss boundary, expected RTO, required authority, and receipt.
8. Replace vague checklist wording with exact validation commands, expected
   success fields, evidence paths, stop conditions, and escalation owner.
9. Replace `deployment-slo.md` with precise SLI definitions and remove ambiguous
   paths such as `${PROJECT_DIR}/../var/tmp/...`.
10. Generate the command and receipt reference from registries/schemas; keep
    judgment-heavy procedures hand-written.

### Exit criteria

- There is exactly one authoritative current production procedure.
- Current and candidate commands are visually and semantically distinct.
- All links, command names, receipt names, and safety labels pass drift tests.

## Phase 10.8: Validation and failure-injection matrix

### Contract tests

- canonical migration metadata passes every Phase 5/6 consumer;
- every schema rejects unknown fields, duplicates, unsafe paths, wrong scopes,
  wrong commits/releases, stale evidence, and malformed times;
- every policy used by an implementation is hash-bound into its receipt;
- cross-phase evidence swapping is rejected;
- legacy receipt readers preserve explicit assurance limitations;
- command aliases delegate exactly and do not change effect class;
- every `--help` path is side-effect free.

### Workflow tests

- full fixture prepare → optional verification → deploy → evidence verification;
- no-migration and backward-compatible migration releases;
- bounded-window valid and expired releases;
- incompatible migration with special-plan stop;
- backup captured but not restore-verified;
- remotely published but not resilience-qualified;
- stale health/backup/trusted evidence;
- pre-mutation failure with zero downtime;
- post-activation failure with compatible app rollback;
- post-activation failure where rollback is forbidden;
- protected database/Redis identity and write-sentinel preservation;
- maintenance plan with swapped or stale prerequisite evidence;
- interruption at every receipt publication and state transition.

### Usability tests

Run scripted tabletop exercises with someone not involved in implementation:

1. Find the current routine release command in under two minutes.
2. Explain whether candidate commands can touch production.
3. Diagnose a stale backup before mutation.
4. Choose app rollback rather than destructive database restore.
5. Respond to an incompatible migration failure.
6. Find the complete evidence chain for a release.
7. Identify whether observed downtime exceeded the correct SLO.

Record time, wrong turns, ambiguous wording, and unsafe command selections.

### Regression tests

- existing production deployment-order contracts remain unchanged;
- current deploy and destructive recovery scripts are not invoked in fixtures;
- repository secret/redaction tests pass;
- owner-only receipt and extracted-data permissions pass;
- aggregate script suite terminates reliably;
- clean checkout runs the trusted gate twice without hidden state.

## Phase 10.9: Reviewable cleanup and compatibility migration

### Commit sequence

Prepare reviewable commits in this order:

1. audit inventory and characterization tests;
2. vocabulary/topology/SLO contracts;
3. shared safe-I/O and receipt schemas;
4. Phase 5/6 metadata reconciliation;
5. strict cross-phase evidence binding;
6. command registry and compatibility aliases;
7. candidate wrappers and evidence index;
8. documentation restructuring;
9. observability summaries and local alert sinks;
10. qualification/failure-injection tests.

Do not mix behavior-preserving helper extraction with contract changes in the
same commit. Delete duplicated helpers and deprecated aliases only after
equivalence tests and a documented compatibility window.

### Exit criteria

- The working tree is organized into reviewable commits.
- Each commit passes its focused regression set.
- A clean checkout passes the complete trusted gate twice.

## Phase 10.10: Phase qualification

Produce an owner-only Phase 10 qualification receipt containing:

- exact commit and trusted-gate receipt;
- command registry and schema hashes;
- documentation authority map hash;
- complete fixture evidence-index hash;
- test and failure-injection results;
- usability exercise results;
- measured fixture downtime and rollback RTO distributions;
- skipped production observations with reason;
- explicit statement that production integration remains disabled;
- remaining Phase 9 and Phase 11 dependencies.

Phase 10 is merge-ready only when the receipt verifies from a clean checkout.
It is not production-eligible until Phase 11 separately approves shadow use and
cutover.

## Required artifacts

The implementation should produce, with final names chosen during Phase 10.1:

- operational vocabulary contract;
- topology contract;
- command registry;
- receipt-type registry and JSON schemas;
- evidence traceability matrix;
- shared safe-I/O/receipt library;
- legacy receipt compatibility readers;
- canonical release evidence index and verifier;
- candidate release CLI/wrappers;
- generated command and evidence reference;
- authoritative operator hub and rewritten short runbook;
- precise SLI/SLO reference;
- local-only alert event schema and sink fixture;
- Phase 10 qualification receipt.

## Explicit non-goals

Phase 10 does not:

- contact or change production;
- enable real provider credentials or production adapters;
- replace the current production wrapper;
- remove the current deployment or recovery path;
- implement Phase 9 disaster recovery;
- perform Phase 11 shadow adoption or cutover;
- claim zero downtime;
- turn a fixture rehearsal into production evidence;
- treat one remote publication as proof of 3-2-1 resilience.

## Recommended first implementation slice

Start with the smallest slice that removes real ambiguity without adding a new
wrapper:

1. add the traceability inventory and terminology/topology contracts;
2. add characterization tests for all current Phase 1–8 receipt consumers;
3. reconcile the Phase 5/6 migration metadata schema;
4. replace the controlled-migration backup substring check with an exact
   canonical verifier;
5. bind reduced-downtime rollback evidence to its exact release context;
6. run focused Phase 5–8 and existing deployment-order tests;
7. only then begin the command registry and operator-facing wrappers.

This ordering makes Phase 10 cleanup a prerequisite for usability rather than
placing a polished interface over inconsistent evidence contracts.
