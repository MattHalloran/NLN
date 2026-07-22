# Phase 10 Qualification, Pull Request, and Git Closeout Plan

> Authority: implementation and validation plan. This document does not authorize
> production access, deployment, backup, restore, maintenance, cleanup, or any other
> production mutation. The production runbook remains authoritative for approved
> production operations.

## 1. Purpose

This plan closes the gap between the locally implemented deployment-reliability
system and a reviewable, independently qualified change on the repository's main
line. It covers:

- investigation and resolution of the pull request's CodeQL findings;
- exact-commit machine validation and evidence preservation;
- genuinely independent Phase 10 usability validation;
- final Phase 10 qualification;
- pull request scope, review, and merge readiness;
- safe reconciliation of local branches after merge;
- deliberate removal of temporary validation worktrees and stale evidence; and
- clean handoff to the deferred Phase 9 and Phase 11 programs.

The plan exists because these activities are coupled. A security fix changes the
commit being qualified; changing the commit invalidates old CI, clean-checkout, and
usability evidence; deleting a worktree can invalidate an evidence path; and merging
before qualification would remove the independent review boundary.

## 2. Desired outcome

At completion:

1. every CodeQL alert associated with the pull request is fixed or dismissed with
   reviewable evidence that it is not exploitable;
2. the final pull request commit has two successful, independently generated trusted
   CI receipts and two successful clean-checkout trusted validations;
3. a person who did not implement Phase 10 has completed all required usability
   exercises against that exact final commit;
4. the Phase 10 qualification tool has produced and verified one owner-only,
   hash-bound final receipt;
5. the pull request accurately describes its scope, risks, evidence, production
   boundary, and remaining dependencies;
6. required review and repository checks pass before merge;
7. local `master` is reconciled with the merged remote history without destructive
   loss of unique commits;
8. temporary worktrees and superseded local evidence are removed only after their
   retention purpose has ended; and
9. Phase 9 and Phase 11 begin later on separate branches and pull requests.

## 3. Non-negotiable safety boundaries

### 3.1 Production remains out of scope

Throughout this plan, do not:

- read `.env-prod` values or print production environment values;
- connect through SSH, HTTP, DNS, a Docker context, or a provider API to production;
- run `deploy-production.sh`, `backup.sh`, a production restore, production smoke,
  VPS maintenance, cleanup, update, restart, prune, or deletion commands;
- provision an SSH key or alter a server;
- enable `productionIntegrationEnabled` or connect fixture adapters to a real
  provider; or
- modify the existing production deployment entry points or their ordering.

All validation must use tracked fixtures, generated credentials, stubbed adapters,
or disposable local containers that cannot reach production.

### 3.2 Git safety

- Do not use `git reset --hard`, force-push, delete a branch, or remove a worktree
  merely to make the repository look tidy.
- Treat untracked or modified files as user-owned until proven otherwise.
- Never rewrite published pull request history unless the repository owner explicitly
  approves it.
- Preserve the four local-only `master` commits until their ancestry and eventual
  merged location have been verified.
- Do not remove evidence-bearing worktrees until the final qualification receipt is
  complete and its evidence-retention decision is recorded.

### 3.3 Evidence safety

- Evidence directories must be `0700`; evidence and usability files must be `0600`.
- Reject symlinks, non-regular files, unsafe paths, ambiguous commits, overwritten
  receipts, malformed timestamps, stale receipts, and mismatched hashes.
- Do not commit `.validation`, usability participant identity, secrets, raw logs that
  may contain credentials, or copied production data.
- A new commit makes all prior commit-bound qualification evidence provisional. Do
  not relabel old evidence as evidence for a new commit.

## 4. Current-state baseline

This section is a dated snapshot, not a permanent assertion. The execution agent
must refresh it before acting.

Snapshot date: 2026-07-16.

- Active branch: `validation-hardening-browser-gates`.
- Snapshot commit: `56adb3e94414372a296327c025fce2f7dcc8ca91`.
- The active branch is synchronized with its origin branch and the main checkout is
  clean.
- Draft PR #34 targets `master` and is technically mergeable, but is blocked by
  required review and the CodeQL security gate.
- PR #34 is large: 366 changed files, approximately 35,407 additions and 3,413
  deletions. Its current title understates its deployment-reliability scope.
