#!/bin/bash
# Creates a complete, read/copy-only pre-deployment recovery package locally.

set -euo pipefail
umask 077

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

ENV_FILE="${HERE}/../.env-prod"
OUTPUT_DIR=""
INCLUDE_LOGS=false
VERIFY_IMAGE_LOAD=false
BACKUP_SCRIPT="${BACKUP_SCRIPT:-${HERE}/backup.sh}"
SSH_BIN="${SSH_BIN:-ssh}"
DOCKER_BIN="${DOCKER_BIN:-docker}"

usage() {
    cat <<EOF
Usage: $0 [options]
  -e, --env-file FILE       Environment file to source (default: .env-prod)
  -o, --output-dir DIR      Local backup root (default: backups/\${SITE_IP})
      --include-logs        Include production logs in the runtime-state backup
      --verify-image-load   Load/inspect captured images and restore prior local image tags
  -h, --help                Show this help message

This command only reads/copies from production. It does not deploy, restart,
migrate, restore, prune, clean up, or modify the VPS.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -e | --env-file) ENV_FILE="$2"; shift 2 ;;
    -o | --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --include-logs) INCLUDE_LOGS=true; shift ;;
    --verify-image-load) VERIFY_IMAGE_LOAD=true; shift ;;
    -h | --help) usage; exit 0 ;;
    *) error "Unknown option: $1"; usage; exit 1 ;;
    esac
done

if [ ! -f "${ENV_FILE}" ]; then
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi
# shellcheck disable=SC1090
. "${ENV_FILE}"
: "${SITE_IP:?SITE_IP must be set in ${ENV_FILE}}"
PROJECT_DIR="${PROJECT_DIR:-/root/NLN}"
KEY_PATH="${HOME}/.ssh/id_rsa_${SITE_IP}"
REMOTE="root@${SITE_IP}"
BACKUP_ROOT="${OUTPUT_DIR:-${HERE}/../backups/${SITE_IP}}"

if [ ! -f "${KEY_PATH}" ]; then
    error "SSH key not found: ${KEY_PATH}"
    exit 1
fi

ssh_remote() {
    "${SSH_BIN}" -i "${KEY_PATH}" -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE}" "$@"
}

backup_args=(-e "${ENV_FILE}" --verify-restore --print-backup-dir)
[ -n "${OUTPUT_DIR}" ] && backup_args+=(--output-dir "${OUTPUT_DIR}")
[ "${INCLUDE_LOGS}" = true ] && backup_args+=(--include-logs)

header "Creating verified runtime-state backup"
backup_output=$("${BACKUP_SCRIPT}" "${backup_args[@]}")
printf '%s\n' "${backup_output}"
backup_dir=$(printf '%s\n' "${backup_output}" | sed -n 's/^backup_dir=//p' | tail -n 1)
if [ -z "${backup_dir}" ] || [ ! -d "${backup_dir}" ]; then
    error "Verified backup did not report an existing backup_dir."
    exit 1
fi

package_dir="${backup_dir}/production-recovery"
if [ -e "${package_dir}" ]; then
    error "Recovery package already exists: ${package_dir}"
    exit 1
fi
mkdir -p "${package_dir}"
chmod 700 "${package_dir}"
complete=false
cleanup_incomplete() {
    if [ "${complete}" != true ]; then
        rm -rf "${package_dir}"
    fi
}
trap cleanup_incomplete EXIT INT TERM

parent_manifest="${backup_dir}/manifest.txt"
if [ ! -f "${parent_manifest}" ] || [ -L "${parent_manifest}" ]; then
    error "Runtime-state backup manifest is missing or unsafe."
    exit 1
