#!/bin/bash
# Non-mutating production VPS health checks.
#
# This script only observes remote state and prints remediation recommendations.
# It must not run cleanup, package update, restart, prune, or delete commands.

set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"

ENV_FILE="${HERE}/../.env-prod"
DISK_MIN_PERCENT="${VPS_HEALTH_DISK_MIN_PERCENT:-15}"
DISK_MIN_GB="${VPS_HEALTH_DISK_MIN_GB:-5}"
BACKUP_WARN_COUNT="${VPS_HEALTH_BACKUP_WARN_COUNT:-5}"
BACKUP_WARN_GB="${VPS_HEALTH_BACKUP_WARN_GB:-20}"
LOG_WARN_GB="${VPS_HEALTH_LOG_WARN_GB:-1}"

usage() {
    cat <<EOF
Usage: $0 [options]
  -e, --env-file FILE       Environment file to source (default: .env-prod)
  -h, --help                Show this help message
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
    -e | --env-file)
        ENV_FILE="$2"
        shift 2
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
done

if [ -f "${ENV_FILE}" ]; then
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
else
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

if [ -z "${SITE_IP:-}" ] || [ -z "${PROJECT_DIR:-}" ]; then
    error "SITE_IP and PROJECT_DIR must be set in ${ENV_FILE}"
    exit 1
fi

REMOTE_SERVER="root@${SITE_IP}"
KEY_PATH="${HOME}/.ssh/id_rsa_${SITE_IP}"
MIN_KB=$((DISK_MIN_GB * 1024 * 1024))
BACKUP_WARN_KB=$((BACKUP_WARN_GB * 1024 * 1024))
LOG_WARN_KB=$((LOG_WARN_GB * 1024 * 1024))
RUNTIME_HEALTHCHECK_PATHS=$(runtime_state_shell_words runtime_state_healthcheck_paths)

if [ ! -f "${KEY_PATH}" ]; then
    error "SSH key not found: ${KEY_PATH}"
    error "Run ./scripts/keylessSsh.sh -e ${ENV_FILE} before deployment."
    exit 1
fi

