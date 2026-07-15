#!/usr/bin/env bats
setup() { WORK="$BATS_TEST_TMPDIR/module-boundaries-$BATS_TEST_NUMBER"; mkdir -p "$WORK"; }

@test "deployment layers reject production coupling and fixture network modules" {
  run node scripts/validate-deployment-module-boundaries.mjs
  [ "$status" -eq 0 ]
  echo "import net from 'node:net';" >"$WORK/unsafe-adapter.mjs"
  node -e 'const fs=require("fs"),p=process.argv[1],out=process.argv[2],v=require("./config/deployment-module-boundaries.json");v.fixtureAdapters=[p];fs.writeFileSync(out,JSON.stringify(v))' "$WORK/unsafe-adapter.mjs" "$WORK/policy.json"
  run node scripts/validate-deployment-module-boundaries.mjs --policy "$WORK/policy.json"
  [ "$status" -ne 0 ]; [[ "$output" == *"imports network capability"* ]]
}

@test "module-boundary help is side-effect free" {
  run node scripts/validate-deployment-module-boundaries.mjs --help
  [ "$status" -eq 0 ]; [ ! -e "$WORK/output" ]
}