- `origin/master` is an ancestor of the active branch. Local `master` is four commits
  ahead of `origin/master`; those commits are also ancestors of the active branch.
- `dev` is older and is not the correct integration base for this work.
- Two detached clean-validation worktrees remain:
  - `/root/nln-phase10-clean-1-56adb3e`
  - `/root/nln-phase10-clean-2-56adb3e`
- Each retained worktree is clean, contains a successful trusted-validation receipt,
  and occupies approximately 1.4 GB.
- `.validation/phase10/clean-checkout-56adb3e.json` binds those two receipts by path
  and SHA-256.
- `.validation/phase10/completion-audit.json` is stale and must not be used as final
  evidence: it describes commit `fa088817...` and older test counts.
- No independent usability result or final Phase 10 qualification receipt exists.
- The normal CI, integration, E2E, deploy-rehearsal, trusted-gate, CodeQL analysis,
  and GitGuardian jobs succeeded for the snapshot commit. GitHub's separate CodeQL
  PR gate reports 12 alerts: six critical and six high.

Before implementation, capture the refreshed equivalent of:

```bash
git status --short --branch
git branch -vv
git worktree list --porcelain
git log --oneline --decorate -12
gh pr view 34 --json state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup
```

Stop if the active branch, PR head, PR base, worktree commit, or ownership assumptions
no longer match. Investigate rather than automatically rewriting state.

## 5. Phase A: Freeze and inventory the closeout inputs

### Goal

Make the closeout reproducible and prevent evidence from different commits from
being mixed.

### Actions

1. Record the full active commit, remote tracking commit, merge base with
   `origin/master`, working-tree status, PR head SHA, and PR base SHA.
2. Confirm that the PR head equals the checked-out commit.
3. Inventory all files currently under `.validation/phase10` by path, mode, size,
   timestamp, receipt type, embedded commit, and SHA-256.
4. Classify each item as:
   - current candidate evidence;
   - superseded evidence retained for diagnostics;
   - stale evidence that cannot qualify the final commit; or
   - unknown evidence requiring inspection.
5. Verify both retained worktrees are detached, clean, at the expected exact commit,
   and contain the receipts referenced by the clean-checkout receipt.
6. Record worktree disk usage and ensure sufficient space exists for one final pair
   of validations if CodeQL fixes change the commit.
7. Confirm `.validation`, backup directories, participant results, and validation
   worktrees are not tracked or staged.
8. Run the repository safety audit and `git diff --check` before any implementation.

### Validation

- No evidence file is assigned to a commit based only on its filename.
- Embedded commit, path, and hash agree where the receipt schema requires them.
- All sensitive evidence modes are owner-only.
- The production deployment-order contract still passes unchanged.

### Exit criteria

- There is one written current-candidate SHA.
- Every retained worktree and evidence file has a stated purpose.
- Stale completion evidence is clearly quarantined from final qualification inputs.

## 6. Phase B: Triage and resolve every CodeQL alert

### Goal

Eliminate the security merge blocker without weakening security gates or dismissing
findings merely because they occur in test or fixture code.

### B1. Build the alert ledger

Use GitHub's current check annotations and code-scanning records to create a local,
non-secret review ledger. For every alert record:

- stable GitHub alert/check identifier;
- query name and severity;
- file and line;
- source, sink, and data flow reported by CodeQL;
- whether the file ships in a production artifact;
- whether the path is reachable in production, local validation, or only a fixture;
- exploit preconditions and maximum impact;
- proposed fix or proposed false-positive rationale;
- focused regression test;
- resolution status and reviewer decision.

At the snapshot commit, explicitly investigate these categories:

1. Missing rate limiting in `packages/server/src/app.ts`.
2. Missing rate limiting findings in server tests. Determine whether CodeQL is
   analyzing synthetic Express handlers as real application routes; do not assume
   that this makes the finding harmless.
3. Query/body parameter type confusion in
   `packages/server/src/middleware/rateLimiter.ts` and
   `packages/server/src/rest/images.ts`.
4. Polynomial regular expression behavior in
   `packages/server/src/rest/newsletter.ts`.
5. Possible SSRF in `packages/ui/scripts/serve-production.js`.
6. Clear-text environment logging in the migration adapter fixture.
7. Possible password logging in the disposable database restore verifier.

