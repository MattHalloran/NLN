#!/bin/bash
# NOTE: Run outside of Docker container
# Prepares project for deployment to VPS:
# 1. Asks for version number, and updates all package.json files accordingly.
# 2. Builds the React app, making sure to include environment variables and post-build commands.
# 3. Copies the build to the VPS, under a temporary directory.
#
# Arguments (all optional):
# -v: Version number to use (e.g. "1.0.0")
# -d: Deploy to VPS (y/N)
# -e: .env file location (e.g. "/root/my-folder/.env"). Defaults to .env-prod
# -h: Show this help message
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck disable=SC1091
. "${HERE}/utils.sh"

# Read arguments
ENV_FILE="${HERE}/../.env-prod"
VERSION=""
DEPLOY=""
TEST="${TEST:-false}"
BUILD_INCLUDE_BASE_IMAGES="${BUILD_INCLUDE_BASE_IMAGES:-false}"
TAR_FILES=()
COMMIT_FILE=""
MANIFEST_FILE=""
UI_ENV_FILE=""

cleanup_build_artifacts() {
    if [ ${#TAR_FILES[@]} -gt 0 ]; then
        rm -f "${TAR_FILES[@]}"
    fi
    if [ -n "${COMMIT_FILE}" ]; then
        rm -f "${COMMIT_FILE}"
    fi
    if [ -n "${MANIFEST_FILE}" ]; then
        rm -f "${MANIFEST_FILE}"
    fi
    if [ -n "${UI_ENV_FILE}" ]; then
        rm -f "${UI_ENV_FILE}"
    fi
    rm -f "${HERE}/../production-docker-images.tar" "${HERE}/../production-docker-images.tar.gz"
}

trap cleanup_build_artifacts EXIT

while getopts ":v:d:he:" opt; do
    case $opt in
    v)
        VERSION=$OPTARG
        ;;
    d)
        DEPLOY=$OPTARG
        ;;
    e)
        ENV_FILE=$OPTARG
        ;;
    h)
        echo "Usage: $0 [-v VERSION] [-d DEPLOY] [-e ENV_FILE] [-h]"
        echo "  -v --version: Version number to use (e.g. \"1.0.0\")"
        echo "  -d --deploy: Deploy to VPS (y/N)"
        echo "  -e --env-file: .env file location (e.g. \"/root/my-folder/.env\")"
        echo "  -h --help: Show this help message"
        exit 0
        ;;
    \?)
        echo "Invalid option: -$OPTARG" >&2
        exit 1
        ;;
    :)
        echo "Option -$OPTARG requires an argument." >&2
        exit 1
        ;;
    esac
done

# Load variables from ENV_FILE (defaults to .env-prod, can be overridden with -e flag)
if [ -f "${ENV_FILE}" ]; then
    # shellcheck disable=SC1090
    . "${ENV_FILE}"
else
    error "Could not find environment file: ${ENV_FILE}. Exiting..."
    exit 1
fi

# Validate environment configuration
header "Validating environment configuration"
if ! "${HERE}/validate-env.sh" "${ENV_FILE}"; then
    error "Environment validation failed. Please fix the errors and try again."
    exit 1
fi
success "Environment configuration is valid"

# Extract the current version number from the package.json file
CURRENT_VERSION=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "${HERE}/../packages/ui/package.json" | head -1)
# Ask for version number, if not supplied in arguments
SHOULD_UPDATE_VERSION=false
if [ -z "$VERSION" ]; then
    prompt "What version number do you want to deploy? (current is ${CURRENT_VERSION}). Leave blank if keeping the same version number."
    warning "WARNING: Keeping the same version number will overwrite the previous build."
    read -r ENTERED_VERSION
    # If version entered, set version
    if [ -n "$ENTERED_VERSION" ]; then
        VERSION=$ENTERED_VERSION
        SHOULD_UPDATE_VERSION=true
    else
        info "Keeping the same version number."
        VERSION=$CURRENT_VERSION
    fi
else
    SHOULD_UPDATE_VERSION=true
fi
validate_deploy_version "${VERSION}"

if [ "${BUILD_ALLOW_DIRTY_WORKTREE:-false}" != "true" ]; then
    WORKTREE_CHANGES=$(git -C "${HERE}/.." status --porcelain --untracked-files=no)
    if [ -n "${WORKTREE_CHANGES}" ]; then
        error "Tracked worktree changes are present. Commit or stash them before building deploy artifacts."
        git -C "${HERE}/.." status --short --untracked-files=no
        exit 1
    fi
fi

if [ "${BUILD_SKIP_PACKAGE_VERSION_UPDATE:-false}" = "true" ]; then
    SHOULD_UPDATE_VERSION=false
    info "Skipping package.json version updates for this build."
