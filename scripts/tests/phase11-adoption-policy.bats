#!/usr/bin/env bats

setup() {
  WORK="$BATS_TEST_TMPDIR/phase11-$BATS_TEST_NUMBER"
  mkdir -p "$WORK"
  cp config/phase11-adoption-policy.json "$WORK/policy.json"
}

mutate() {
  node -e "const fs=require('fs'),p=process.argv[1],v=require(p);$1;fs.writeFileSync(p,JSON.stringify(v))" "$WORK/policy.json"
}

validate() {
  run node scripts/validate-phase11-adoption-policy.mjs --policy "$WORK/policy.json"
}

@test "canonical Phase 11 policy permits only local and CI automation" {
  validate
  [ "$status" -eq 0 ]
  [[ "$output" == *"production access and VPS mutation disabled"* ]]
}

@test "production integration access and mutation cannot be enabled" {
  for expression in \
    'v.productionIntegrationEnabled=true' \
    'v.productionAccessAllowed=true' \
    'v.vpsMutationAllowed=true'; do
    cp config/phase11-adoption-policy.json "$WORK/policy.json"
    mutate "$expression"
    validate
    [ "$status" -ne 0 ]
  done
}

@test "Phase 9 and governance prerequisites cannot be omitted" {
  mutate 'v.requiredProgramPrerequisites.shift()'
  validate
  [ "$status" -ne 0 ]
  [[ "$output" == *"program prerequisites"* ]]
}

@test "production-facing stages cannot become automated or lose approval" {
  mutate 'v.stages[2].automationAllowed=true'
  validate
  [ "$status" -ne 0 ]

  cp config/phase11-adoption-policy.json "$WORK/policy.json"
  mutate 'v.stages[2].requiredEvidence=v.stages[2].requiredEvidence.filter(x=>!x.includes("approval"))'
  validate
  [ "$status" -ne 0 ]
}

@test "cutover cannot omit rollback stop conditions or legacy retention" {
  mutate 'v.stages[5].requiredEvidence=v.stages[5].requiredEvidence.filter(x=>x!=="exact-transition-app-rollback-rehearsal")'
  validate
  [ "$status" -ne 0 ]
  [[ "$output" == *"cutover evidence"* ]]
}

@test "promotion cannot bypass sequence freshness commit binding or approval" {
  for expression in \
    'v.promotion.sequentialOnly=false' \
    'v.promotion.requireAllStageEvidence=false' \
    'v.promotion.requireFreshEvidence=false' \
    'v.promotion.requireExactCommitBinding=false' \
    'v.promotion.allowEmergencyBypass=true' \
    'v.promotion.allowImplicitApproval=true'; do
    cp config/phase11-adoption-policy.json "$WORK/policy.json"
    mutate "$expression"
    validate
    [ "$status" -ne 0 ]
  done
}

@test "validator help is local and side-effect free" {
  before="$(sha256sum config/phase11-adoption-policy.json)"
  run node scripts/validate-phase11-adoption-policy.mjs --help
  [ "$status" -eq 0 ]
  [ "$before" = "$(sha256sum config/phase11-adoption-policy.json)" ]
}