REMOTE_SCRIPT=$(cat <<EOF
project_dir='${PROJECT_DIR}'
disk_min_percent='${DISK_MIN_PERCENT}'
disk_min_kb='${MIN_KB}'
backup_warn_count='${BACKUP_WARN_COUNT}'
backup_warn_kb='${BACKUP_WARN_KB}'
log_warn_kb='${LOG_WARN_KB}'

critical_count=0
warning_count=0

critical() {
  critical_count=\$((critical_count + 1))
  echo "CRITICAL|\$*"
}

warn() {
  warning_count=\$((warning_count + 1))
  echo "WARN|\$*"
}

ok() {
  echo "OK|\$*"
}

recommend() {
  echo "RECOMMEND|\$*"
}

if [ ! -d "\${project_dir}" ]; then
  critical "Project directory is missing: \${project_dir}"
  echo "SUMMARY|critical=\${critical_count}|warning=\${warning_count}"
  exit 0
fi

cd "\${project_dir}" || {
  critical "Could not enter project directory: \${project_dir}"
  echo "SUMMARY|critical=\${critical_count}|warning=\${warning_count}"
  exit 0
}

for path in ${RUNTIME_HEALTHCHECK_PATHS}; do
  if [ ! -e "\${path}" ]; then
    critical "Required runtime path is missing: \${path}"
  else
    ok "Required runtime path exists: \${path}"
  fi
done

if ! command -v docker >/dev/null 2>&1; then
  critical "Docker is not installed or not on PATH"
else
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon is reachable"
  else
    critical "Docker daemon is not reachable"
    recommend "Check Docker service: systemctl status docker"
  fi
fi

if ! command -v docker-compose >/dev/null 2>&1; then
  critical "docker-compose is not installed or not on PATH"
else
  ok "docker-compose is available"
fi

for container in nln_ui nln_server nln_db nln_redis; do
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^\${container}\$"; then
    ok "Container is running: \${container}"
  else
    critical "Expected production container is not running: \${container}"
    recommend "Inspect container state: docker ps -a --filter name=\${container}"
  fi
done

check_disk_path() {
  path="\$1"
  label="\$2"
  if [ ! -e "\${path}" ]; then
    warn "Disk check path does not exist: \${path}"
    return 0
  fi

  line=\$(df -Pk "\${path}" 2>/dev/null | awk 'NR==2 {print \$4 " " \$5 " " \$6}')
  if [ -z "\${line}" ]; then
    warn "Could not inspect disk space for \${path}"
    return 0
  fi

  avail_kb=\$(echo "\${line}" | awk '{print \$1}')
  used_pct=\$(echo "\${line}" | awk '{gsub(/%/, "", \$2); print \$2}')
  mount=\$(echo "\${line}" | awk '{print \$3}')
  free_pct=\$((100 - used_pct))

  if [ "\${free_pct}" -lt "\${disk_min_percent}" ] || [ "\${avail_kb}" -lt "\${disk_min_kb}" ]; then
    critical "Low disk space on \${label} (\${mount}): \${free_pct}% free, \${avail_kb} KB available"
    recommend "Review usage: df -h && du -sh /var/tmp/* 2>/dev/null | sort -h"
  else
    ok "Disk space is acceptable on \${label}: \${free_pct}% free"
  fi
}

check_disk_path "\${project_dir}" "project"
check_disk_path "/var/tmp" "deployment backup area"
[ -d /var/lib/docker ] && check_disk_path "/var/lib/docker" "Docker data"

backup_count=\$(find /var/tmp -mindepth 2 -maxdepth 2 -type d -name runtime-state 2>/dev/null | wc -l | tr -d ' ')
backup_kb=\$(du -sk /var/tmp/*/runtime-state 2>/dev/null | awk '{sum += \$1} END {print sum + 0}')
if [ "\${backup_count}" -gt "\${backup_warn_count}" ] || [ "\${backup_kb}" -gt "\${backup_warn_kb}" ]; then
  warn "Deployment backups may need cleanup: \${backup_count} runtime-state backups, \${backup_kb} KB runtime-state"
  recommend "Inventory first: ls -lh /var/tmp && du -sh /var/tmp/*/runtime-state 2>/dev/null"
  recommend "After confirming safe versions: remove old /var/tmp/<VERSION> directories manually"
else
  ok "Deployment backup inventory is within warning thresholds"
fi

if [ -d data/logs ]; then
  log_kb=\$(du -sk data/logs 2>/dev/null | awk '{print \$1 + 0}')
  if [ "\${log_kb}" -gt "\${log_warn_kb}" ]; then
    warn "Application logs are large: \${log_kb} KB"
    recommend "Inspect logs before cleanup: du -sh data/logs/* 2>/dev/null | sort -h"
  else
    ok "Application log size is within warning threshold"
  fi
fi

if command -v apt >/dev/null 2>&1; then
  update_count=\$(apt list --upgradable 2>/dev/null | sed '1d' | wc -l | tr -d ' ')
  if [ "\${update_count}" -gt 0 ]; then
    warn "System package updates are available: \${update_count}"
    recommend "Schedule maintenance window: apt update && apt upgrade"
  else
    ok "No package updates reported by apt"
  fi
fi

if command -v docker >/dev/null 2>&1; then
  docker system df 2>/dev/null | sed 's/^/INFO|Docker disk usage: /'
fi

echo "SUMMARY|critical=\${critical_count}|warning=\${warning_count}"
EOF
)

header "Running non-mutating VPS health checks"
if ! OUTPUT=$(ssh -i "${KEY_PATH}" -o BatchMode=yes -o ConnectTimeout=10 "${REMOTE_SERVER}" "${REMOTE_SCRIPT}"); then
    error "Could not run VPS health checks over SSH"
    exit 1
fi

echo "${OUTPUT}"

CRITICAL_COUNT=$(echo "${OUTPUT}" | sed -n 's/^SUMMARY|critical=\([0-9][0-9]*\).*/\1/p' | tail -n 1)
CRITICAL_COUNT="${CRITICAL_COUNT:-1}"

if [ "${CRITICAL_COUNT}" -gt 0 ]; then
    error "VPS health check failed with ${CRITICAL_COUNT} critical issue(s). Deployment should not proceed."
    exit 1
fi

success "VPS health check passed with no critical issues."