fi
runtime_archive_name=$(sed -n 's/^archive=//p' "${parent_manifest}" | tail -n 1)
runtime_archive_sha256=$(sed -n 's/^sha256=//p' "${parent_manifest}" | tail -n 1)
if ! [[ "${runtime_archive_name}" =~ ^runtime-state-[0-9]{14}\.tar\.gz$ ]] ||
    ! [[ "${runtime_archive_sha256}" =~ ^[0-9a-f]{64}$ ]] ||
    [ ! -f "${backup_dir}/${runtime_archive_name}" ] ||
    [ -L "${backup_dir}/${runtime_archive_name}" ]; then
    error "Runtime-state archive identity is missing or unsafe."
    exit 1
fi
actual_runtime_sha256=$(sha256sum "${backup_dir}/${runtime_archive_name}" | awk '{print $1}')
if [ "${actual_runtime_sha256}" != "${runtime_archive_sha256}" ]; then
    error "Runtime-state archive checksum does not match its manifest."
    exit 1
fi
{
    echo "runtime_state_archive=${runtime_archive_name}"
    echo "runtime_state_archive_sha256=${runtime_archive_sha256}"
    echo "runtime_state_manifest_sha256=$(sha256sum "${parent_manifest}" | awk '{print $1}')"
} >"${package_dir}/runtime-state-binding.txt"
chmod 600 "${package_dir}/runtime-state-binding.txt"

header "Capturing exact production release identity"
identity_script=$(cat <<EOF
set -eu
cd '${PROJECT_DIR}'
commit=\$(git rev-parse HEAD)
tracked_dirty=false
[ -n "\$(git status --porcelain --untracked-files=no)" ] && tracked_dirty=true
printf 'commit=%s\ntracked_dirty=%s\n' "\${commit}" "\${tracked_dirty}"
for container in nln_ui nln_server nln_db nln_redis; do
  docker inspect --format 'container={{.Name}}|image_id={{.Image}}|image_ref={{.Config.Image}}' "\${container}"
done
EOF
)
ssh_remote "${identity_script}" >"${package_dir}/production-identity.txt"
chmod 600 "${package_dir}/production-identity.txt"
if ! grep -Eq '^commit=[0-9a-f]{40}$' "${package_dir}/production-identity.txt"; then
    error "Production identity did not contain an exact Git commit."
    exit 1
fi
if ! grep -q '^tracked_dirty=false$' "${package_dir}/production-identity.txt"; then
    error "Production repository has tracked changes; refusing to qualify recovery package."
    exit 1
fi
if [ "$(grep -c '^container=' "${package_dir}/production-identity.txt")" -ne 4 ]; then
    error "Production identity did not describe all four required containers."
    exit 1
fi
for required_container in nln_ui nln_server nln_db nln_redis; do
    if ! grep -q "^container=/${required_container}|" "${package_dir}/production-identity.txt"; then
        error "Production identity is missing required container ${required_container}."
        exit 1
    fi
done

header "Copying production source, configuration, and compiled artifacts"
ssh_remote "cd '${PROJECT_DIR}' && git archive --format=tar HEAD | gzip -n" >"${package_dir}/production-source.tar.gz"
ssh_remote "cd '${PROJECT_DIR}' && tar -czf - docker-compose-prod.yml packages/ui/dist packages/server/dist packages/shared/dist packages/server/src/db/migrations packages/server/src/db/schema.prisma scripts" >"${package_dir}/application-artifacts.tar.gz"
gzip -t "${package_dir}/production-source.tar.gz"
gzip -t "${package_dir}/application-artifacts.tar.gz"
tar -tzf "${package_dir}/production-source.tar.gz" >/dev/null
tar -tzf "${package_dir}/application-artifacts.tar.gz" >/dev/null

header "Copying exact running production images"
image_ids=$(sed -n 's/^container=.*|image_id=\([^|]*\)|.*$/\1/p' "${package_dir}/production-identity.txt" | sort -u | paste -sd ' ' -)
if [ -z "${image_ids}" ]; then
    error "No running production image IDs were captured."
    exit 1