Refresh the list first; alert counts and locations can change.

### B2. Resolution rules

For genuine or uncertain findings:

- prefer a small input-normalization, allow-list, bounded-parser, non-backtracking,
  redaction, or middleware-order fix;
- fail closed on ambiguous arrays/objects where a scalar is required;
- restrict proxy/serve targets to explicit fixture-safe origins and protocols;
- avoid placing secrets in child-process arguments, logs, errors, or receipts;
- apply rate limiting before expensive authorization, database, file, upload, or
  parsing work when the route threat model requires it; and
- add unit/integration/Bats coverage for both valid and adversarial inputs.

For a proposed false positive:

1. demonstrate the complete data flow and why it cannot reach a dangerous sink;
2. demonstrate whether the file is excluded from production artifacts;
3. add a regression assertion where practical so the safety assumption is encoded;
4. document the CodeQL query, reason, and evidence in the PR; and
5. require independent reviewer agreement before dismissing the alert in GitHub.

Do not suppress a query repository-wide, reduce required severities, remove CodeQL
from branch protection, or mark a finding dismissed without evidence.

### B3. Validation after each fix group

Run the smallest relevant tests first, followed by:

```bash
yarn validate:quick
git diff --check
```

Also verify:

- no production deployment-order contract changed;
- repository secret scanning passes;
- logs from negative tests do not expose fixture credentials or sentinel secrets;
- generated policy/traceability hashes are intentionally updated if a frozen script
  changes; and
- CodeQL is rerun on the pushed exact commit.

### Exit criteria

- Every alert in the refreshed ledger has a reviewed disposition.
- The CodeQL PR gate succeeds.
- No gate was weakened to obtain success.
- The branch is clean, committed in reviewable security-focused commits, and pushed.

## 7. Phase C: Establish the final candidate commit

### Goal

Freeze one exact commit for all remaining qualification and review evidence.

### Actions

1. Finish CodeQL fixes and any review-requested changes first.
2. Run local focused validation and the repository safety audit.
3. Commit with intentional messages that identify the alert category and validation.
4. Push normally without force.
5. Record the resulting full lowercase SHA as `FINAL_CANDIDATE_SHA`.
6. Verify PR #34's head SHA equals `FINAL_CANDIDATE_SHA`.
7. Treat every older clean-checkout, CI, usability, completion-audit, and final
   qualification receipt as superseded for qualification purposes.
8. Do not accept further code changes casually. Any code, workflow, policy, fixture,
   generated reference, or test change after this point creates a new candidate and
   restarts Phases C through F.

### Exit criteria

- One clean, pushed, exact commit is designated as the final candidate.
- CodeQL and all inexpensive required checks pass for it.
- No evidence from another commit is scheduled as a final input.

## 8. Phase D: Regenerate exact-commit machine evidence

### Goal

Prove the final candidate twice in clean local checkouts and twice through the
trusted CI gate.

### D1. Clean-checkout validations

1. Create two new detached worktrees from `FINAL_CANDIDATE_SHA` with unique paths.
2. Do not copy `node_modules`, `.env`, `.env-prod`, `.validation`, caches, build
   outputs, or ignored files from the main checkout.
3. In each worktree, independently install dependencies according to the repository's
   locked, clean-checkout procedure.
4. Run the complete trusted validation command, not a reduced substitute.
5. Preserve each owner-only validation receipt.
6. Confirm each worktree is still clean after validation, apart from ignored
   generated evidence.
7. Hash both receipts and generate a new clean-checkout qualification receipt for
   exactly `FINAL_CANDIDATE_SHA`.
8. Run the clean-checkout receipt verifier and negative tests for wrong commit,
   wrong hash, missing receipt, duplicate receipt, and dirty checkout if the tooling
   changed.

Do not remove the previous worktrees until the new receipt is verified. Once the new
pair becomes authoritative, mark the previous pair superseded but retain it through
final qualification in case diagnostic comparison is needed.

### D2. Trusted CI validations

1. Require the push CI and pull-request CI runs for the exact final candidate to
   complete.
2. Confirm every trusted checkout used the PR source SHA rather than GitHub's
   synthetic merge SHA.
