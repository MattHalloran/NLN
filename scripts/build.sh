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
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/utils.sh"

# Read arguments
ENV_FILE="${HERE}/../.env-prod"
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

# Load variables from .env file
if [ -f "${HERE}/../.env" ]; then
    . "${HERE}/../.env"
else
    error "Could not find .env file. Exiting..."
    exit 1
fi

# Check for required variables
check_var() {
    if [ -z "${!1}" ]; then
        error "Variable ${1} is not set. Exiting..."
        exit 1
    else
        info "Variable ${1} is set to ${!1}"
    fi
}
check_var SERVER_LOCATION
check_var PORT_SERVER
check_var SERVER_URL
check_var SITE_IP

# Extract the current version number from the package.json file
CURRENT_VERSION=$(cat ${HERE}/../packages/ui/package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')
# Ask for version number, if not supplied in arguments
SHOULD_UPDATE_VERSION=false
if [ -z "$VERSION" ]; then
    prompt "What version number do you want to deploy? (current is ${CURRENT_VERSION}). Leave blank if keeping the same version number."
    warning "WARNING: Keeping the same version number will overwrite the previous build."
    read -r ENTERED_VERSION
    # If version entered, set version
    if [ ! -z "$ENTERED_VERSION" ]; then
        VERSION=$ENTERED_VERSION
        SHOULD_UPDATE_VERSION=true
    else
        info "Keeping the same version number."
        VERSION=$CURRENT_VERSION
    fi
else
    SHOULD_UPDATE_VERSION=true
fi

# Update package.json files for every package, if necessary
if [ "${SHOULD_UPDATE_VERSION}" = true ]; then
    cd ${HERE}/../packages
    # Find every directory containing a package.json file, up to 3 levels deep
    for dir in $(find . -maxdepth 3 -name package.json -printf '%h '); do
        info "Updating package.json for ${dir}"
        # Go to directory
        cd ${dir}
        # Patch with yarn
        yarn version patch --new-version ${VERSION} --no-git-tag-version
        # Go back to packages directory
        cd ${HERE}/../packages
    done
fi

# Run bash script tests
if is_yes "$TEST"; then
    run_step "Running bash script tests (bats)" "${HERE}/tests/__runTests.sh"
else
    warning "Skipping bash script tests..."
fi

# Navigate to server directory
cd ${HERE}/../packages/server

# Build shared
"${HERE}/shared.sh"

# Build server
info "Building server..."
yarn build
if [ $? -ne 0 ]; then
    error "Failed to build server"
    exit 1
fi

# Navigate to UI directory
cd ${HERE}/../packages/ui

# Create local .env file
touch .env
# Set environment variables
echo "VITE_SERVER_LOCATION=${SERVER_LOCATION}" >>.env
echo "VITE_PORT_SERVER=${PORT_SERVER}" >>.env
echo "VITE_SERVER_URL=${SERVER_URL}" >>.env
echo "VITE_SITE_IP=${SITE_IP}" >>.env
# Set trap to remove .env file on exit
trap "rm .env" EXIT

# Build React app
info "Building React app..."
yarn build
if [ $? -ne 0 ]; then
    error "Failed to build React app"
    exit 1
fi

# Normalize UI_URL to ensure it ends with exactly one "/"
export UI_URL="${UI_URL%/}/"
DOMAIN=$(echo "${UI_URL%/}" | sed -E 's|https?://([^/]+)|\1|')
echo "Got domain ${DOMAIN} from UI_URL ${UI_URL}"

# Generate sitemap.xml
npx tsx node ./src/tools/sitemap.ts
if [ $? -ne 0 ]; then
    error "Failed to generate sitemap.xml"
    echo "${HERE}/../packages/ui/src/sitemap.ts"
    # This is not a critical error, so we don't exit
fi

# Replace placeholder url in public files
sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/manifest.dark.json"
sed -i'' "s|\*.<DOMAIN>|*.${DOMAIN}|g" "${HERE}/../packages/ui/dist/manifest.dark.json"
sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/manifest.light.json"
sed -i'' "s|\*.<DOMAIN>|*.${DOMAIN}|g" "${HERE}/../packages/ui/dist/manifest.light.json"
sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/robots.txt"
sed -i'' "s|<UI_URL>|${UI_URL}|g" "${HERE}/../packages/ui/dist/search.xml"

# Create brave-rewards-verification.txt file
if [ -z "${BRAVE_REWARDS_TOKEN}" ]; then
    error "BRAVE_REWARDS_TOKEN is not set. Not creating dist/.well-known/brave-rewards-verification.txt file."
else
    info "Creating dist/.well-known/brave-rewards-verification.txt file..."
    mkdir dist/.well-known
    cd ${HERE}/../packages/ui/dist/.well-known
    echo "This is a Brave Rewards publisher verification file.\n" >brave-rewards-verification.txt
    echo "Domain: newlifenurseryinc.com" >>brave-rewards-verification.txt
    echo "Token: ${BRAVE_REWARDS_TOKEN}" >>brave-rewards-verification.txt
    cd ../..
fi

# Compress multiple build locations
info "Compressing build..."
DIRECTORIES=("packages/ui/dist"
    "node_modules"
    "packages/server/node_modules"
    "packages/shared/node_modules"
    "packages/ui/node_modules"
    "packages/server/dist"
    "packages/shared/dist")
# Declare an array to store the paths of the tar files
TAR_FILES=()
for dir in "${DIRECTORIES[@]}"; do
    # Replace slashes with periods for the tar filenames
    TAR_NAME=$(echo "${dir}" | tr '/' '.')
    TAR_PATH="${HERE}/../${TAR_NAME}.tar.gz"
    tar -czf "${TAR_PATH}" -C "${HERE}/../${dir}" .
    trap "rm ${TAR_PATH}" EXIT
    if [ $? -ne 0 ]; then
        error "Failed to compress ${dir}"
        exit 1
    fi
    # Append the tar path to our TAR_FILES array
    TAR_FILES+=("${TAR_PATH}")
    # Add trap to remove the tar file on exit
    trap "rm ${TAR_PATH}" EXIT
done

# Build Docker images
cd ${HERE}/..
info "Building (and Pulling) Docker images..."
docker-compose --env-file ${ENV_FILE} -f docker-compose-prod.yml build
docker pull postgres:13-alpine
docker pull redis:7-alpine

# Save and compress Docker images
info "Saving Docker images..."
docker save -o production-docker-images.tar nln_ui:prod nln_server:prod postgres:13-alpine redis:7-alpine
if [ $? -ne 0 ]; then
    error "Failed to save Docker images"
    exit 1
fi
trap "rm production-docker-images.tar*" EXIT
info "Compressing Docker images..."
gzip -f production-docker-images.tar
if [ $? -ne 0 ]; then
    error "Failed to compress Docker images"
    exit 1
fi
TAR_FILES+=("production-docker-images.tar.gz")

# Copy build to VPS
if [ -z "$DEPLOY" ]; then
    prompt "Build successful! Would you like to send the build to the production server? (y/N)"
    read -n1 -r DEPLOY
    echo
fi

if [ "${DEPLOY}" = "y" ] || [ "${DEPLOY}" = "Y" ] || [ "${DEPLOY}" = "yes" ] || [ "${DEPLOY}" = "Yes" ]; then
    "${HERE}/keylessSsh.sh" -e ${ENV_FILE}
    BUILD_DIR="${SITE_IP}:/var/tmp/${VERSION}/"
    prompt "Going to copy build and .env-prod to ${BUILD_DIR}. Press any key to continue..."
    read -n1 -r -s
    rsync -ri --info=progress2 -e "ssh -i ~/.ssh/id_rsa_${SITE_IP}" "${TAR_FILES[@]}" ${ENV_FILE} root@${BUILD_DIR}
    if [ $? -ne 0 ]; then
        error "Failed to copy files to ${BUILD_DIR}"
        exit 1
    fi
    success "Files copied to ${BUILD_DIR}! To finish deployment, run deploy.sh on the VPS."
else
    BUILD_DIR="/var/tmp/${VERSION}"
    info "Copying build locally to ${BUILD_DIR}."
    # Make sure to create missing directories
    mkdir -p "${BUILD_DIR}"
    cp -p "${TAR_FILES[@]}" "${BUILD_DIR}"
    if [ $? -ne 0 ]; then
        error "Failed to copy tar.gz files to ${BUILD_DIR}"
        exit 1
    fi
    # If building locally, use .env and rename it to .env-prod
    cp -p ${ENV_FILE} ${BUILD_DIR}/.env-prod
    if [ $? -ne 0 ]; then
        error "Failed to copy ${ENV_FILE} to ${BUILD_DIR}/.env-prod"
        exit 1
    fi
fi

success "Build process completed successfully! Now run deploy.sh on the VPS to finish deployment, or locally to test deployment."