fi

# Update package.json files for every package, if necessary
if [ "${SHOULD_UPDATE_VERSION}" = true ]; then
    cd "${HERE}/../packages"
    # Find every directory containing a package.json file, up to 3 levels deep
    while IFS= read -r dir; do
        info "Updating package.json for ${dir}"
        # Go to directory
        cd "${dir}"
        # Patch with yarn
        yarn version patch --new-version "${VERSION}" --no-git-tag-version
        # Go back to packages directory
        cd "${HERE}/../packages"
    done < <(find . -maxdepth 3 -name package.json -printf '%h\n')
fi

# Run bash script tests
if is_yes "${TEST}"; then
    run_step "Running bash script tests (bats)" "${HERE}/tests/__runTests.sh"
else
    warning "Skipping bash script tests..."
fi

# Navigate to server directory
cd "${HERE}/../packages/server"

# Build shared
if ! "${HERE}/shared.sh"; then
    error "Failed to build shared package"
    exit 1
fi

# Generate Prisma client types from the checked-in schema before TypeScript
# compilation. This does not run migrations or connect to production.
info "Generating Prisma client types..."
if ! yarn prisma generate --schema=src/db/schema.prisma; then
    error "Failed to generate Prisma client types"
    exit 1
fi

# Build server
info "Building server..."
if ! yarn build; then
    error "Failed to build server"
    exit 1
fi

info "Copying Prisma schema and migrations into server dist..."
mkdir -p dist/db
cp src/db/schema.prisma dist/db/schema.prisma
if [ -d src/db/migrations ]; then
    rm -rf dist/db/migrations
    cp -r src/db/migrations dist/db/migrations
fi

# Navigate to UI directory
cd "${HERE}/../packages/ui"

# Create local .env file
UI_ENV_FILE="${HERE}/../packages/ui/.env"
# Set environment variables
{
    echo "VITE_SERVER_LOCATION=${SERVER_LOCATION}"
    echo "VITE_PORT_SERVER=${PORT_SERVER}"
    echo "VITE_SERVER_URL=${SERVER_URL}"
    if [ -n "${VITE_API_BASE_URL:-}" ]; then
        echo "VITE_API_BASE_URL=${VITE_API_BASE_URL}"
    fi
    echo "VITE_SITE_IP=${SITE_IP}"
} >"${UI_ENV_FILE}"

# Build React app
info "Building React app..."
if ! yarn build; then
    error "Failed to build React app"
    exit 1
fi

# Normalize UI_URL to ensure it ends with exactly one "/"
if [ -n "${UI_URL:-}" ]; then
    export UI_URL="${UI_URL%/}/"
    DOMAIN=$(echo "${UI_URL%/}" | sed -E 's|https?://([^/]+)|\1|')
    echo "Got domain ${DOMAIN} from UI_URL ${UI_URL}"
else
    DOMAIN=""
fi

# Generate sitemap.xml
# Explicitly pass UI_URL to ensure it's available in the tsx environment
if [ -n "${UI_URL:-}" ]; then
    if ! UI_URL="$UI_URL" npx tsx ./src/sitemap.ts; then
        warning "Failed to generate sitemap.xml - continuing anyway"
        # This is not a critical error, so we don't exit
    fi
else
    warning "UI_URL not set, skipping sitemap generation"
fi

# Replace placeholder url in public files
if [ -f "${HERE}/../packages/ui/dist/manifest.dark.json" ]; then
    sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/manifest.dark.json"
    sed -i'' "s|\*.<DOMAIN>|*.${DOMAIN}|g" "${HERE}/../packages/ui/dist/manifest.dark.json"
fi
if [ -f "${HERE}/../packages/ui/dist/manifest.light.json" ]; then
    sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/manifest.light.json"
    sed -i'' "s|\*.<DOMAIN>|*.${DOMAIN}|g" "${HERE}/../packages/ui/dist/manifest.light.json"
fi
if [ -f "${HERE}/../packages/ui/dist/robots.txt" ]; then
    sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/robots.txt"
fi
if [ -f "${HERE}/../packages/ui/dist/search.xml" ]; then
    sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/search.xml"
fi

# Compress multiple build locations
info "Compressing build..."
DIRECTORIES=("packages/ui/dist"
    "packages/server/dist"
    "packages/shared/dist")

for dir in "${DIRECTORIES[@]}"; do
    # Replace slashes with periods for the tar filenames
    TAR_NAME=$(echo "${dir}" | tr '/' '.')
    TAR_PATH="${HERE}/../${TAR_NAME}.tar.gz"
    if ! tar -czf "${TAR_PATH}" -C "${HERE}/../${dir}" .; then
        error "Failed to compress ${dir}"
        exit 1
    fi
    # Append the tar path to our TAR_FILES array
    TAR_FILES+=("${TAR_PATH}")