3. Download both aggregate trusted-gate receipts into an owner-only directory.
4. Verify both using `scripts/verify-trusted-gate-receipt.mjs` with:
   - the exact final candidate commit;
   - the checked-in trusted validation manifest;
   - correct workflow run and attempt identities;
   - acceptable timestamps;
   - complete required-job evidence; and
   - valid artifact sizes and SHA-256 hashes.
5. Reject cancelled, skipped, stale, future-dated, wrong-run, wrong-attempt,
   wrong-manifest, merge-SHA, duplicate-job, or incomplete evidence.

### D3. Full result record

Produce an owner-only test-results input that records, at minimum:

- final candidate commit;
- command names and versions;
- start and finish timestamps;
- test counts by suite;
- clean-checkout results;
- CI run identifiers and receipt hashes;
- CodeQL/GitGuardian conclusions;
- known non-blocking warnings; and
- confirmation that no production action occurred.

Do not hand-edit a success result around a failed command. Regenerate it through the
intended evidence producer or rerun the failed gate.

### Exit criteria

- Two clean-checkout trusted validations pass for the exact final candidate.
- Two distinct trusted CI aggregate receipts verify for that same commit and manifest.
- All evidence is owner-only, hash-bound, non-overwritten, and discoverable.

## 9. Phase E: Conduct independent usability validation

### Goal

Demonstrate that an operator who did not implement Phase 10 can understand the
release system, choose safe actions, and find evidence without unsafe prompting.

### Independence rule

The implementation agent cannot serve as the participant, answer exercises on the
participant's behalf, invent observations, or convert an informal conversation into
independent evidence. The participant must not have implemented Phase 10.

The implementation agent may prepare the isolated fixture, provide the written task
brief, observe silently, record timing and navigation with consent, and clarify the
meaning of the exercise only after an ambiguity has been recorded.

### Exercise environment

1. Use a clean checkout of `FINAL_CANDIDATE_SHA` or a read-only copy of its tracked
   documentation and fixture-only interface.
2. Ensure there is no `.env-prod`, SSH key, production hostname, provider credential,
   real backup, or production network route in the exercise environment.
3. Use fixture receipts representing success, stale backup, incompatible migration,
   app rollback eligibility, and downtime/SLO lookup scenarios.
4. Give the participant the operator entry documentation, not implementation notes or
   answer keys.
5. Copy `docs/phase10-usability-exercise-template.json` to an ignored owner-only
   result path. Never edit the committed template with participant data.

### Required exercises

The participant must complete all policy-required exercises:

1. find the current release;
2. explain why a fixture candidate cannot affect production;
3. diagnose a stale backup;
4. choose app rollback rather than database restore for an application-only failure;
5. respond safely to an incompatible migration;
6. find the release evidence chain; and
7. identify the downtime SLO.

For every exercise record:

- status;
- duration in seconds;
- wrong turns;
- ambiguous wording encountered;
- unsafe selections considered or made; and
- concise observer notes in a separate non-secret record if needed.

Set `independentParticipant: true` only when the independence rule is genuinely met.
Set overall `status: success` only when all exercises succeed without an unresolved
unsafe action. Preserve failures honestly.

### Remediation loop

If the exercise reveals confusing or unsafe behavior:

1. classify it as documentation, vocabulary, command UX, evidence discovery, or
   safety-guard failure;
2. implement the smallest corrective change locally;
3. add a regression test when behavior changed;
4. create a new final candidate commit;
5. repeat Phases C and D because the commit changed; and
6. repeat only the affected usability exercises plus any exercise whose answer path
   changed, while preserving the failed evidence as diagnostic history.

### Exit criteria

- A genuinely independent participant completed every required exercise against the
  final candidate.
- The owner-only usability results validate against the checked-in qualification
  policy.
- No unresolved unsafe selection or material ambiguity remains.

## 10. Phase F: Generate and verify final Phase 10 qualification

### Goal

Bind machine, CI, clean-checkout, evidence-discovery, test, and usability proof into
one final receipt.

### Required inputs

Prepare exact, owner-only paths for:

- `FINAL_CANDIDATE_SHA`;
- `config/trusted-validation-manifest.json`;
- trusted push CI aggregate receipt;
- trusted PR CI aggregate receipt;
- final clean-checkout qualification receipt;
- final recursive evidence index;
- final test-results receipt; and
- independent usability-results JSON.

