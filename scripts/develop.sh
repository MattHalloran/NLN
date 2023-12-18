#!/bin/bash
# Starts the development environment, using sensible defaults.
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/prettify.sh"

# Default values
BUILD=""
FORCE_RECREATE=""
DOCKER_COMPOSE_FILE="-f docker-compose.yml"

# Read arguments
SETUP_ARGS=()
PROD_FLAG_FOUND=false
for arg in "$@"; do
    case $arg in
    -b | --build)
        BUILD="--build"
        shift
        ;;
    -f | --force-recreate)
        FORCE_RECREATE="--force-recreate"
        shift
        ;;
    -p | --prod)
        PROD_FLAG_FOUND=true
        SETUP_ARGS+=("$1")
        shift
        ;;
    -h | --help)
        echo "Usage: $0 [-b BUILD] [-f FORCE_RECREATE] [-h]"
        echo "  -b --build: Build images - If set to \"y\", will build the Docker images"
        echo "  -f --force-recreate: Force recreate - If set to \"y\", will force recreate the Docker images"
        echo "  -p --prod: If set, will use the production docker-compose file (docker-compose-prod.yml)"
        echo "  -h --help: Show this help message"
        exit 0
        ;;
    *)
        SETUP_ARGS+=("${arg}")
        shift
        ;;
    esac
done

# Running setup.sh
info "Running setup.sh..."
. "${HERE}/setup.sh" -r n "${SETUP_ARGS[@]}"
if [ $? -ne 0 ]; then
    error "setup.sh failed"
    exit 1
fi

export SERVER_LOCATION=$("${HERE}/domainCheck.sh" $SITE_IP $SERVER_URL | tail -n 1)
if [ $? -ne 0 ]; then
    echo $SERVER_LOCATION
    error "Failed to determine server location"
    exit 1
fi

if $PROD_FLAG_FOUND; then
    DOCKER_COMPOSE_FILE="-f docker-compose-prod.yml"
fi
info "Docker compose file: ${DOCKER_COMPOSE_FILE}"

docker-compose down

# If server is not local, set up reverse proxy
if [[ "$SERVER_LOCATION" != "local" ]]; then
    . "${HERE}/proxySetup.sh" -n "${NGINX_LOCATION}"
fi

# Start the development environment
info "Starting development environment using Docker Compose..."
docker-compose $DOCKER_COMPOSE_FILE up $BUILD $FORCE_RECREATE -d
