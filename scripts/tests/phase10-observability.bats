#!/usr/bin/env bats
setup(){ WORK="$BATS_TEST_TMPDIR/p10-observe-$BATS_TEST_NUMBER";mkdir -p "$WORK/in";NOW=2026-01-10T00:00:00.000Z;H=$(printf 'a%.0s' {1..64});C=$(printf 'b%.0s' {1..40});cat >"$WORK/in/backup.json" <<EOF
{"schemaVersion":1,"receiptType":"runtime-state-backup-qualification","status":"success","scope":"fixture","release":{"version":"10.0.0","commit":"$C"},"finishedAt":"2026-01-09T12:00:00.000Z","policy":{"sha256":"$H"},"inventory":{"sha256":"$H"},"archive":{"sha256":"$H","bytes":100},"databaseRestore":{"status":"success","receiptSha256":"$H","invariantsSha256":"$H"},"assuranceStates":["captured","content-verified","database-restore-verified","qualified"]}
EOF
cat >"$WORK/in/deploy.json" <<EOF
{"schemaVersion":1,"receiptType":"release-deploy","status":"success","scope":"fixture","measuredDowntimeMilliseconds":70000,"durationMilliseconds":90000}
EOF
}
@test "summary separates scopes, reports distributions, and emits local alerts" { run node scripts/release-observability.mjs summarize --directory "$WORK/in" --output "$WORK/summary.json" --alerts "$WORK/alerts.json" --now "$NOW";[ "$status" -eq 0 ];[ "$(stat -c %a "$WORK/summary.json")" = 600 ];node -e 'const s=require(process.argv[1]);if(s.scopeCounts.fixture!==2||s.metrics.measuredDowntimeMilliseconds.samples!==1||s.alerts.total<3)process.exit(1)' "$WORK/summary.json";grep -q 'downtime-slo' "$WORK/alerts.json";grep -q 'missing-resilience-evidence' "$WORK/alerts.json"; }
@test "failed operations remain observable" { for i in 1 2 3;do echo "{\"schemaVersion\":1,\"receiptType\":\"fixture-failure-$i\",\"status\":\"failed\",\"scope\":\"fixture\"}" >"$WORK/in/f$i.json";done;run node scripts/release-observability.mjs summarize --directory "$WORK/in" --output "$WORK/summary.json" --alerts "$WORK/alerts.json" --now "$NOW";[ "$status" -eq 0 ];grep -q 'repeated-failure' "$WORK/alerts.json"; }