The test-results input uses `phase10-test-results` schema version 2. It strictly
binds the candidate commit, commands and tool versions, validation timestamps,
per-suite counts, both clean-checkout receipt hashes, the distinct push and pull
request CI run identities and receipt hashes, CodeQL and GitGuardian conclusions,
accepted non-blocking warnings, failure-injection outcomes, optional fixture timing
measurements, and an explicit confirmation that production was neither accessed nor
changed. Create or verify it with `yarn qualify:phase10-test-results`. Legacy
unversioned summaries remain diagnostic history only and are deliberately rejected
by final qualification; silently interpreting them would allow evidence from a
different candidate to be relabelled.

Regenerate the evidence index after all inputs exist. Do not use the stale
`completion-audit.json` as a substitute for any required input.

### Qualification command shape

Use the checked-in command's current help, with owner-only output, equivalent to:

```bash
node scripts/phase10-qualification.mjs \
  --commit "${FINAL_CANDIDATE_SHA}" \
  --trusted-manifest config/trusted-validation-manifest.json \
  --trusted-gate-one <PUSH_TRUSTED_GATE_JSON> \
  --trusted-gate-two <PR_TRUSTED_GATE_JSON> \
  --clean-checkout <CLEAN_CHECKOUT_JSON> \
  --evidence-index <EVIDENCE_INDEX_JSON> \
  --test-results <TEST_RESULTS_JSON> \
  --usability-results <USABILITY_RESULTS_JSON> \
  --output <PHASE10_QUALIFICATION_JSON>
```

Before running it, verify the current CLI contract and tests; do not assume this
example overrides checked-in code.

### Verification

1. Confirm output mode `0600` and parent mode `0700`.
2. Confirm the receipt binds the exact commit, policy ID/hash, manifest ID/hash, all
   evidence hashes, and required run counts.
3. Confirm it records production integration as disabled and names Phase 9 and Phase
   11 as remaining dependencies.
4. Run the semantic receipt verifier and the Phase 10 qualification Bats tests.
5. Run negative verification using copies with wrong commit, wrong manifest, stale
   trusted gate, duplicate CI run, failed usability exercise, altered evidence hash,
   and symlinked input.
6. Regenerate the completion audit for the final candidate so it points to the final
   qualification receipt and current test counts.
7. Run the repository safety audit to prove no evidence or participant data is staged.

### Exit criteria

- One final Phase 10 qualification receipt verifies for the exact PR head.
- The completion audit is current and no longer reports missing Phase 10 evidence.
- Phase 9 and Phase 11 remain explicitly deferred rather than accidentally claimed
  complete.

## 11. Phase G: Make PR #34 reviewable and merge-ready

### Goal

Give reviewers an accurate map of a large, safety-sensitive change without hiding its
size or asking them to infer the trust boundary.

### PR metadata

1. Keep PR #34 as the sole integration PR for the existing branch unless a reviewer
   explicitly requires a split.
2. Rename it so it describes deployment reliability, release qualification, local
   production validation, rollback/rehearsal safety, and Phase 10 consolidation—not
   only browser gates.
3. Rewrite the description with:
   - purpose and end-user outcome;
   - phase-by-phase scope;
   - architecture and command-surface summary;
   - explicit statement that production was not accessed or changed;
   - existing production entry points that remain unchanged;
   - security alert dispositions;
   - exact final candidate SHA;
   - local, clean-checkout, CI, CodeQL, and usability validation summary;
   - links or hashes for non-secret qualification evidence;
   - known limitations and non-blocking warnings;
   - deferred Phase 9 and Phase 11 work; and
   - reviewer guide organized by concern rather than chronological commit count.
4. Add a concise file-area review map: policies/contracts, shared safety helpers,
   backup/restore verification, release/migration/rollback logic, operator interface,
   workflows, tests/fixtures, and documentation.

### Review strategy

- Do not split or rewrite the 75-commit published history solely for aesthetics.
- If reviewability is inadequate, prefer a documented review order, commit grouping,
  and generated diff statistics.
- If a split becomes necessary, design a dependency-safe stacked-PR plan first and
  obtain explicit approval before moving commits or force-pushing.
