#!/bin/bash
# NOTE 1: Run outside of Docker container, on production server
# NOTE 2: First run build.sh on development server
# NOTE 3: If docker-compose file was changed since the last build, you should prune the containers and images before running this script.
# Finishes up the deployment process, which was started by build.sh:
# 1. Checks if Nginx containers are running
# 2. Copies current database and build to a safe location, under a temporary directory.
# 3. Runs git fetch and git pull to get the latest changes.
# 4. Runs setup.sh
# 5. Moves build created by build.sh to the correct location.
# 6. Restarts docker containers
#
# Arguments (all optional):
# -v: Version number to use (e.g. "1.0.0")
# -n: Nginx proxy location (e.g. "/root/NginxSSLReverseProxy")
# -h: Show this help message
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/utils.sh"

# Read arguments
SETUP_ARGS=()
for arg in "$@"; do
    case $arg in
    -v | --version)
        VERSION="${2}"
        shift
        shift
        ;;
    -n | --nginx-location)
        NGINX_LOCATION="${2}"
        shift
        shift
        ;;
    -h | --help)
        echo "Usage: $0 [-v VERSION] [-n NGINX_LOCATION] [-h]"
        echo "  -v --version: Version number to use (e.g. \"1.0.0\")"
        echo "  -n --nginx-location: Nginx proxy location (e.g. \"/root/NginxSSLReverseProxy\")"
        echo "  -h --help: Show this help message"
        exit 0
        ;;
    *)
        SETUP_ARGS+=("${arg}")
        shift
        ;;
    esac
done

# Extract the current version number from the package.json file
CURRENT_VERSION=$(cat ${HERE}/../packages/ui/package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]')
# Ask for version number, if not supplied in arguments
if [ -z "$VERSION" ]; then
    prompt "What version number do you want to deploy? (current is ${CURRENT_VERSION}). Leave blank if keeping the same version number."
    warning "WARNING: Keeping the same version number will overwrite the previous build AND database backup."
    read -r ENTERED_VERSION
    # If version entered, set version
    if [ ! -z "$ENTERED_VERSION" ]; then
        VERSION=$ENTERED_VERSION
    else
        VERSION=$CURRENT_VERSION
    fi
fi

# Check if nginx-proxy and nginx-proxy-le are running
if [ ! "$(docker ps -q -f name=nginx-proxy)" ] || [ ! "$(docker ps -q -f name=nginx-proxy-le)" ]; then
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
        chmod +x "${NGINX_LOCATION}/scripts/*"
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

# Copy current database =to a safe location, under a temporary directory.
cd ${HERE}/..
DB_TMP="${TMP_DIR}/postgres"
DB_CURR="${HERE}/../data/postgres"
# Don't copy database if it already exists in /var/tmp, or it doesn't exist in DB_CURR
if [ -d "${DB_TMP}" ]; then
    info "Old database already exists at ${DB_TMP}, so not copying it"
elif [ ! -d "${DB_CURR}" ]; then
    warning "Current database does not exist at ${DB_CURR}, so not copying it"
else
    info "Copying old database to ${DB_TMP}"
    cp -rp ${HERE}/../data/postgres "${DB_TMP}"
    if [ $? -ne 0 ]; then
        error "Could not copy database to ${DB_TMP}"
        exit 1
    fi
fi

# Define paths for the additional directories
DIRECTORIES=("packages/ui/dist"
    "node_modules"
    "packages/server/node_modules"
    "packages/shared/node_modules"
    "packages/ui/node_modules"
    "packages/server/dist"
    "packages/shared/dist")
# Extract each compressed directory
for dir in "${DIRECTORIES[@]}"; do
    # Formulate tar name as stored
    TAR_NAME=$(echo "${dir}" | tr '/' '.')
    TAR_PATH="${TMP_DIR}/${TAR_NAME}.tar.gz"
    CURRENT_PATH="${HERE}/../${dir}"
    # Stash the current directory contents if they don't already exist in the temporary directory
    if [ -d "${TAR_PATH%/*}" ]; then
        info "${dir} already exists at ${TAR_PATH%/*}, so not moving it"
    elif [ -d "${CURRENT_PATH}" ]; then
        info "Moving ${dir} to ${TAR_PATH%/*}"
        mv -f "${CURRENT_PATH}" "${TAR_PATH%/*}"
        if [ $? -ne 0 ]; then
            error "Could not move ${dir} to ${TAR_PATH%/*}"
            exit 1
        fi
    fi
    # Extract the compressed directory
    if [ -f "${TAR_PATH}" ]; then
        info "Extracting ${dir} from ${TAR_PATH}"
        mkdir -p "${CURRENT_PATH}"
        tar -xzf "${TAR_PATH}" -C "${CURRENT_PATH}" --strip-components=1
        if [ $? -ne 0 ]; then
            error "Failed to extract ${dir} from ${TAR_PATH}"
            exit 1
        fi
    else
        error "Could not find tar for ${dir} at ${TAR_PATH}"
        exit 1
    fi
done

# Pull the latest changes from the repository.
info "Pulling latest changes from repository..."
git fetch
git pull
if [ $? -ne 0 ]; then
    warning "Could not pull latest changes from repository. You likely have uncommitted changes. This may cause issues."
fi

# Running setup.sh
info "Running setup.sh..."
. "${HERE}/setup.sh" "${SETUP_ARGS[@]}" -p -e y
if [ $? -ne 0 ]; then
    error "setup.sh failed"
    exit 1
fi

# Transfer and load Docker images
if [ -f "${TMP_DIR}/production-docker-images.tar.gz" ]; then
    info "Loading Docker images from ${TMP_DIR}/production-docker-images.tar.gz"
    docker load -i "${TMP_DIR}/production-docker-images.tar.gz"
    if [ $? -ne 0 ]; then
        error "Failed to load Docker images from ${TMP_DIR}/production-docker-images.tar.gz"
        exit 1
    fi
else
    error "Could not find Docker images archive at ${TMP_DIR}/production-docker-images.tar.gz"
    exit 1
fi

# Stop docker containers
info "Stopping docker containers..."
docker-compose --env-file ${TMP_DIR}/.env-prod down

# Restart docker containers.
info "Restarting docker containers..."
docker-compose --env-file ${TMP_DIR}/.env-prod -f ${HERE}/../docker-compose-prod.yml up -d

success "Done! You may need to wait a few minutes for the Docker containers to finish starting up."
