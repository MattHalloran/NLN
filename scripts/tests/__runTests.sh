#!/bin/bash
# Runs project-owned top-level *.bats files and provides a summary.
# Vendored helper test suites under scripts/tests/helpers are intentionally not run.

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "${HERE}/../utils.sh"

"${HERE}/bootstrap-bats-helpers.sh"

total_tests=0
total_failures=0
test_files=("${HERE}"/*.bats)

header "Running bats tests..."

if [ ! -e "${test_files[0]}" ]; then
    info "No top-level bats tests found in ${HERE}"
    exit 0
fi

for test_file in "${test_files[@]}"; do
    # Run bats with TAP output and capture it
    output=$(bats --tap "${test_file}")
    exit_code=$?

    # If the bats command failed, consider it a failure
    if [ $exit_code -ne 0 ] && ! echo "${output}" | grep -q "^not ok"; then
        error "Failed to run test: ${test_file}. Got exit code: ${exit_code}"
        total_failures=$((total_failures + 1))
        continue
    fi

    # Count tests and failures
    tests=$(echo "${output}" | grep -c "^ok\|^not ok")
    failures=$(echo "${output}" | grep -c "^not ok")

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