done

COMMIT_FILE="${HERE}/../deploy-commit.txt"
git -C "${HERE}/.." rev-parse HEAD >"${COMMIT_FILE}"
TAR_FILES+=("${COMMIT_FILE}")

# Build Docker images
cd "${HERE}/.."
info "Building (and Pulling) Docker images..."
if ! docker-compose --env-file "${ENV_FILE}" -f docker-compose-prod.yml build; then
    error "Failed to build Docker images"
    exit 1
fi

# Save and compress Docker images
info "Saving Docker images..."
if ! docker tag nln_ui:prod "nln_ui:${VERSION}"; then
    error "Failed to tag UI Docker image with version ${VERSION}"
    exit 1
fi
if ! docker tag nln_server:prod "nln_server:${VERSION}"; then
    error "Failed to tag server Docker image with version ${VERSION}"
    exit 1
fi
DOCKER_SAVE_IMAGES=(nln_ui:prod "nln_ui:${VERSION}" nln_server:prod "nln_server:${VERSION}")
if [ "${BUILD_INCLUDE_BASE_IMAGES}" = "true" ]; then
    if ! docker pull postgres:13-alpine; then
        error "Failed to pull postgres:13-alpine"
        exit 1
    fi
    if ! docker pull redis:7-alpine; then
        error "Failed to pull redis:7-alpine"
        exit 1
    fi
    DOCKER_SAVE_IMAGES+=(postgres:13-alpine redis:7-alpine)
fi
if ! docker save -o production-docker-images.tar "${DOCKER_SAVE_IMAGES[@]}"; then
    error "Failed to save Docker images"
    exit 1
fi
info "Compressing Docker images..."
if ! gzip -f production-docker-images.tar; then
    error "Failed to compress Docker images"
    exit 1
fi
TAR_FILES+=("production-docker-images.tar.gz")

MANIFEST_FILE="${HERE}/../deploy-manifest.sha256"
(
    cd "${HERE}/.."
    sha256sum "$(basename "${COMMIT_FILE}")" \
        "packages.ui.dist.tar.gz" \
        "packages.server.dist.tar.gz" \
        "packages.shared.dist.tar.gz" \
        "production-docker-images.tar.gz" >"${MANIFEST_FILE}"
)
TAR_FILES+=("${MANIFEST_FILE}")

# Copy build to VPS
if [ -z "$DEPLOY" ]; then
    prompt "Build successful! Would you like to send the build to the production server? (y/N)"
    read -n1 -r DEPLOY
    echo
fi

if [ "${DEPLOY}" = "y" ] || [ "${DEPLOY}" = "Y" ] || [ "${DEPLOY}" = "yes" ] || [ "${DEPLOY}" = "Yes" ]; then
    "${HERE}/keylessSsh.sh" -e "${ENV_FILE}"
    BUILD_DIR="${SITE_IP}:/var/tmp/${VERSION}/"
    if [ -z "${DEPLOY_CONFIRMED:-}" ]; then
        prompt "Going to copy build and .env-prod to ${BUILD_DIR}. Press any key to continue..."
        read -n1 -r -s
    fi
    if ! rsync -ri --info=progress2 -e "ssh -i ~/.ssh/id_rsa_${SITE_IP}" "${TAR_FILES[@]}" "root@${BUILD_DIR}"; then
        error "Failed to copy files to ${BUILD_DIR}"
        exit 1
    fi
    if ! rsync -ri --info=progress2 -e "ssh -i ~/.ssh/id_rsa_${SITE_IP}" "${ENV_FILE}" "root@${BUILD_DIR}.env-prod"; then
        error "Failed to copy ${ENV_FILE} to ${BUILD_DIR}.env-prod"
        exit 1
    fi
    success "Files copied to ${BUILD_DIR}! To finish deployment, run deploy.sh on the VPS."
else
    BUILD_DIR="/var/tmp/${VERSION}"
    info "Copying build locally to ${BUILD_DIR}."
    # Make sure to create missing directories
    mkdir -p "${BUILD_DIR}"
    if ! cp -p "${TAR_FILES[@]}" "${BUILD_DIR}"; then
        error "Failed to copy tar.gz files to ${BUILD_DIR}"
        exit 1
    fi
    # If building locally, use .env and rename it to .env-prod
    if ! cp -p "${ENV_FILE}" "${BUILD_DIR}/.env-prod"; then
        error "Failed to copy ${ENV_FILE} to ${BUILD_DIR}/.env-prod"
        exit 1
    fi
fi

success "Build process completed successfully! Now run deploy.sh on the VPS to finish deployment, or locally to test deployment."
