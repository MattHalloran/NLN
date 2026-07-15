#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../deploy-rehearsal.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/rehearsal.env"
    cat >"${ENV_FILE}" <<EOF
SERVER_LOCATION=dns
CREATE_MOCK_DATA=false
DB_PULL=false
TRUST_PROXY_HOPS=1
E2E_DISABLE_RATE_LIMITS=false
RATE_LIMIT_DIAGNOSTICS=false
PORT_UI=3101
PORT_SERVER=5331
PORT_DB=55433
PORT_REDIS=56380
PROJECT_DIR=/srv/app
SITE_IP=${SITE_IP_VALUE:-127.0.0.1}
SERVER_URL=${SERVER_URL_VALUE:-http://127.0.0.1:5331}
UI_URL=${UI_URL_VALUE:-http://127.0.0.1:3101}
VIRTUAL_HOST=localhost
JWT_SECRET=rehearsal-jwt-secret
CSRF_SECRET=rehearsal-csrf-secret
DB_NAME=nln_rehearsal
DB_USER=nln_rehearsal
DB_PASSWORD=rehearsal-db-password
ADMIN_EMAIL=admin@example.test
ADMIN_PASSWORD=rehearsal-admin-password
SITE_EMAIL_USERNAME=mailer@example.test
SITE_EMAIL_PASSWORD=rehearsal-email-password
LETSENCRYPT_EMAIL=admin@example.test
EOF
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "deploy rehearsal requires a rehearsal version prefix" {
    run "$SCRIPT_PATH" -v 9.9.9

    assert_equal "$status" 1
    assert_output --partial "Rehearsal version must start"
}

@test "deploy rehearsal rejects production-looking SITE_IP before command checks" {
    SITE_IP_VALUE=203.0.113.10 write_env_file

    run "$SCRIPT_PATH" -v rehearsal-guard -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "SITE_IP must be loopback"
}

@test "deploy rehearsal rejects non-local public URLs before command checks" {
    SERVER_URL_VALUE=https://api.example.com UI_URL_VALUE=https://example.com write_env_file

    run "$SCRIPT_PATH" -v rehearsal-guard -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "UI_URL must be a local loopback URL"
}

@test "deploy script has rehearsal mode while host setup remains disabled" {
    grep -q 'DEPLOY_REHEARSAL' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'skipping proxy bootstrap checks' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'host setup remains disabled' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "deploy script validates rehearsal commit without git pull" {
    grep -q 'Rehearsal repository is at expected commit' "$BATS_TEST_DIRNAME/../deploy.sh"
    grep -q 'DEPLOY_REHEARSAL' "$BATS_TEST_DIRNAME/../deploy.sh"
}

@test "build script can skip package version updates for rehearsal" {
    grep -q 'BUILD_SKIP_PACKAGE_VERSION_UPDATE' "$BATS_TEST_DIRNAME/../build.sh"
}

@test "deploy rehearsal verifies logical dump restore" {
    grep -q 'verify_dump_restores' "$SCRIPT_PATH"
    grep -q 'deploy_rehearsal_probe' "$SCRIPT_PATH"
    grep -q 'restore-runtime-state.sh' "$SCRIPT_PATH"
}

@test "deploy rehearsal installs project-local env file for docker compose env_file" {
    grep -q 'install_project_env_file' "$SCRIPT_PATH"
    grep -q 'cp -p "${ENV_FILE}" "${REHEARSAL_PROJECT_DIR}/.env-prod"' "$SCRIPT_PATH"
    grep -q 'env_file: .env-prod' "$BATS_TEST_DIRNAME/../../docker-compose-prod.yml"
}

@test "generated rehearsal environment satisfies production proxy and rate-limit safeguards" {
    grep -q '^TRUST_PROXY_HOPS=1$' "$SCRIPT_PATH"
    grep -q '^E2E_DISABLE_RATE_LIMITS=false$' "$SCRIPT_PATH"
    grep -q '^RATE_LIMIT_DIAGNOSTICS=false$' "$SCRIPT_PATH"
}

@test "deploy rehearsal replacement flag removes existing local containers" {
    grep -q 'REPLACE_LOCAL_CONTAINERS' "$SCRIPT_PATH"
    grep -q 'docker rm -f' "$SCRIPT_PATH"
    grep -q 'Removing existing local nln_\* containers' "$SCRIPT_PATH"
}

@test "deploy rehearsal installs dependencies in disposable clone before build" {
    grep -q 'Installing disposable project dependencies' "$SCRIPT_PATH"
    grep -q 'yarn install --frozen-lockfile' "$SCRIPT_PATH"
}

@test "deploy rehearsal uses project Node version before yarn install" {
    grep -q 'use_project_node' "$SCRIPT_PATH"
    grep -q 'REPO_ROOT}/.nvmrc' "$SCRIPT_PATH"
    grep -q 'nvm use "${node_version}"' "$SCRIPT_PATH"
}

@test "deploy rehearsal applies baseline migrations before seeding probe data" {
    grep -q 'apply_baseline_migrations' "$SCRIPT_PATH"
    grep -q -- '--network project_app' "$SCRIPT_PATH"
    grep -q 'DB_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:${PORT_DB}/${DB_NAME}' "$SCRIPT_PATH"
    grep -q 'yarn prisma migrate deploy --schema=src/db/schema.prisma' "$SCRIPT_PATH"
}

@test "deploy rehearsal executes disposable rollback probe" {
    grep -q 'ROLLBACK_PROBE_VERSION="${VERSION}-rollback-probe"' "$SCRIPT_PATH"
    grep -q 'run_rollback_probe' "$SCRIPT_PATH"
    grep -q 'ROLLBACK_CONFIRMED=true ./scripts/rollback.sh -v "${ROLLBACK_PROBE_VERSION}"' "$SCRIPT_PATH"
    grep -q 'rm -rf "/var/tmp/${ROLLBACK_PROBE_VERSION}"' "$SCRIPT_PATH"
}
