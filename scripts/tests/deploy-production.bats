#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../deploy-production.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/.env-prod"
    cat >"${ENV_FILE}" <<EOF
SITE_IP=203.0.113.10
PROJECT_DIR=/srv/app
EOF
}

write_executable() {
    local path="$1"
    local body="$2"
    printf '%s\n' "${body}" >"${path}"
    chmod +x "${path}"
}

install_ssh_stub() {
    cat >"${BATS_MOCK_BINDIR}/ssh" <<'EOF'
#!/usr/bin/env bash
cmd="${*: -1}"
echo "ssh:${cmd}" >>"${DEPLOY_ORDER_LOG}"
if [[ "${cmd}" == test\ !\ -f* ]] && [ "${VERSION_EXISTS:-false}" = "true" ]; then
  exit 1
fi
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/ssh"
}

install_script_stubs() {
    VALIDATE_ENV_SCRIPT="${BATS_TMPDIR}/validate-env"
    HEALTHCHECK_SCRIPT="${BATS_TMPDIR}/healthcheck"
    BACKUP_SCRIPT="${BATS_TMPDIR}/backup"
    BUILD_SCRIPT="${BATS_TMPDIR}/build"
    YARN_CMD="${BATS_TMPDIR}/yarn"

    write_executable "${VALIDATE_ENV_SCRIPT}" '#!/usr/bin/env bash
echo validate >>"${DEPLOY_ORDER_LOG}"'

    write_executable "${HEALTHCHECK_SCRIPT}" '#!/usr/bin/env bash
echo health >>"${DEPLOY_ORDER_LOG}"
[ "${HEALTH_FAIL:-false}" = "true" ] && exit 1
exit 0'

    write_executable "${BACKUP_SCRIPT}" '#!/usr/bin/env bash
echo "backup:$*" >>"${DEPLOY_ORDER_LOG}"
if [[ "$*" == *"--preflight-only"* ]] && [ "${BACKUP_PREFLIGHT_FAIL:-false}" = "true" ]; then
  exit 1
fi
if [[ "$*" != *"--preflight-only"* ]] && [ "${BACKUP_FAIL:-false}" = "true" ]; then
  exit 1
fi
exit 0'

    write_executable "${BUILD_SCRIPT}" '#!/usr/bin/env bash
echo "build:$*" >>"${DEPLOY_ORDER_LOG}"'

    write_executable "${YARN_CMD}" '#!/usr/bin/env bash
echo "yarn:$*" >>"${DEPLOY_ORDER_LOG}"'
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}" "${BATS_TMPDIR}/home/.ssh"
    export HOME="${BATS_TMPDIR}/home"
    export DEPLOY_ORDER_LOG="${BATS_TMPDIR}/order.log"
    touch "${HOME}/.ssh/id_rsa_203.0.113.10"
    write_env_file
    install_ssh_stub
    install_script_stubs
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

run_deploy_production() {
    run env \
        VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT}" \
        HEALTHCHECK_SCRIPT="${HEALTHCHECK_SCRIPT}" \
        BACKUP_SCRIPT="${BACKUP_SCRIPT}" \
        BUILD_SCRIPT="${BUILD_SCRIPT}" \
        YARN_CMD="${YARN_CMD}" \
        VERSION_EXISTS="${VERSION_EXISTS:-false}" \
        HEALTH_FAIL="${HEALTH_FAIL:-false}" \
        BACKUP_PREFLIGHT_FAIL="${BACKUP_PREFLIGHT_FAIL:-false}" \
        BACKUP_FAIL="${BACKUP_FAIL:-false}" \
        DEPLOY_ORDER_LOG="${DEPLOY_ORDER_LOG}" \
        "$SCRIPT_PATH" -v 9.9.9 -e "$ENV_FILE" "$@"
}

