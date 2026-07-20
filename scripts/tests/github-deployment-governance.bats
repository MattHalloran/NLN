#!/usr/bin/env bats

setup() {
  WORK="$BATS_TEST_TMPDIR/github-governance-$BATS_TEST_NUMBER"
  RECEIPTS="$WORK/receipts"
  RESULT="$WORK/audit.json"
  COMMIT=0123456789abcdef0123456789abcdef01234567
  NOW=1800000000
  mkdir -p "$RECEIPTS"
  node - "$RECEIPTS" "$COMMIT" "$NOW" <<'EOF'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),[dir,commit,now]=process.argv.slice(2),text=fs.readFileSync('config/trusted-validation-manifest.json','utf8'),manifest=JSON.parse(text),jobs=manifest.requiredJobs.map(j=>({job:j.id,receiptSha256:'a'.repeat(64),artifacts:j.requiredArtifacts.map(p=>({path:p,bytes:1,sha256:'b'.repeat(64)}))}));for(const [event,id] of [['push','101'],['pull-request','202']])fs.writeFileSync(path.join(dir,`${event}.json`),JSON.stringify({schemaVersion:1,receiptType:'trusted-validation-gate',status:'success',commit,manifestId:manifest.manifestId,manifestSha256:crypto.createHash('sha256').update(text).digest('hex'),generatedAt:new Date(Number(now)*1000).toISOString(),run:{id,attempt:'1',repository:'fixture/nln',workflow:'CI'},jobs}),{mode:0o600});
EOF
  cat >"$WORK/protection.json" <<'EOF'
{"required_status_checks":{"strict":true,"contexts":["Trusted Gate"],"checks":[{"context":"Trusted Gate","app_id":15368}]},"required_pull_request_reviews":{"required_approving_review_count":1},"allow_force_pushes":{"enabled":false},"allow_deletions":{"enabled":false}}
EOF
  cat >"$WORK/checks.json" <<'EOF'
{"check_runs":[{"name":"Trusted Gate","conclusion":"success"},{"name":"CodeQL","conclusion":"success"}]}
EOF
  cat >"$WORK/gh-stub.sh" <<'EOF'
#!/bin/sh
case "$2" in
  */protection) cat "$GOV_PROTECTION" ;;
  */check-runs) cat "$GOV_CHECKS" ;;
  *) exit 2 ;;
esac
EOF
  chmod 755 "$WORK/gh-stub.sh"
  chmod 600 "$WORK/protection.json" "$WORK/checks.json"
}

audit() {
  GOV_PROTECTION="$WORK/protection.json" GOV_CHECKS="$WORK/checks.json" \
    node scripts/audit-github-deployment-governance.mjs \
      --repository fixture/nln --branch master --commit "$COMMIT" \
      --receipts-dir "$RECEIPTS" --output "$RESULT" \
      --gh-command "$WORK/gh-stub.sh" --now-epoch "$NOW"
}

@test "required Trusted Gate and two exact-commit receipts qualify governance" {
  run audit
  [ "$status" -eq 0 ]
  [ "$(stat -c %a "$RESULT")" = 600 ]
  node -e 'const r=require(process.argv[1]);if(r.status!=="qualified"||!r.readOnly||r.settingsChanged||r.trustedReceipts.length!==2||r.trustedReceipts.some(x=>!x.verified)||r.findings.length)process.exit(1)' "$RESULT"
}

@test "missing branch-protection status checks publish blocked evidence" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.required_status_checks=null;fs.writeFileSync(p,JSON.stringify(v))' "$WORK/protection.json"
  run audit
  [ "$status" -ne 0 ]
  [ -f "$RESULT" ]
  node -e 'const r=require(process.argv[1]);if(r.status!=="blocked"||!r.findings.includes("required-status-check:Trusted Gate")||!r.findings.includes("strict-status-checks")||r.settingsChanged)process.exit(1)' "$RESULT"
}

@test "failed exact-commit check and stale or reused receipts block qualification" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.check_runs[0].conclusion="failure";fs.writeFileSync(p,JSON.stringify(v))' "$WORK/checks.json"
  run audit
  [ "$status" -ne 0 ]
  node -e 'const r=require(process.argv[1]);if(!r.findings.includes("successful-exact-commit-check:Trusted Gate"))process.exit(1)' "$RESULT"

  rm "$RESULT"
  cp "$RECEIPTS/push.json" "$RECEIPTS/pull-request.json"
  run audit
  [ "$status" -ne 0 ]
  node -e 'const r=require(process.argv[1]);if(!r.findings.includes("distinct-trusted-receipts"))process.exit(1)' "$RESULT"
}

@test "unsafe receipt permissions and evidence overwrite fail closed" {
  chmod 644 "$RECEIPTS/push.json"
  run audit
  [ "$status" -ne 0 ]
  [ ! -e "$RESULT" ]
  chmod 600 "$RECEIPTS/push.json"
  audit >/dev/null
  before="$(sha256sum "$RESULT")"
  run audit
  [ "$status" -ne 0 ]
  [ "$before" = "$(sha256sum "$RESULT")" ]
}

@test "policy cannot weaken reviews status checks receipt age or read-only behavior" {
  for expression in \
    'v.requiredStatusChecks=[]' \
    'v.requireStrictStatusChecks=false' \
    'v.minimumApprovingReviews=0' \
    'v.requireNoForcePushes=false' \
    'v.maximumReceiptAgeSeconds=9999999' \
    'v.audit.readOnly=false' \
    'v.audit.allowEvidenceOverwrite=true'; do
    cp config/github-deployment-governance-policy.json "$WORK/policy.json"
    node -e "const fs=require('fs'),p=process.argv[1],v=require(p);$expression;fs.writeFileSync(p,JSON.stringify(v))" "$WORK/policy.json"
    run env GOV_PROTECTION="$WORK/protection.json" GOV_CHECKS="$WORK/checks.json" \
      node scripts/audit-github-deployment-governance.mjs --repository fixture/nln \
      --branch master --commit "$COMMIT" --receipts-dir "$RECEIPTS" \
      --output "$RESULT-$RANDOM" --gh-command "$WORK/gh-stub.sh" \
      --policy "$WORK/policy.json" --now-epoch "$NOW"
    [ "$status" -ne 0 ]
  done
}

@test "help is side-effect free and explicitly read-only" {
  run node scripts/audit-github-deployment-governance.mjs --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"never changes GitHub settings"* ]]
}
