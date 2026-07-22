#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT="$BATS_TEST_DIRNAME/../capture-production-recovery-package.sh"

setup() {
  mkdir -p "$BATS_MOCK_BINDIR" "$BATS_TMPDIR/home/.ssh" "$BATS_TMPDIR/backups/fixture" "$BATS_TMPDIR/archive/source" "$BATS_TMPDIR/archive/artifacts" "$BATS_TMPDIR/archive/images"
  export HOME="$BATS_TMPDIR/home" SSH_LOG="$BATS_TMPDIR/ssh.log" BACKUP_DIR="$BATS_TMPDIR/backups/fixture"
  touch "$HOME/.ssh/id_rsa_203.0.113.10"
  printf 'SITE_IP=203.0.113.10\nPROJECT_DIR=/srv/app\n' >"$BATS_TMPDIR/.env-prod"
  printf 'source\n' >"$BATS_TMPDIR/archive/source/file"
  printf 'artifacts\n' >"$BATS_TMPDIR/archive/artifacts/file"
  printf 'images\n' >"$BATS_TMPDIR/archive/images/manifest.json"
  tar -czf "$BATS_TMPDIR/source.tar.gz" -C "$BATS_TMPDIR/archive/source" .
  tar -czf "$BATS_TMPDIR/artifacts.tar.gz" -C "$BATS_TMPDIR/archive/artifacts" .
  tar -czf "$BATS_TMPDIR/images.tar.gz" -C "$BATS_TMPDIR/archive/images" .
  cp "$BATS_TMPDIR/source.tar.gz" "$BACKUP_DIR/runtime-state-20260721232700.tar.gz"
  runtime_sha=$(sha256sum "$BACKUP_DIR/runtime-state-20260721232700.tar.gz" | awk '{print $1}')
  printf 'backup_type=runtime-state\narchive=runtime-state-20260721232700.tar.gz\nsha256=%s\n' "$runtime_sha" >"$BACKUP_DIR/manifest.txt"
  cat >"$BATS_MOCK_BINDIR/backup" <<'EOF'
#!/usr/bin/env bash
echo "backup_dir=${BACKUP_DIR}"
EOF
  cat >"$BATS_MOCK_BINDIR/ssh" <<'EOF'
#!/usr/bin/env bash
cmd="${*: -1}"; printf '%s\n' "$cmd" >>"$SSH_LOG"
if [[ "$cmd" == *'git rev-parse HEAD'* ]]; then
  echo 'commit=0123456789abcdef0123456789abcdef01234567'
  echo "tracked_dirty=${PRODUCTION_DIRTY:-false}"
  [ "${MISSING_CONTAINER:-false}" = true ] || echo 'container=/nln_ui|image_id=sha256:1111111111111111111111111111111111111111111111111111111111111111|image_ref=nln_ui:prod'
  echo 'container=/nln_server|image_id=sha256:2222222222222222222222222222222222222222222222222222222222222222|image_ref=nln_server:prod'
  echo 'container=/nln_db|image_id=sha256:3333333333333333333333333333333333333333333333333333333333333333|image_ref=postgres:13-alpine'
  echo 'container=/nln_redis|image_id=sha256:4444444444444444444444444444444444444444444444444444444444444444|image_ref=redis:7-alpine'
elif [[ "$cmd" == *'git archive'* ]]; then
  cat "$BATS_TMPDIR/source.tar.gz"
elif [[ "$cmd" == *'tar -czf - docker-compose-prod.yml'* ]]; then
  cat "$BATS_TMPDIR/artifacts.tar.gz"
elif [[ "$cmd" == *'docker save'* ]]; then
  cat "$BATS_TMPDIR/images.tar.gz"
fi
EOF
  chmod +x "$BATS_MOCK_BINDIR/backup" "$BATS_MOCK_BINDIR/ssh"
}

run_capture() {
  run env BACKUP_SCRIPT="$BATS_MOCK_BINDIR/backup" SSH_BIN="$BATS_MOCK_BINDIR/ssh" \
    PRODUCTION_DIRTY="${PRODUCTION_DIRTY:-false}" MISSING_CONTAINER="${MISSING_CONTAINER:-false}" \
    "$SCRIPT" -e "$BATS_TMPDIR/.env-prod" -o "$BATS_TMPDIR/backups"
}

@test "captures a hash-bound exact production recovery package" {
  run_capture
  assert_equal "$status" 0
  package="$BACKUP_DIR/production-recovery"
  [ -f "$package/manifest.txt" ]
  grep -q '^production_commit=0123456789abcdef0123456789abcdef01234567$' "$package/manifest.txt"
  grep -q '^qualification=passed$' "$package/manifest.txt"
  [ "$(stat -c %a "$package")" = 700 ]
  find "$package" -type f ! -perm 600 | grep . && false || true
  (cd "$package" && sha256sum -c SHA256SUMS)
  grep -q 'docker save sha256:1111111111111111111111111111111111111111111111111111111111111111' "$SSH_LOG"
  "$BATS_TEST_DIRNAME/../verify-production-recovery-package.sh" "$package"
}

@test "tracked production changes fail closed and remove partial package" {
  export PRODUCTION_DIRTY=true
  run_capture
  [ "$status" -ne 0 ]
  assert_output --partial 'tracked changes'
  [ ! -e "$BACKUP_DIR/production-recovery" ]
}

@test "missing required container identity fails closed" {
  export MISSING_CONTAINER=true
  run_capture
  [ "$status" -ne 0 ]
  assert_output --partial 'all four required containers'
  [ ! -e "$BACKUP_DIR/production-recovery" ]
}

@test "existing package is never overwritten" {
  mkdir -p "$BACKUP_DIR/production-recovery"
  printf 'keep\n' >"$BACKUP_DIR/production-recovery/existing"
  run_capture
  [ "$status" -ne 0 ]
  grep -q keep "$BACKUP_DIR/production-recovery/existing"
}