fi
for image_id in ${image_ids}; do
    if ! [[ "${image_id}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
        error "Production returned an invalid image ID."
        exit 1
    fi
done
ssh_remote "docker save ${image_ids} | gzip -n" >"${package_dir}/production-images.tar.gz"
gzip -t "${package_dir}/production-images.tar.gz"
tar -tzf "${package_dir}/production-images.tar.gz" >/dev/null

find "${package_dir}" -type f -exec chmod 600 {} +
(cd "${package_dir}" && sha256sum runtime-state-binding.txt production-identity.txt production-source.tar.gz application-artifacts.tar.gz production-images.tar.gz >SHA256SUMS)
chmod 600 "${package_dir}/SHA256SUMS"
(cd "${package_dir}" && sha256sum -c SHA256SUMS)

if [ "${VERIFY_IMAGE_LOAD}" = true ]; then
    header "Verifying captured images load locally"
    if ! command -v "${DOCKER_BIN}" >/dev/null 2>&1 || ! "${DOCKER_BIN}" info >/dev/null 2>&1; then
        error "A reachable local Docker daemon is required for --verify-image-load."
        exit 1
    fi
    local_tags="${package_dir}/.local-image-tags-before-load"
    : >"${local_tags}"
    while IFS= read -r image_ref; do
        if current_id=$("${DOCKER_BIN}" image inspect --format '{{.Id}}' "${image_ref}" 2>/dev/null); then
            printf '%s|%s\n' "${image_ref}" "${current_id}" >>"${local_tags}"
        else
            printf '%s|MISSING\n' "${image_ref}" >>"${local_tags}"
        fi
    done < <(sed -n 's/^container=.*|image_id=[^|]*|image_ref=//p' "${package_dir}/production-identity.txt" | sort -u)
    restore_local_tags() {
        while IFS='|' read -r image_ref prior_id; do
            if [ "${prior_id}" = MISSING ]; then
                "${DOCKER_BIN}" image rm "${image_ref}" >/dev/null 2>&1 || true
            else
                "${DOCKER_BIN}" tag "${prior_id}" "${image_ref}" >/dev/null 2>&1 || true
            fi
        done <"${local_tags}"
        rm -f "${local_tags}"
    }
    trap 'restore_local_tags; cleanup_incomplete' EXIT INT TERM
    gzip -dc "${package_dir}/production-images.tar.gz" | "${DOCKER_BIN}" load >/dev/null
    while IFS= read -r image_id; do
        "${DOCKER_BIN}" image inspect "${image_id}" >/dev/null
    done < <(printf '%s\n' ${image_ids})
    restore_local_tags
    trap cleanup_incomplete EXIT INT TERM
    printf 'verified_at=%s\nmethod=docker-load-and-inspect\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"${package_dir}/image-load-verification.txt"
    chmod 600 "${package_dir}/image-load-verification.txt"
    (cd "${package_dir}" && sha256sum image-load-verification.txt >>SHA256SUMS)
fi

{
    echo "package_type=production-pre-deployment-recovery"
    echo "format_version=1"
    echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "runtime_state_backup=$(basename "${backup_dir}")"
    echo "runtime_state_archive=${runtime_archive_name}"
    echo "runtime_state_archive_sha256=${runtime_archive_sha256}"
    echo "production_commit=$(sed -n 's/^commit=//p' "${package_dir}/production-identity.txt")"
    echo "tracked_dirty=false"
    echo "required_containers=nln_ui,nln_server,nln_db,nln_redis"
    echo "image_load_verified=${VERIFY_IMAGE_LOAD}"
    echo "qualification=passed"
} >"${package_dir}/manifest.txt"
chmod 600 "${package_dir}/manifest.txt"
(cd "${package_dir}" && sha256sum manifest.txt >>SHA256SUMS && sha256sum -c SHA256SUMS)

complete=true
trap - EXIT INT TERM
success "Qualified production recovery package created: ${package_dir}"
printf 'recovery_package=%s\n' "${package_dir}"
