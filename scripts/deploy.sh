#!/bin/bash
# NOTE 1: Run outside of Docker container, on production server
# NOTE 2: First run build.sh on development server
# NOTE 3: If docker-compose file was changed since the last build, you should prune the containers and images before running this script.
# Finishes up the deployment process, which was started by build.sh:
# 1. Checks if Nginx containers are running
# 2. Copies current runtime files and a logical database dump to a safe location.
# 3. Runs git fetch and git pull to get the latest changes.
# 4. Verifies transferred artifacts.
# 5. Moves build created by build.sh to the correct location.
# 6. Restarts docker containers
#
# Arguments (all optional):
# -v: Version number to use (e.g. "1.0.0")
# -n: Nginx proxy location (e.g. "/root/NginxSSLReverseProxy")
# -h: Show this help message
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"
# shellcheck source=scripts/runtime-state.sh
. "${HERE}/runtime-state.sh"
# shellcheck source=scripts/env-defaults.sh
. "${HERE}/env-defaults.sh"
default_env_apply

# Read arguments
VERSION=""
NGINX_LOCATION="${NGINX_LOCATION:-}"
while [ $# -gt 0 ]; do
    case "$1" in
    -v | --version)
        VERSION="$2"
        shift 2
        ;;
    -n | --nginx-location)
        NGINX_LOCATION="$2"
        shift 2
        ;;
    -h | --help)
        echo "Usage: $0 [-v VERSION] [-n NGINX_LOCATION] [-h]"
        echo "  -v --version: Version number to use (e.g. \"1.0.0\")"
        echo "  -n --nginx-location: Nginx proxy location (e.g. \"/root/NginxSSLReverseProxy\")"
        echo "  -h --help: Show this help message"
        exit 0
        ;;
    *)
        error "Unknown option: $1"
        echo "Usage: $0 [-v VERSION] [-n NGINX_LOCATION] [-h]"
        exit 1
        ;;
    esac
done

# Extract the current version number from the package.json file
CURRENT_VERSION=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${HERE}/../packages/ui/package.json" | head -1)
# Ask for version number, if not supplied in arguments
if [ -z "$VERSION" ]; then
    prompt "What version number do you want to deploy? (current is ${CURRENT_VERSION}). Leave blank if keeping the same version number."
    warning "WARNING: Keeping the same version number will overwrite the previous build AND database backup."
    read -r ENTERED_VERSION
    # If version entered, set version
    if [ -n "$ENTERED_VERSION" ]; then
        VERSION=$ENTERED_VERSION
    else
        VERSION=$CURRENT_VERSION
    fi
fi
validate_deploy_version "${VERSION}"

if [ "${DEPLOY_REHEARSAL:-false}" = "true" ]; then
    warning "Deploy rehearsal mode enabled; skipping proxy bootstrap checks."
fi