- Request at least one independent human review after CodeQL and qualification pass.
- Resolve review threads with code and evidence; do not dismiss substantive safety
  questions as documentation-only.
- Any review change restarts exact-commit evidence from Phase C.

### Merge gates

Do not mark the PR ready or merge until:

- working tree and remote branch are synchronized;
- CodeQL and every required check pass;
- final Phase 10 qualification verifies against the PR head;
- required independent review is approved;
- no unresolved review thread remains;
- the PR remains based on the intended `master` branch; and
- the repository owner chooses the allowed merge method.

Do not bypass branch protection, merge as administrator around a failed gate, or
silently retarget the PR to stale `dev`.

## 12. Phase H: Post-merge branch and worktree reconciliation

### Goal

Return the local repository to a simple, explainable state without losing unique
history or qualification evidence.

### H1. Verify the merge before cleanup

1. Fetch `origin` without pruning first.
2. Confirm PR #34 is merged, not merely closed.
3. Record the PR merge commit or squash commit and final head SHA.
4. Confirm `origin/master` contains the semantic changes and, where applicable, the
   exact commits expected for the chosen merge method.
5. Confirm the final qualification receipt still identifies the reviewed PR head. A
   merge commit need not masquerade as the qualified head; record their relationship.
6. Verify the four local-only `master` commits are represented in merged history or
   otherwise safely reachable before altering local `master`.

### H2. Reconcile local `master`

1. Ensure the feature checkout is clean.
2. Switch the main checkout to `master` only after worktree branch ownership permits
   it.
3. Prefer a fast-forward update when history allows it.
4. If local `master` cannot fast-forward because of its four unique commits, stop and
   compare patch IDs and ancestry. Do not reset automatically.
5. If those commits are already represented by a squash or rebase, create a temporary
   archival ref before any approved reconciliation.
6. Verify final `master` equals or cleanly contains `origin/master` and has no
   uncommitted changes.

### H3. Preserve or remove evidence

Before removing worktrees, decide whether final qualification is self-contained:

- If it verifies content hashes without requiring the original absolute paths,
  preserve the final qualification receipt and required input receipts in one
  owner-only ignored evidence directory.
- If it still requires the worktree receipt paths, either retain the worktrees for the
  documented retention period or implement and validate a no-overwrite evidence
  export/relocation mechanism before removal.

Then:

1. hash and inventory the evidence selected for retention;
2. distinguish final evidence from diagnostic/superseded evidence;
3. remove only clean detached worktrees whose evidence is no longer required;
4. use `git worktree remove <PATH>` rather than deleting directories manually;
5. run `git worktree prune --dry-run` or inspect equivalent state before pruning;
6. confirm no active worktree registration or unique commit was lost; and
7. measure recovered disk space.

### H4. Remove merged branch references

Only after merge and verification:

- delete the local feature branch if no worktree uses it and no unique commit would be
  lost;
- delete the remote feature branch only if repository policy and the owner permit it;
- retain PR and qualification links in the appropriate non-secret project record;
- do not delete `archive/online-ordering` or unrelated Dependabot branches/PRs; and
- do not mix dependency-upgrade decisions into this closeout.

### Exit criteria

- The primary checkout is on synchronized `master`.
- No obsolete Phase 10 worktree remains registered.
- Final qualification evidence remains verifiable for its retention period.
- Superseded diagnostic evidence is either intentionally retained with labels or
  safely removed.
- There is no unexplained local-ahead branch state.

## 13. Phase I: Deferred-program handoff

### Phase 9

Start disaster recovery, full restore, and data-salvage qualification on a new branch
from the then-current `origin/master`. Create a separate draft PR. Phase 9 must consume
the now-canonical contracts and evidence system; it must not reopen Phase 10 command
vocabulary or silently connect restore tooling to production.

The Phase 9 plan should cover at least:

- clean-host disaster restore rehearsal;
- application and database recovery sequencing;
- independently stored release and encrypted backup artifacts;
- RPO/RTO measurement;
- partial/corrupt backup salvage;
- lost-secret and lost-provider scenarios;
- DNS/TLS/external dependency recovery assumptions; and
- periodic restore evidence and expiry.

### Phase 11

