#!/bin/bash
# Installs ignored Bats helper libraries needed by project-owned script tests.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
HELPERS_DIR="${HERE}/helpers"

install_helper() {
    local name="$1"
    local repo="$2"
    local sha="$3"
    local target="${HELPERS_DIR}/${name}"

    if [ -f "${target}/load.bash" ]; then
        return 0
    fi

    local tmp
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' RETURN

    rm -rf "${target}"
    mkdir -p "${HELPERS_DIR}"
    git clone --quiet "${repo}" "${tmp}/${name}"
    git -C "${tmp}/${name}" checkout --quiet "${sha}"
    rm -rf "${tmp}/${name}/.git"
    mv "${tmp}/${name}" "${target}"
}

install_helper bats-support https://github.com/bats-core/bats-support.git 9bf10e876dd6b624fe44423f0b35e064225f7556
install_helper bats-assert https://github.com/bats-core/bats-assert.git e2d855bc78619ee15b0c702b5c30fb074101159f