@test "standard deployment runs health check and mandatory offsite backup before build" {
    run_deploy_production

    assert_equal "$status" 0
    expected=$'validate\nyarn:validate:ci\nhealth\nssh:test ! -f \'/var/tmp/9.9.9/runtime-state/manifest.txt\'\nbackup:-e '"${ENV_FILE}"$' --preflight-only\nbackup:-e '"${ENV_FILE}"$' --verify-restore\nbuild:-v 9.9.9 -e '"${ENV_FILE}"$' -d y\nssh:cd \'/srv/app\' && ./scripts/deploy.sh -v \'9.9.9\'\nssh:docker ps --format \'table {{.Names}}\\t{{.Status}}\''
    assert_equal "$(cat "${DEPLOY_ORDER_LOG}")" "${expected}"
}

@test "validation command can be overridden" {
    run env \
        VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT}" \
        HEALTHCHECK_SCRIPT="${HEALTHCHECK_SCRIPT}" \
        BACKUP_SCRIPT="${BACKUP_SCRIPT}" \
        BUILD_SCRIPT="${BUILD_SCRIPT}" \
        YARN_CMD="${YARN_CMD}" \
        DEPLOY_VALIDATE_CMD="validate" \
        DEPLOY_ORDER_LOG="${DEPLOY_ORDER_LOG}" \
        "$SCRIPT_PATH" -v 9.9.9 -e "$ENV_FILE"

    assert_equal "$status" 0
    grep -q '^yarn:validate$' "${DEPLOY_ORDER_LOG}"
}

@test "offsite backup failure blocks deployment before build" {
    export BACKUP_FAIL=true

    run_deploy_production

    assert_equal "$status" 1
    refute grep -q '^build:' "${DEPLOY_ORDER_LOG}"
}

@test "offsite backup preflight failure blocks deployment before backup archive and build" {
    export BACKUP_PREFLIGHT_FAIL=true

    run_deploy_production

    assert_equal "$status" 1
    refute grep -q '^build:' "${DEPLOY_ORDER_LOG}"
    [ "$(grep -c '^backup:' "${DEPLOY_ORDER_LOG}")" -eq 1 ]
}

@test "critical health failure blocks deployment before backup and build" {
    export HEALTH_FAIL=true

    run_deploy_production

    assert_equal "$status" 1
    refute grep -q '^backup:' "${DEPLOY_ORDER_LOG}"
    refute grep -q '^build:' "${DEPLOY_ORDER_LOG}"
}

@test "existing runtime-state manifest blocks version reuse before backup and build" {
    export VERSION_EXISTS=true

    run_deploy_production

    assert_equal "$status" 1
    assert_output --partial "Runtime-state backup already exists"
    refute grep -q '^backup:' "${DEPLOY_ORDER_LOG}"
    refute grep -q '^build:' "${DEPLOY_ORDER_LOG}"
}

@test "skip-tests skips yarn only, not health or offsite backup" {
    run_deploy_production --skip-tests

    assert_equal "$status" 0
    refute grep -q '^yarn:' "${DEPLOY_ORDER_LOG}"
    assert_output --partial "Skipping validation gate"
    grep -q '^health$' "${DEPLOY_ORDER_LOG}"
    grep -q '^backup:.*--preflight-only' "${DEPLOY_ORDER_LOG}"
    grep -q '^backup:.*--verify-restore' "${DEPLOY_ORDER_LOG}"
}

@test "invalid version is rejected before validation or ssh" {
    run env \
        VALIDATE_ENV_SCRIPT="${VALIDATE_ENV_SCRIPT}" \
        HEALTHCHECK_SCRIPT="${HEALTHCHECK_SCRIPT}" \
        BACKUP_SCRIPT="${BACKUP_SCRIPT}" \
        BUILD_SCRIPT="${BUILD_SCRIPT}" \
        YARN_CMD="${YARN_CMD}" \
        DEPLOY_ORDER_LOG="${DEPLOY_ORDER_LOG}" \
        "$SCRIPT_PATH" -v "9.9.9;bad" -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "Invalid deployment version"
    [ ! -f "${DEPLOY_ORDER_LOG}" ]
}

