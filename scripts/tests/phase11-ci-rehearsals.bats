#!/usr/bin/env bats

setup() {
  WORK="$BATS_TEST_TMPDIR/phase11-ci-$BATS_TEST_NUMBER"
  mkdir -p "$WORK"
  cp config/phase11-ci-rehearsal-manifest.json "$WORK/manifest.json"
}

validate() {
  run node scripts/validate-phase11-ci-rehearsals.mjs --manifest "$WORK/manifest.json"
}

@test "four scheduled synthetic rehearsals retain evidence without production access" {
  validate
  [ "$status" -eq 0 ]
  [[ "$output" == *"4 synthetic rehearsals"* ]]
}

@test "manifest cannot enable production or qualify fixture evidence as production" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.productionIntegrationEnabled=true;fs.writeFileSync(p,JSON.stringify(v))' "$WORK/manifest.json"
  validate
  [ "$status" -ne 0 ]
  cp config/phase11-ci-rehearsal-manifest.json "$WORK/manifest.json"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.evidence.fixtureEvidenceQualifiesProduction=true;fs.writeFileSync(p,JSON.stringify(v))' "$WORK/manifest.json"
  validate
  [ "$status" -ne 0 ]
}

@test "missing rehearsal command or retained artifact fails closed" {
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.rehearsals[2].requiredCommand="missing-command";fs.writeFileSync(p,JSON.stringify(v))' "$WORK/manifest.json"
  validate
  [ "$status" -ne 0 ]
  cp config/phase11-ci-rehearsal-manifest.json "$WORK/manifest.json"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.rehearsals[3].requiredArtifact="missing-artifact";fs.writeFileSync(p,JSON.stringify(v))' "$WORK/manifest.json"
  validate
  [ "$status" -ne 0 ]
}

@test "floating actions and production commands are rejected" {
  cp .github/workflows/reliability-rehearsals.yml "$WORK/workflow.yml"
  sed -i 's#actions/checkout@[0-9a-f]*#actions/checkout@v4#' "$WORK/workflow.yml"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);for(const r of v.rehearsals)if(r.workflow.includes("reliability-rehearsals"))r.workflow=process.argv[2];fs.writeFileSync(p,JSON.stringify(v))' "$WORK/manifest.json" "$WORK/workflow.yml"
  validate
  [ "$status" -ne 0 ]

  sed -i 's#actions/checkout@v4#actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5#' "$WORK/workflow.yml"
  printf '\n# deploy-production.sh\n' >>"$WORK/workflow.yml"
  validate
  [ "$status" -ne 0 ]
}

@test "weakened schedule permissions or evidence safeguards fail closed" {
  for expression in \
    'v.workflowSafety.requireSchedule=false' \
    'v.workflowSafety.requireManualDispatch=false' \
    'v.workflowSafety.requireReadOnlyContentsPermission=false' \
    'v.workflowSafety.requireImmutableActionPins=false' \
    'v.evidence.retainTapOutput=false' \
    'v.evidence.uploadEvenOnFailure=false'; do
    cp config/phase11-ci-rehearsal-manifest.json "$WORK/manifest.json"
    node -e "const fs=require('fs'),p=process.argv[1],v=require(p);$expression;fs.writeFileSync(p,JSON.stringify(v))" "$WORK/manifest.json"
    validate
    [ "$status" -ne 0 ]
  done
}
