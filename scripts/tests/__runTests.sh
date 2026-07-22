#!/bin/bash
# Runs project-owned top-level *.bats files and provides a summary.
# Vendored helper test suites under scripts/tests/helpers are intentionally not run.

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "${HERE}/../utils.sh"

"${HERE}/bootstrap-bats-helpers.sh"

total_tests=0
total_failures=0
test_files=("${HERE}"/*.bats)
per_file_timeout_seconds="${BATS_TEST_TIMEOUT_SECONDS:-300}"
output_file=$(mktemp)

cleanup() {
    rm -f "${output_file}"
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

if ! [[ "${per_file_timeout_seconds}" =~ ^[1-9][0-9]*$ ]]; then
    error "BATS_TEST_TIMEOUT_SECONDS must be a positive integer."
    exit 2
fi

if ! command -v timeout >/dev/null 2>&1; then
    error "The timeout command is required to run script tests safely."
    exit 2
fi

header "Running bats tests..."

if [ ! -e "${test_files[0]}" ]; then
    info "No top-level bats tests found in ${HERE}"
    exit 0
fi

for test_file in "${test_files[@]}"; do
    info "Running $(basename "${test_file}") (timeout: ${per_file_timeout_seconds}s)"

    # Capture each file independently so a timeout or abrupt Bats failure still
    # leaves useful output and cannot prevent the remaining files from running.
    : >"${output_file}"
    timeout --foreground "${per_file_timeout_seconds}s" \
        bats --tap "${test_file}" >"${output_file}" 2>&1
    exit_code=$?
    output=$(<"${output_file}")

    # If the bats command failed, consider it a failure
    if [ $exit_code -ne 0 ] && ! echo "${output}" | grep -q "^not ok"; then
        if [ $exit_code -eq 124 ]; then
            error "Timed out after ${per_file_timeout_seconds}s: ${test_file}"
        else
            error "Failed to run test: ${test_file}. Got exit code: ${exit_code}"
        fi
        if [ -n "${output}" ]; then
            echo "${output}"
        fi
        total_failures=$((total_failures + 1))
        continue
    fi

    # Count tests and failures
    tests=$(echo "${output}" | grep -cE "^(ok|not ok)" || true)
    failures=$(echo "${output}" | grep -c "^not ok" || true)

    # Add to totals
    total_tests=$((total_tests + tests))
    total_failures=$((total_failures + failures))

    # Print the original output
    echo "${output}"
done

# Print summary
echo ""
info "Total tests run: ${total_tests}"
if [ ${total_failures} -eq 0 ]; then
    success "All tests passed successfully!"
else
    error "Total failures: ${total_failures}"
fi

# Exit with appropriate code
if [ ${total_failures} -eq 0 ]; then
    exit 0
else
    exit 1
fi