# Check if nginx-proxy and nginx-proxy-le are running
if [ "${DEPLOY_REHEARSAL:-false}" != "true" ] && { [ ! "$(docker ps -q -f name=nginx-proxy)" ] || [ ! "$(docker ps -q -f name=nginx-proxy-le)" ]; }; then
    error "Proxy containers are not running!"
    if [ -z "$NGINX_LOCATION" ]; then
        while true; do
            prompt "Enter path to proxy container directory (defaults to /root/NginxSSLReverseProxy):"
            read -r NGINX_LOCATION
            if [ -z "$NGINX_LOCATION" ]; then
                NGINX_LOCATION="/root/NginxSSLReverseProxy"
            fi

            if [ -d "${NGINX_LOCATION}" ]; then
                break
            else
                error "Not found at that location."
                prompt "Do you want to try again? Say no to clone and set up proxy containers (yes/no):"
                read -r TRY_AGAIN
                if [[ "$TRY_AGAIN" =~ ^(no|n)$ ]]; then
                    info "Proceeding with cloning..."
                    break
                fi
            fi
        done
    fi

    # Check if the NginxSSLReverseProxy directory exists
    if [ ! -d "${NGINX_LOCATION}" ]; then
        info "NginxSSLReverseProxy not installed. Cloning and setting up..."
        git clone --depth 1 --branch main https://github.com/MattHalloran/NginxSSLReverseProxy.git "${NGINX_LOCATION}"
        chmod +x "${NGINX_LOCATION}"/scripts/*
        "${NGINX_LOCATION}/scripts/fullSetup.sh"
    fi

    # Check if ${NGINX_LOCATION}/docker-compose.yml or ${NGINX_LOCATION}/docker-compose.yaml exists
    if [ -f "${NGINX_LOCATION}/docker-compose.yml" ] || [ -f "${NGINX_LOCATION}/docker-compose.yaml" ]; then
        info "Starting proxy containers..."
        cd "${NGINX_LOCATION}" && docker-compose up -d
    else
        error "Could not find docker-compose.yml file in ${NGINX_LOCATION}"
        exit 1
    fi
fi

TMP_DIR="/var/tmp/${VERSION}"
STAGING_DIR="${TMP_DIR}/staged-artifacts"
PREVIOUS_ARTIFACTS_DIR="${TMP_DIR}/previous-artifacts"
PREVIOUS_IMAGES_ARCHIVE="${TMP_DIR}/previous-docker-images.tar"
COMMIT_FILE="${TMP_DIR}/deploy-commit.txt"
DEPLOY_MANIFEST="${TMP_DIR}/deploy-manifest.sha256"

verify_host_prerequisites() {
    header "Verifying host prerequisites"

    local missing=()
    for cmd in git docker docker-compose tar sha256sum curl; do
        if ! command -v "${cmd}" >/dev/null 2>&1; then
            missing+=("${cmd}")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing required deploy command(s): ${missing[*]}"
        error "Run setup/provisioning separately before deploying."
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not reachable. Run setup/provisioning separately before deploying."
        exit 1
    fi

    success "Host prerequisites are available"
}

verify_deploy_manifest() {
    header "Verifying transferred artifact checksums"

    if [ ! -f "${DEPLOY_MANIFEST}" ]; then
        error "Deploy checksum manifest not found: ${DEPLOY_MANIFEST}"
        error "Rebuild this version with build.sh before deploying."
        exit 1
    fi

    if ! (cd "${TMP_DIR}" && sha256sum -c "$(basename "${DEPLOY_MANIFEST}")"); then
        error "Deploy artifact checksum verification failed."
        exit 1
    fi

    success "Transferred artifact checksums verified"
}

verify_repository_state() {
    header "Validating repository state"

    if [ ! -f "${COMMIT_FILE}" ]; then
        error "Expected commit metadata not found: ${COMMIT_FILE}"
        error "Rebuild this version with build.sh before deploying."
        exit 1
    fi

    local expected_commit current_changes actual_commit
    expected_commit=$(tr -d '[:space:]' <"${COMMIT_FILE}")
    if [ -z "${expected_commit}" ]; then
        error "Expected commit metadata is empty: ${COMMIT_FILE}"
        exit 1
    fi

    current_changes=$(git status --porcelain --untracked-files=no)
    if [ -n "${current_changes}" ]; then
        error "Remote repository has tracked changes. Deployment aborted before artifact changes."
        git status --short --untracked-files=no
        exit 1
    fi

    actual_commit=$(git rev-parse HEAD)
    if [ "${DEPLOY_REHEARSAL:-false}" = "true" ]; then
        if [ "${actual_commit}" != "${expected_commit}" ]; then
            error "Rehearsal commit does not match built artifact commit."
            error "Expected: ${expected_commit}"
            error "Actual:   ${actual_commit}"
            exit 1
        fi
        success "Rehearsal repository is at expected commit ${expected_commit}"
        return 0
    fi

    git fetch
    if ! git pull --ff-only; then
        error "Could not fast-forward remote repository."
        error "Deployment aborted before artifact changes."
        exit 1
    fi

    actual_commit=$(git rev-parse HEAD)
    if [ "${actual_commit}" != "${expected_commit}" ]; then
        error "Remote commit does not match built artifact commit."
        error "Expected: ${expected_commit}"
        error "Actual:   ${actual_commit}"
        exit 1
    fi

    success "Repository is at expected commit ${expected_commit}"
}

create_runtime_state_backup() {
    local backup_dir="${TMP_DIR}/runtime-state"
    local manifest="${backup_dir}/manifest.txt"
    local db_dump
    db_dump="$(runtime_state_database_dump_path)"

    if [ -f "${manifest}" ]; then
        info "Runtime-state backup already exists at ${backup_dir}; not overwriting it"
        return 0
    fi

    header "Creating runtime-state backup"
    mkdir -p "${backup_dir}"

    {
        echo "backup_type=runtime-state"
        echo "version=${VERSION}"
        echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "project_dir=$(cd "${HERE}/.." && pwd)"
        echo "include_logs=false"
        echo "paths:"
    } >"${manifest}"

    info "Creating logical Postgres dump..."
    mkdir -p "${backup_dir}/$(dirname "${db_dump}")"
    set -a
    # shellcheck disable=SC1090
    . "${TMP_DIR}/.env-prod"
    set +a
    if ! docker exec -e PGPASSWORD="${DB_PASSWORD}" nln_db pg_dump -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges >"${backup_dir}/${db_dump}"; then
        error "Could not create logical Postgres dump"
        exit 1
    fi
    if [ ! -s "${backup_dir}/${db_dump}" ]; then
        error "Logical Postgres dump is missing or empty: ${db_dump}"
        exit 1
    fi
    echo "- ${db_dump}" >>"${manifest}"

    local path
    while IFS= read -r path; do
        if [ ! -e "${HERE}/../${path}" ]; then
            error "Critical runtime path is missing: ${path}"
            error "Deployment aborted before container changes."
            exit 1
        fi

        mkdir -p "${backup_dir}/$(dirname "${path}")"
        if ! cp -rp "${HERE}/../${path}" "${backup_dir}/${path}"; then
            error "Could not back up runtime path: ${path}"
            exit 1
        fi
        echo "- ${path}" >>"${manifest}"
    done <<EOF
$(runtime_state_critical_paths)
EOF

    while IFS= read -r path; do
        if [ -e "${HERE}/../${path}" ]; then
            mkdir -p "${backup_dir}/$(dirname "${path}")"
            cp -rp "${HERE}/../${path}" "${backup_dir}/${path}"
            echo "- ${path}" >>"${manifest}"
        fi
    done <<EOF
$(runtime_state_optional_paths)
EOF

    shopt -s nullglob
    for jwt_file in "${HERE}/../jwt_"*; do
        local name
        name=$(basename "${jwt_file}")
        cp -rp "${jwt_file}" "${backup_dir}/${name}"
        echo "- ${name}" >>"${manifest}"
    done
    shopt -u nullglob

    if ! runtime_state_validate_backup "${backup_dir}"; then
        error "Runtime-state backup validation failed"
        exit 1
    fi

    success "Runtime-state backup created at ${backup_dir}"
}

print_deploy_diagnostics() {
    warning "Recent container logs:"
    for container in nln_ui nln_server nginx-proxy; do
        echo "---- ${container} ----"
        docker logs --tail 80 "${container}" 2>&1 || true
    done
}

print_manual_recovery_guidance() {
    warning "Manual recovery options:"
    warning "  Full pre-deploy runtime-state restore dry-run: cd '${HERE}/..' && ./scripts/restore-runtime-state.sh -v '${VERSION}'"
    warning "  Full pre-deploy runtime-state restore execute: cd '${HERE}/..' && ./scripts/restore-runtime-state.sh -v '${VERSION}' --execute"
    warning "  Older known-good app/database rollback: cd '${HERE}/..' && ./scripts/rollback.sh -v '<PREVIOUS_VERSION>'"
}

verify_public_endpoints() {
    header "Verifying public endpoints"

    local ui_url server_health_url attempt
    ui_url="${UI_URL:-}"
    server_health_url="${SERVER_URL:-}"

    if [ -z "${ui_url}" ] || [ -z "${server_health_url}" ]; then
        warning "UI_URL or SERVER_URL is not set; skipping public endpoint verification."
        return 0
    fi

    server_health_url="${server_health_url%/}/healthcheck"

    for attempt in {1..12}; do
        if curl -fsS "${ui_url}" >/dev/null && curl -fsS "${server_health_url}" >/dev/null; then
            success "Public UI and API healthcheck endpoints are responding"
            return 0
        fi
        info "Public endpoint verification attempt ${attempt}/12 failed; retrying..."
        sleep 5
    done

    error "Public endpoint verification failed."
    docker ps --format 'table {{.Names}}\t{{.Status}}'
    print_deploy_diagnostics
    attempt_failed_deploy_recovery "public endpoint verification failed"
    exit 1
}

stage_artifacts() {
    header "Staging build artifacts"

    DIRECTORIES=("packages/ui/dist"
        "packages/server/dist"
        "packages/shared/dist")

    rm -rf "${STAGING_DIR}"
    mkdir -p "${STAGING_DIR}"

    for dir in "${DIRECTORIES[@]}"; do
        TAR_NAME=$(echo "${dir}" | tr '/' '.')
        TAR_PATH="${TMP_DIR}/${TAR_NAME}.tar.gz"
        STAGED_PATH="${STAGING_DIR}/${dir}"

        if [ ! -f "${TAR_PATH}" ]; then
            error "Could not find tar for ${dir} at ${TAR_PATH}"
            exit 1
        fi

        info "Extracting ${dir} into staging"
        mkdir -p "${STAGED_PATH}"
        if ! tar -xzf "${TAR_PATH}" -C "${STAGED_PATH}"; then
            error "Failed to extract ${dir} from ${TAR_PATH}"
            exit 1
        fi
    done

    success "Build artifacts staged at ${STAGING_DIR}"
}

swap_staged_artifacts() {
    header "Swapping staged artifacts into place"

    local dir current_path staged_path previous_path
    rm -rf "${PREVIOUS_ARTIFACTS_DIR}"
    mkdir -p "${PREVIOUS_ARTIFACTS_DIR}"

    for dir in "${DIRECTORIES[@]}"; do
        current_path="${HERE}/../${dir}"
        staged_path="${STAGING_DIR}/${dir}"
        previous_path="${PREVIOUS_ARTIFACTS_DIR}/${dir}"

        if [ ! -d "${staged_path}" ]; then
            error "Staged artifact is missing: ${staged_path}"
            exit 1
        fi

        mkdir -p "$(dirname "${previous_path}")"
        if [ -e "${current_path}" ]; then
            mv "${current_path}" "${previous_path}"
        fi

        mkdir -p "$(dirname "${current_path}")"
        if ! mv "${staged_path}" "${current_path}"; then
            error "Could not move staged artifact into place: ${dir}"
            if [ -e "${previous_path}" ] && [ ! -e "${current_path}" ]; then
                mv "${previous_path}" "${current_path}" || true
            fi
            exit 1
        fi
    done
}

backup_current_images() {
    header "Backing up current application Docker images"

    local existing_images=()
    if docker image inspect nln_ui:prod >/dev/null 2>&1; then
        existing_images+=(nln_ui:prod)
    fi
    if docker image inspect nln_server:prod >/dev/null 2>&1; then
        existing_images+=(nln_server:prod)
    fi

    if [ ${#existing_images[@]} -eq 0 ]; then
        warning "No current nln_ui:prod or nln_server:prod images found to back up."
        return 0
    fi

    if ! docker save -o "${PREVIOUS_IMAGES_ARCHIVE}" "${existing_images[@]}"; then
        error "Failed to back up current application Docker images."
        exit 1
    fi

    success "Current application Docker images backed up at ${PREVIOUS_IMAGES_ARCHIVE}"
}

restore_previous_artifacts() {
    local restored=false dir current_path previous_path

    if [ ! -d "${PREVIOUS_ARTIFACTS_DIR}" ]; then
        warning "Previous artifact directory is missing; cannot restore build artifacts automatically."
        return 1
    fi

    header "Restoring previous build artifacts"
    for dir in "${DIRECTORIES[@]}"; do
        current_path="${HERE}/../${dir}"
        previous_path="${PREVIOUS_ARTIFACTS_DIR}/${dir}"

        if [ ! -e "${previous_path}" ]; then
            warning "Previous artifact path is missing: ${previous_path}"
            continue
        fi

        rm -rf "${current_path}"
        mkdir -p "$(dirname "${current_path}")"
        cp -rp "${previous_path}" "${current_path}"
        restored=true
    done

    if [ "${restored}" = true ]; then
        success "Previous build artifacts restored"
        return 0
    fi

    warning "No previous build artifacts were restored"
    return 1
}

restore_previous_images() {
    if [ ! -f "${PREVIOUS_IMAGES_ARCHIVE}" ]; then
        warning "Previous Docker image archive is missing; cannot restore images automatically."
        return 1
    fi

    header "Restoring previous application Docker images"
    if docker load -i "${PREVIOUS_IMAGES_ARCHIVE}"; then
        success "Previous application Docker images restored"
        return 0
    fi

    warning "Previous application Docker image restore failed"
    return 1
}

attempt_failed_deploy_recovery() {
    local reason="$1"

    warning "Deployment verification failed: ${reason}"
    warning "Attempting non-database recovery by restoring previous artifacts and application images."

    restore_previous_artifacts || true
    restore_previous_images || true

    if docker-compose --env-file "${TMP_DIR}/.env-prod" -f "${HERE}/../docker-compose-prod.yml" up -d --force-recreate; then
        warning "Previous artifacts/images were restarted. Verify the site and database state before retrying deployment."
    else
        error "Automatic non-database recovery could not restart containers."
    fi

    print_manual_recovery_guidance
}

# Validate environment configuration from the temporary directory
if [ -f "${TMP_DIR}/.env-prod" ]; then
    header "Validating environment configuration"
    if ! "${HERE}/validate-env.sh" "${TMP_DIR}/.env-prod"; then
        error "Environment validation failed. Deployment aborted."
        exit 1
    fi
    success "Environment configuration is valid"
    set -a
    # shellcheck disable=SC1090
    . "${TMP_DIR}/.env-prod"
    set +a
else
    error "Environment file not found at ${TMP_DIR}/.env-prod"
    error "This should have been created by build.sh. Aborting deployment."
    exit 1
fi

cd "${HERE}/.."
verify_host_prerequisites
verify_repository_state
verify_deploy_manifest
stage_artifacts
create_runtime_state_backup
backup_current_images

if [ "${DEPLOY_REHEARSAL:-false}" = "true" ]; then
    warning "Deploy rehearsal mode enabled; host setup remains disabled."
fi

# Transfer and load Docker images
if [ -f "${TMP_DIR}/production-docker-images.tar.gz" ]; then
    info "Loading Docker images from ${TMP_DIR}/production-docker-images.tar.gz"
    if ! docker load -i "${TMP_DIR}/production-docker-images.tar.gz"; then
        error "Failed to load Docker images from ${TMP_DIR}/production-docker-images.tar.gz"
        exit 1
    fi
else
    error "Could not find Docker images archive at ${TMP_DIR}/production-docker-images.tar.gz"
    exit 1
fi

# Stop docker containers
info "Stopping docker containers..."
if ! runtime_state_require_backup_before_container_change "${TMP_DIR}/runtime-state"; then
    exit 1
fi
if ! docker-compose --env-file "${TMP_DIR}/.env-prod" -f "${HERE}/../docker-compose-prod.yml" down; then
    error "Failed to stop docker containers"
    exit 1
fi

swap_staged_artifacts

# Restart docker containers.
info "Restarting docker containers..."
if ! docker-compose --env-file "${TMP_DIR}/.env-prod" -f "${HERE}/../docker-compose-prod.yml" up -d; then
    error "Failed to restart docker containers"
    print_deploy_diagnostics
    attempt_failed_deploy_recovery "docker-compose up failed"
    exit 1
fi

# Wait for containers to become healthy
info "Waiting for containers to become healthy..."
TIMEOUT=300  # 5 minutes timeout
ELAPSED=0
CHECK_INTERVAL=5

# Get list of containers that should be running
EXPECTED_CONTAINERS=("nln_ui" "nln_server" "nln_db" "nln_redis")

while [ $ELAPSED -lt $TIMEOUT ]; do
    ALL_HEALTHY=true
    CONTAINER_STATUS=""

    for container in "${EXPECTED_CONTAINERS[@]}"; do
        # Check if container exists and is running
        if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            ALL_HEALTHY=false
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: NOT RUNNING"
            continue
        fi

        # Get container health status
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "no-healthcheck")

        if [ "$HEALTH" = "healthy" ]; then
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✓ healthy"
        elif [ "$HEALTH" = "no-healthcheck" ]; then
            # For containers without health checks (like redis in some configs), check if running
            STATE=$(docker inspect --format='{{.State.Status}}' "${container}")
            if [ "$STATE" = "running" ]; then
                CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✓ running (no health check)"
            else
                ALL_HEALTHY=false
                CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✗ ${STATE}"
            fi
        elif [ "$HEALTH" = "starting" ]; then
            ALL_HEALTHY=false
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ⏳ starting..."
        else
            ALL_HEALTHY=false
            CONTAINER_STATUS="${CONTAINER_STATUS}\n  ${container}: ✗ ${HEALTH}"
        fi
    done

    if [ "$ALL_HEALTHY" = true ]; then
        echo -e "${CONTAINER_STATUS}"
        success "✅ All containers are healthy!"
        break
    fi

    # Print status every 15 seconds
    if [ $((ELAPSED % 15)) -eq 0 ]; then
        echo -e "Container status after ${ELAPSED}s:${CONTAINER_STATUS}"
    fi

    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    error "❌ Timeout waiting for containers to become healthy after ${TIMEOUT} seconds"
    echo -e "Final container status:${CONTAINER_STATUS}"
    echo ""
    error "Deployment may have failed. Please check container logs:"
    for container in "${EXPECTED_CONTAINERS[@]}"; do
        echo "  docker logs ${container}"
    done
    attempt_failed_deploy_recovery "container health timeout"
    exit 1
fi

# Additional verification: Check if server is responding
info "Verifying server is responding..."
SERVER_HEALTHY=false
for _ in {1..10}; do
    if docker exec nln_server wget -q --spider "http://localhost:${PORT_SERVER}/healthcheck" 2>/dev/null; then
        SERVER_HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$SERVER_HEALTHY" = false ]; then
    error "Server healthcheck endpoint is not responding."
    print_deploy_diagnostics
    attempt_failed_deploy_recovery "internal server healthcheck failed"
    exit 1
else
    success "✅ Server healthcheck endpoint is responding"
fi

verify_public_endpoints

success "Done! Deployment completed successfully."
