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
# -h: Show this help message
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/prettify.sh"

# Read arguments
while getopts ":v:d:h" opt; do
    case $opt in
    v)
        VERSION=$OPTARG
        ;;
    d)
        DEPLOY=$OPTARG
        ;;
    h)
        echo "Usage: $0 [-v VERSION] [-d DEPLOY] [-h]"
        echo "  -v --version: Version number to use (e.g. \"1.0.0\")"
        echo "  -d --deploy: Deploy to VPS (y/N)"
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

# Navigate to UI directory
cd ${HERE}/../packages/ui

# Create local .env file
touch .env
# Set environment variables
echo "REACT_APP_SERVER_LOCATION=${SERVER_LOCATION}" >>.env
echo "REACT_APP_PORT_SERVER=${PORT_SERVER}" >>.env
echo "REACT_APP_SERVER_URL=${SERVER_URL}" >>.env
echo "REACT_APP_SITE_IP=${SITE_IP}" >>.env
# Set trap to remove .env file on exit
trap "rm .env" EXIT

# Build React app
info "Building React app..."
yarn build
if [ $? -ne 0 ]; then
    error "Failed to build React app"
    exit 1
fi

# Generate sitemap.xml
ts-node --esm --experimental-specifier-resolution node ./src/sitemap.ts
if [ $? -ne 0 ]; then
    error "Failed to generate sitemap.xml"
    echo "${HERE}/../packages/ui/src/sitemap.ts"
    # This is not a critical error, so we don't exit
fi

# Create brave-rewards-verification.txt file
if [ -z "${BRAVE_REWARDS_TOKEN}" ]; then
    error "BRAVE_REWARDS_TOKEN is not set. Not creating build/.well-known/brave-rewards-verification.txt file."
else
    info "Creating build/.well-known/brave-rewards-verification.txt file..."
    mkdir build/.well-known
    cd ${HERE}/../packages/ui/build/.well-known
    echo "This is a Brave Rewards publisher verification file.\n" >brave-rewards-verification.txt
    echo "Domain: newlifenurseryinc.com" >>brave-rewards-verification.txt
    echo "Token: ${BRAVE_REWARDS_TOKEN}" >>brave-rewards-verification.txt
    cd ../..
fi

# Copy build to VPS
if [ -z "$DEPLOY" ]; then
    success "Build successful! Would you like to send the build to the production server? (y/N)"
    read -r DEPLOY
fi

# Compress build
info "Compressing build..."
tar -czf build.tar.gz build
trap "rm build.tar.gz" EXIT
if [ $? -ne 0 ]; then
    error "Failed to compress build"
    exit 1
fi

if [ "${DEPLOY}" = "y" ] || [ "${DEPLOY}" = "Y" ] || [ "${DEPLOY}" = "yes" ] || [ "${DEPLOY}" = "Yes" ]; then
    BUILD_DIR="${SITE_IP}:/var/tmp/${VERSION}/"
    info "Going to copy build to ${BUILD_DIR}. Press any key to continue..."
    read -r
    rsync -r build.tar.gz root@${BUILD_DIR}
    if [ $? -ne 0 ]; then
        error "Failed to copy build to ${BUILD_DIR}"
        exit 1
    fi
    success "build.tar.gz copied to ${BUILD_DIR}! To finish deployment, run deploy.sh on the VPS."
else
    BUILD_DIR="/var/tmp/${VERSION}"
    info "Copying build locally to ${BUILD_DIR}."
    # Make sure to create missing directories
    mkdir -p "${BUILD_DIR}"
    cp -p build.tar.gz ${BUILD_DIR}
    if [ $? -ne 0 ]; then
        error "Failed to copy build to ${BUILD_DIR}"
        exit 1
    fi
    success "build.tar.gz copied to ${BUILD_DIR}!"
fi
