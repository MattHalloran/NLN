#!/bin/bash
# Sets up NPM, Yarn, global dependencies, and anything else
# required to get the project up and running.
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/prettify.sh"

header "Checking for package updates"
sudo apt-get update
header "Running upgrade"
sudo apt-get -y upgrade

header "Setting script permissions"
chmod +x "${HERE}/"*.sh

header "Installing nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
. ~/.nvm/nvm.sh

header "Installing Node (includes npm)"
nvm install 16.16.0
nvm alias default v16.16.0

header "Installing Yarn"
npm install -g yarn

if ! command -v docker &>/dev/null; then
    info "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    trap 'rm -f get-docker.sh' EXIT
    sudo sh get-docker.sh
    # Check if Docker installation failed
    if ! command -v docker &>/dev/null; then
        echo "Error: Docker installation failed."
        exit 1
    fi
else
    info "Detected: $(docker --version)"
fi

if ! command -v docker-compose &>/dev/null; then
    info "Docker Compose is not installed. Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod a+rx /usr/local/bin/docker-compose
    # Check if Docker Compose installation failed
    if ! command -v docker-compose &>/dev/null; then
        echo "Error: Docker Compose installation failed."
        exit 1
    fi
else
    info "Detected: $(docker-compose --version)"
fi

header "Create nginx-proxy network"
docker network create nginx-proxy
# Ignore errors if the network already exists
if [ $? -ne 0 ]; then
    true
fi

header "Installing global dependencies"
yarn global add apollo@2.34.0 typescript ts-node nodemon prisma@4.12.0 vite

header "Installing local dependencies"
cd "${HERE}/.." && yarn cache clean && yarn

"${HERE}/shared.sh"

# header "Combining node_modules from all packages into one"

header "Generating type models for Prisma"
cd "${HERE}/../packages/server" && yarn prisma-generate

# If hours.md does not exist, create it and fill with default content.
# Should look like this:
# | Day           | Hours |
# | ------------- |:-------------:         |
# | MON-FRI      | 8:00 am to 3:00 pm     |
# | SAT     | CLOSED    |
# | SUN    | CLOSED    |
# | Note          | Closed daily from 12:00 pm to 1:00 pm    |
if [ ! -f "${HERE}/../assets/public/hours.md" ]; then
    header "Creating hours.md"
    echo "| Day           | Hours |" >"${HERE}/../assets/public/hours.md"
    echo "| ------------- |:-------------:         |" >>"${HERE}/../assets/public/hours.md"
    echo "| MON-FRI      | 8:00 am to 3:00 pm     |" >>"${HERE}/../assets/public/hours.md"
    echo "| SAT     | CLOSED    |" >>"${HERE}/../assets/public/hours.md"
    echo "| SUN    | CLOSED    |" >>"${HERE}/../assets/public/hours.md"
    echo "| Note          | Closed daily from 12:00 pm to 1:00 pm    |" >>"${HERE}/../assets/public/hours.md"
fi

info "Done! You may need to restart your editor for syntax highlighting to work correctly."
info "If you haven't already, copy .env-example to .env and edit it to match your environment."
