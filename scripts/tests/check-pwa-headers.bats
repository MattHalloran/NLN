#!/usr/bin/env bats
bats_require_minimum_version 1.5.0
load '__testHelper.bash'

SCRIPT_PATH="$BATS_TEST_DIRNAME/../check-pwa-headers.sh"

write_env_file() {
    ENV_FILE="${BATS_TMPDIR}/.env-prod"
    cat >"${ENV_FILE}" <<EOF
UI_URL=https://example.test/
EOF
}

install_curl_stub() {
    cat >"${BATS_MOCK_BINDIR}/curl" <<'EOF'
#!/usr/bin/env bash
url="${*: -1}"

if [[ "$*" != *" -D - "* ]]; then
  case "${url}" in
    */service-worker.js)
      if [[ "${NO_ENTRY_CHUNK:-false}" = "true" ]]; then
        printf '%s\n' 'const precache = [{"url":"./manifest.json","revision":"1"}] ?? [];'
        exit 0
      fi
      printf '%s\n' 'const precache = [{"url":"./assets/index-AbC_123.js","revision":"1"}] ?? [];'
      exit 0
      ;;
  esac
fi

cache_control="no-cache, no-store, must-revalidate"
case "${url}" in
  */assets/index-AbC_123.js)
    cache_control="public, max-age=31536000, immutable"
    ;;
esac

if [[ "${BAD_HEADER:-false}" = "true" && "${url}" == */service-worker.js ]]; then
  cache_control="public, max-age=31536000, immutable"
fi

printf 'HTTP/2 200\r\n'
printf 'cache-control: %s\r\n' "${cache_control}"
printf 'content-type: text/plain\r\n'
printf '\r\n'
exit 0
EOF
    chmod +x "${BATS_MOCK_BINDIR}/curl"
}

setup() {
    mkdir -p "${BATS_MOCK_BINDIR}"
    write_env_file
    install_curl_stub
}

teardown() {
    rm -rf "${BATS_TMPDIR}"
}

@test "checks no-store app shell headers and immutable discovered entry chunk" {
    run "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 0
    assert_output --partial "/service-worker.js Cache-Control matches"
    assert_output --partial "/assets/index-AbC_123.js Cache-Control matches: public, max-age=31536000, immutable"
    assert_output --partial "Deployed PWA/static cache headers match"
}

@test "allows explicit URL without env file" {
    run "$SCRIPT_PATH" --url "https://example.test"

    assert_equal "$status" 0
    assert_output --partial "Checking deployed PWA/static cache headers at https://example.test"
}

@test "fails on production header drift" {
    run env BAD_HEADER=true "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "/service-worker.js Cache-Control mismatch"
    assert_output --partial "Expected: no-cache, no-store, must-revalidate"
    assert_output --partial "Actual:   public, max-age=31536000, immutable"
}

@test "fails clearly when service worker does not expose the entry chunk" {
    run env NO_ENTRY_CHUNK=true "$SCRIPT_PATH" -e "$ENV_FILE"

    assert_equal "$status" 1
    assert_output --partial "Could not find the hashed app entry chunk in /service-worker.js"
}