Begin shadow adoption and production cutover only after Phase 9 is qualified and only
with separately approved production authority. Use a new branch and PR. Phase 11 must
move through local-only, CI rehearsal, read-only observation, approved backup
qualification, canary evidence use, explicit deployment cutover, and stabilization.

Do not bundle Phase 9 or Phase 11 implementation into PR #34. Their risk, authorization,
reviewers, and evidence are different.

## 14. Cross-phase validation matrix

| Concern              | Required proof                                                | Failure response                               |
| -------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Git state            | Clean checkout, exact local/remote/PR SHA agreement           | Stop; reconcile without destructive commands   |
| Production isolation | Stub/fixture-only tests; unchanged deployment-order contracts | Stop immediately; remove production dependency |
| CodeQL               | All alerts fixed or independently justified; gate succeeds    | Keep PR draft and blocked                      |
| Secret safety        | Repository audit; redaction tests; owner-only evidence        | Quarantine output and fix before continuing    |
| Trusted CI           | Two distinct aggregate receipts for exact source SHA          | Reject qualification                           |
| Clean checkout       | Two full trusted runs from fresh detached worktrees           | Reject qualification                           |
| Usability            | Independent participant completes every policy exercise       | Remediate and repeat affected validation       |
| Qualification        | Final semantic receipt verification and negative tests        | Do not request merge                           |
| Review               | Required approval and no unresolved threads                   | Do not merge                                   |
| Worktree cleanup     | Evidence self-contained or retained; worktrees clean          | Retain worktrees                               |
| Branch cleanup       | Merge verified; no unique commits lost                        | Preserve refs and investigate                  |
| Deferred phases      | Separate branches, PRs, authority, and evidence               | Keep out of PR #34                             |

## 15. Stop conditions and escalation

Stop the current step and report before continuing if:

- the PR head differs from the checked-out or qualified commit;
- a supposedly clean worktree is modified;
- a CodeQL finding could expose production secrets or enable unauthenticated access;
- a test attempts production connectivity or reads `.env-prod`;
- evidence permissions are broader than required or a receipt is a symlink;
- a receipt cannot be verified without altering it;
- independent usability cannot be obtained;
- local `master` contains commits not represented in the merged result;
- branch protection would need to be bypassed;
- the merge method would invalidate an unstated assumption; or
- worktree removal would break final evidence verification.

These are not reasons to guess or weaken a gate. Preserve state, explain the exact
blocker, and request the missing human decision or authority.

## 16. Final completion checklist

- [ ] Current branch, remote, PR head, and final candidate SHA agree.
- [ ] Main and validation worktrees are clean.
- [ ] Every CodeQL alert has a reviewed disposition.
- [ ] CodeQL and all required GitHub checks pass.
- [ ] Repository safety audit passes without printing secrets.
- [ ] Production deployment-order contracts pass unchanged.
- [ ] Two exact-commit clean-checkout trusted validations pass.
- [ ] Two distinct exact-commit trusted CI receipts verify.
- [ ] Test-results and evidence-index receipts are current and owner-only.
- [ ] Independent usability results cover every required exercise.
- [ ] Final Phase 10 qualification receipt verifies.
- [ ] Completion audit is regenerated for the final candidate.
- [ ] PR #34 accurately describes its full scope and remaining limitations.
- [ ] Required independent review is approved.
- [ ] PR #34 is merged without bypassing protection.
- [ ] Local `master` is reconciled without losing unique commits.
- [ ] Worktrees are removed only after evidence retention is safe.
- [ ] The feature branch is cleaned up only after merge verification.
- [ ] Phase 9 and Phase 11 remain separate, explicitly deferred programs.
- [ ] No production access or mutation occurred during this plan.

## 17. Recommended execution order

Execute in this order because later evidence is commit-bound:

1. refresh and freeze the repository/PR/evidence baseline;
2. investigate and resolve CodeQL alerts;
3. freeze the final candidate commit;
4. regenerate two clean-checkout and two trusted-CI evidence sets;
5. conduct independent usability validation;
6. generate and verify final Phase 10 qualification;
7. update PR metadata and request review;
8. address review changes, repeating qualification when the commit changes;
9. merge only after every gate passes;
10. reconcile `master`, evidence, worktrees, and feature branches; and
11. begin Phase 9 later, followed by Phase 11, on separate reviewed branches.
