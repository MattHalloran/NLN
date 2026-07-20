#!/usr/bin/env bats

setup() {
  ROOT="$BATS_TEST_TMPDIR/sensitive-permissions-$BATS_TEST_NUMBER"
  mkdir -p "$ROOT/backups/nested" "$ROOT/.validation" "$ROOT/data/migration-backups"
  printf 'SECRET=fixture-only\n' >"$ROOT/.env-prod"
  printf 'fixture backup\n' >"$ROOT/backups/nested/archive"
  printf 'fixture evidence\n' >"$ROOT/.validation/receipt"
  printf 'fixture migration\n' >"$ROOT/data/migration-backups/dump"
  find "$ROOT" -type d -exec chmod 700 {} +
  find "$ROOT" -type f -exec chmod 600 {} +
}

audit() {
  run env SENSITIVE_ARTIFACT_ROOT="$ROOT" bash scripts/audit-local-sensitive-artifact-permissions.sh
}

@test "owner-only secrets backups and evidence pass without printing values" {
  audit
  [ "$status" -eq 0 ]
  [[ "$output" == *"Values were not printed"* ]]
  [[ "$output" != *"fixture-only"* ]]
}

@test "broad file or directory permissions fail without printing paths or values" {
  chmod 644 "$ROOT/backups/nested/archive"
  audit
  [ "$status" -ne 0 ]
  [[ "$output" == *"file broader than 0600"* ]]
  [[ "$output" != *"fixture backup"* ]]
  chmod 600 "$ROOT/backups/nested/archive"
  chmod 755 "$ROOT/.validation"
  audit
  [ "$status" -ne 0 ]
  [[ "$output" == *"directory broader than 0700"* ]]
}

@test "symlinks and special objects fail closed" {
  ln -s archive "$ROOT/backups/nested/link"
  audit
  [ "$status" -ne 0 ]
  [[ "$output" == *"link or special filesystem object"* ]]
}

@test "missing optional roots are accepted" {
  rm -rf "$ROOT/backups" "$ROOT/.validation" "$ROOT/data"
  rm "$ROOT/.env-prod"
  audit
  [ "$status" -eq 0 ]
}
