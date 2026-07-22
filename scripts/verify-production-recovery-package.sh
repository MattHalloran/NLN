#!/bin/bash
# Verifies an existing production recovery package without contacting production.

set -euo pipefail

if [ $# -ne 1 ] || [ ! -d "$1" ]; then
    echo "Usage: $0 <production-recovery-directory>" >&2
    exit 2
fi

PACKAGE=$(cd "$1" && pwd)
required=(manifest.txt runtime-state-binding.txt production-identity.txt production-source.tar.gz application-artifacts.tar.gz production-images.tar.gz SHA256SUMS)
for file in "${required[@]}"; do
    if [ ! -f "${PACKAGE}/${file}" ] || [ -L "${PACKAGE}/${file}" ]; then
        echo "Recovery package is missing a safe regular file: ${file}" >&2
        exit 1
    fi
done
if [ "$(stat -c %a "${PACKAGE}")" != 700 ]; then
    echo "Recovery package directory must be mode 0700." >&2
    exit 1
fi
if find "${PACKAGE}" -type f ! -perm 600 -print -quit | grep -q .; then
    echo "Recovery package contains a file broader than mode 0600." >&2
    exit 1
fi
grep -q '^package_type=production-pre-deployment-recovery$' "${PACKAGE}/manifest.txt"
grep -q '^format_version=1$' "${PACKAGE}/manifest.txt"
grep -q '^qualification=passed$' "${PACKAGE}/manifest.txt"
runtime_archive=$(sed -n 's/^runtime_state_archive=//p' "${PACKAGE}/runtime-state-binding.txt")
runtime_sha=$(sed -n 's/^runtime_state_archive_sha256=//p' "${PACKAGE}/runtime-state-binding.txt")
[[ "${runtime_archive}" =~ ^runtime-state-[0-9]{14}\.tar\.gz$ ]]
[[ "${runtime_sha}" =~ ^[0-9a-f]{64}$ ]]
[ -f "${PACKAGE}/../${runtime_archive}" ] && [ ! -L "${PACKAGE}/../${runtime_archive}" ]
printf '%s  %s\n' "${runtime_sha}" "${PACKAGE}/../${runtime_archive}" | sha256sum -c -
commit=$(sed -n 's/^production_commit=//p' "${PACKAGE}/manifest.txt")
[[ "${commit}" =~ ^[0-9a-f]{40}$ ]]
grep -q "^commit=${commit}$" "${PACKAGE}/production-identity.txt"
grep -q '^tracked_dirty=false$' "${PACKAGE}/production-identity.txt"
for container in nln_ui nln_server nln_db nln_redis; do
    grep -q "^container=/${container}|image_id=sha256:[0-9a-f]\{64\}|image_ref=" "${PACKAGE}/production-identity.txt"
done
(cd "${PACKAGE}" && sha256sum -c SHA256SUMS)
for archive in production-source.tar.gz application-artifacts.tar.gz production-images.tar.gz; do
    gzip -t "${PACKAGE}/${archive}"
    tar -tzf "${PACKAGE}/${archive}" >/dev/null
done
echo "Production recovery package verification passed: ${PACKAGE}"