@test "deploy script stops containers with production compose file" {
    grep -q 'docker-compose --env-file "${TMP_DIR}/.env-prod" -f "${HERE}/../docker-compose-prod.yml" down' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "build and deploy artifacts exclude host node_modules" {
    refute grep -q '"node_modules"' "$BATS_TEST_DIRNAME/../build.sh"
    refute grep -q '"packages/server/node_modules"' "$BATS_TEST_DIRNAME/../deploy.sh"
    refute grep -q '"packages/shared/node_modules"' "$BATS_TEST_DIRNAME/../deploy.sh"
    refute grep -q '"packages/ui/node_modules"' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "build generates Prisma client before compiling server" {
    grep -q 'yarn prisma generate --schema=src/db/schema.prisma' "$BATS_TEST_DIRNAME/../build.sh"
}

@test "build packages Prisma schema and fails on Docker build failure" {
    grep -q 'cp src/db/schema.prisma dist/db/schema.prisma' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q 'cp -r src/db/migrations dist/db/migrations' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q 'if ! docker-compose --env-file "${ENV_FILE}" -f docker-compose-prod.yml build' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q 'Failed to build Docker images' "$BATS_TEST_DIRNAME/../build.sh"
}

@test "build refuses dirty tracked worktree by default" {
    grep -q 'BUILD_ALLOW_DIRTY_WORKTREE' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q 'status --porcelain --untracked-files=no' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q 'Tracked worktree changes are present' "$BATS_TEST_DIRNAME/../build.sh"
}

@test "production wrapper builds without mutating package versions" {
    grep -q 'BUILD_SKIP_PACKAGE_VERSION_UPDATE=true DEPLOY_CONFIRMED=true' "$SCRIPT_PATH"
}

@test "deploy verifies built commit before staging artifacts" {
    grep -q 'COMMIT_FILE="${TMP_DIR}/deploy-commit.txt"' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'verify_repository_state' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'git pull --ff-only' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'Remote commit does not match built artifact commit' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "deploy stages artifacts before swapping live directories" {
    grep -q 'STAGING_DIR="${TMP_DIR}/staged-artifacts"' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'stage_artifacts' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'swap_staged_artifacts' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "deploy verifies artifact checksum manifest before staging" {
    grep -q 'DEPLOY_MANIFEST="${TMP_DIR}/deploy-manifest.sha256"' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'sha256sum -c' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'verify_deploy_manifest' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "build transfers env file explicitly as .env-prod and sends checksum manifest" {
    grep -q 'deploy-manifest.sha256' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q '"root@${BUILD_DIR}.env-prod"' "$BATS_TEST_DIRNAME/../build.sh"
}

@test "production deploy no longer runs setup.sh host mutation" {
    refute grep -q 'setup.sh' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'verify_host_prerequisites' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'Run setup/provisioning separately before deploying' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "build excludes base images by default with opt-in fallback" {
    grep -q 'BUILD_INCLUDE_BASE_IMAGES' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q 'DOCKER_SAVE_IMAGES=(nln_ui:prod "nln_ui:${VERSION}" nln_server:prod "nln_server:${VERSION}")' "$BATS_TEST_DIRNAME/../build.sh"
    grep -q 'DOCKER_SAVE_IMAGES+=(postgres:13-alpine redis:7-alpine)' "$BATS_TEST_DIRNAME/../build.sh"
}

@test "setup installs node version from .nvmrc" {
    grep -q 'NODE_VERSION=$(tr -d' "$BATS_TEST_DIRNAME/../setup.sh"
    grep -q 'nvm install "${NODE_VERSION}"' "$BATS_TEST_DIRNAME/../setup.sh"
    refute grep -q '20.18.1' "$BATS_TEST_DIRNAME/../setup.sh"
}

@test "deploy verifies public UI and API endpoints" {
    grep -q 'verify_public_endpoints' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'curl -fsS "${ui_url}"' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'curl -fsS "${server_health_url}"' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "server migration backup uses explicit database env vars for pg_dump credentials" {
    grep -q 'DB_DUMP_USER="${DB_USER:-}"' "$BATS_TEST_DIRNAME/../server.sh"
    grep -q 'DB_DUMP_PASSWORD="${DB_PASSWORD:-}"' "$BATS_TEST_DIRNAME/../server.sh"
    grep -q 'PGPASSWORD="${DB_DUMP_PASSWORD}" pg_dump' "$BATS_TEST_DIRNAME/../server.sh"
    refute grep -q "DB_USER=.*sed -n 's/.*" "$BATS_TEST_DIRNAME/../server.sh"
}
