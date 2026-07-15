#!/usr/bin/env bats
setup() { WORK="$BATS_TEST_TMPDIR/objectives-$BATS_TEST_NUMBER"; mkdir -p "$WORK"; }

@test "one operational-objectives contract reconciles cross-phase limits" {
  run node scripts/validate-deployment-operational-objectives.mjs
  [ "$status" -eq 0 ]; [[ "$output" == *"no conflicting SLO or freshness definitions"* ]]
}

@test "conflicting pre-deployment age and downtime values fail closed" {
  cp config/deployment-operational-objectives.json "$WORK/objectives.json"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.freshnessSeconds.preDeploymentBackup=86400;fs.writeFileSync(p,JSON.stringify(v))' "$WORK/objectives.json"
  run node scripts/validate-deployment-operational-objectives.mjs --objectives "$WORK/objectives.json"
  [ "$status" -ne 0 ]; [[ "$output" == *"pre-deployment backup age conflicts"* ]]
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.freshnessSeconds.preDeploymentBackup=3600;v.routineDowntimeMilliseconds=300000;fs.writeFileSync(p,JSON.stringify(v))' "$WORK/objectives.json"
  run node scripts/validate-deployment-operational-objectives.mjs --objectives "$WORK/objectives.json"
  [ "$status" -ne 0 ]; [[ "$output" == *"routine downtime conflicts"* ]]
}

@test "incident hold protections cannot be weakened" {
  cp config/deployment-operational-objectives.json "$WORK/objectives.json"
  node -e 'const fs=require("fs"),p=process.argv[1],v=require(p);v.incidentHold.blockRetentionDeletion=false;fs.writeFileSync(p,JSON.stringify(v))' "$WORK/objectives.json"
  run node scripts/validate-deployment-operational-objectives.mjs --objectives "$WORK/objectives.json"
  [ "$status" -ne 0 ]; [[ "$output" == *"incident-hold protections"* ]]
}
