#!/bin/bash
# Sets up NPM, Yarn, global dependencies, and anything else
# required to get the project up and running.
#
# Arguments (all optional):
# -f: Force install (y/N) - If set to "y", will delete all node_modules directories and reinstall
# -r: Run on remote server (y/N) - If set to "y", will run additional commands to set up the remote server
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/prettify.sh"

# Read arguments
REINSTALL_MODULES=""
ON_REMOTE=""
ENVIRONMENT="dev"
for arg in "$@"; do
    case $arg in
    -f | --force)
        REINSTALL_MODULES="${2}"
        shift
        shift
        ;;
    -r | --remote)
        ON_REMOTE="${2}"
        shift
        shift
        ;;
    -p | --prod)
        ENVIRONMENT="prod"
        shift
        ;;
    -h | --help)
        echo "Usage: $0 [-h HELP] [-f FORCE] [-r REMOTE] [-p PROD]"
        echo "  -h --help: Show this help message"
        echo "  -f --force: (y/N) If set to \"y\", will delete all node_modules directories and reinstall"
        echo "  -r --remote: (Y/n) True if this script is being run on the remote server"
        echo "  -p --prod: If set, will skip steps that are only required for development"
        exit 0
        ;;
    esac
done

header "Making sure the system clock is accurate"
sudo hwclock -s
info "System clock is now: $(date)"

# Limit the number of apt-get update and upgrade calls
should_run_apt_get_update() {
    local last_update=$(stat -c %Y /var/lib/apt/lists/)
    local current_time=$(date +%s)
    local update_interval=$((24 * 60 * 60)) # 24 hours

    if ((current_time - last_update > update_interval)); then
        return 0 # true, should run
    else
        return 1 # false, should not run
    fi
}
should_run_apt_get_upgrade() {
    local last_upgrade=$(stat -c %Y /var/lib/dpkg/status)
    local current_time=$(date +%s)
    local upgrade_interval=$((7 * 24 * 60 * 60)) # 1 week

    if ((current_time - last_upgrade > upgrade_interval)); then
        return 0 # true, should run
    else
        return 1 # false, should not run
    fi
}

# Check and run apt-get update and upgrade
if should_run_apt_get_update; then
    header "Updating apt-get package lists"
    sudo apt-get update
else
    info "Skipping apt-get update - last update was less than 24 hours ago"
fi
if should_run_apt_get_upgrade; then
    header "Upgrading apt-get packages"
    RUNLEVEL=1 sudo apt-get -y upgrade
else
    info "Skipping apt-get upgrade - last upgrade was less than 1 week ago"
fi

header "Setting script permissions"
chmod +x "${HERE}/"*.sh

# If this script is being run on the remote server, enable PasswordAuthentication
if [ -z "${ON_REMOTE}" ]; then
    prompt "Is this script being run on the remote server? (Y/n)"
    read -n1 -r ON_REMOTE
    echo
fi
if [ "${ON_REMOTE}" = "y" ] || [ "${ON_REMOTE}" = "Y" ] || [ "${ON_REMOTE}" = "yes" ] || [ "${ON_REMOTE}" = "Yes" ]; then
    header "Enabling PasswordAuthentication"
    sudo sed -i 's/#\?PasswordAuthentication .*/PasswordAuthentication yes/g' /etc/ssh/sshd_config
    sudo sed -i 's/#\?PubkeyAuthentication .*/PubkeyAuthentication yes/g' /etc/ssh/sshd_config
    sudo sed -i 's/#\?AuthorizedKeysFile .*/AuthorizedKeysFile .ssh\/authorized_keys/g' /etc/ssh/sshd_config
    if [ ! -d ~/.ssh ]; then
        mkdir ~/.ssh
        chmod 700 ~/.ssh
    fi
    if [ ! -f ~/.ssh/authorized_keys ]; then
        touch ~/.ssh/authorized_keys
    fi
    chmod 600 ~/.ssh/authorized_keys
    # Try restarting service. Can either be called "sshd" or "ssh"
    sudo service sshd restart
    # If sshd fails, try to restart ssh
    if [ $? -ne 0 ]; then
        echo "Failed to restart sshd, trying ssh..."
        sudo systemctl restart ssh
        # If ssh also fails, exit with an error
        if [ $? -ne 0 ]; then
            echo "Failed to restart ssh. Exiting with error."
            exit 1
        fi
    fi
else
    # Otherwise, make sure mailx is installed. This may be used by some scripts which
    # track errors on the remote server and notify the developer via email.
    header "Installing mailx"
    # TODO - Not working for some reason
    # info "Select option 2 (Internet Site) then enter \"http://mirrors.kernel.org/ubuntu\" when prompted."
    #sudo apt-get install -y mailutils
    # While we're here, also check if .env and .env-prod exist. If not, create them using .env-example.
    if [ ! -f "${HERE}/../.env" ]; then
        header "Creating .env file"
        cp "${HERE}/../.env-example" "${HERE}/../.env"
        warning "Please update the .env file with your own values."
    fi
    if [ ! -f "${HERE}/../.env-prod" ]; then
        header "Creating .env-prod file"
        cp "${HERE}/../.env-example" "${HERE}/../.env-prod"
        warning "Please update the .env-prod file with your own values."
    fi
fi

header "Installing nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
. ~/.nvm/nvm.sh

header "Installing Node (includes npm)"
nvm install 16.16.0
nvm alias default v16.16.0

header "Installing Yarn"
npm install -g yarn

header "Installing jq for JSON parsing"
sudo apt-get install -y jq

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

# Try to start Docker (if already running, this should be a no-op)
sudo service docker start

# Verify Docker is running by attempting a command
if ! docker version >/dev/null 2>&1; then
    error "Failed to start Docker or Docker is not running. If you are in Windows Subsystem for Linux (WSL), please start Docker Desktop and try again."
    exit 1
fi

header "Create nginx-proxy network"
docker network create nginx-proxy
# Ignore errors if the network already exists
if [ $? -ne 0 ]; then
    true
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

# Less needs to be done for production environments
if [ "${ENVIRONMENT}" = "dev" ]; then
    header "Installing global dependencies"
    installedPackages=$(yarn global list)
    check_and_add_to_install_list() {
        package="$1"
        version="$2"
        fullPackageName="$package"
        if [ ! -z "$version" ]; then
            fullPackageName="$package@$version"
        fi
        # Check if package is installed globally
        if ! echo "$installedPackages" | grep -E "info \"$package(@$version)?" >/dev/null; then
            info "Installing $fullPackageName"
            toInstall="$toInstall $fullPackageName"
        fi
    }
    toInstall=""
    check_and_add_to_install_list "apollo" "2.34.0"
    check_and_add_to_install_list "typescript" ""
    check_and_add_to_install_list "ts-node" ""
    check_and_add_to_install_list "nodemon" ""
    check_and_add_to_install_list "prisma" "4.14.0"
    check_and_add_to_install_list "vite" "4.4.4"
    # Install all at once if there are packages to install
    if [ ! -z "$toInstall" ]; then
        yarn global add $toInstall
        if [ $? -ne 0 ]; then
            error "Failed to install global dependencies: $toInstall"
            info "Trying to install each package individually..."
            # Split the toInstall string into an array
            IFS=' ' read -r -a individualPackages <<<"$toInstall"
            # Loop through each package and try to install it individually
            for pkg in "${individualPackages[@]}"; do
                info "Attempting to install $pkg individually..."
                yarn global add "$pkg"
                if [ $? -ne 0 ]; then
                    error "Failed to install $pkg"
                    exit 1
                else
                    info "$pkg installed successfully"
                fi
            done
        fi
    fi

    # If reinstalling modules, delete all node_modules directories before installing dependencies
    if [[ "$REINSTALL_MODULES" =~ ^[Yy]([Ee][Ss])?$ ]]; then
        header "Deleting all node_modules directories"
        find "${HERE}/.." -maxdepth 4 -name "node_modules" -type d -exec rm -rf {} \;
        header "Deleting yarn.lock"
        rm "${HERE}/../yarn.lock"
    fi
    header "Installing local dependencies"
    cd "${HERE}/.." && yarn cache clean && yarn

    header "Generating type models for Prisma"
    cd "${HERE}/../packages/server" && prisma generate --schema ./src/db/schema.prisma

    "${HERE}/shared.sh"
else
    info "Skipping global dependencies installation - production environment detected"
    info "Skipping local dependencies installation - production environment detected"
    info "Skipping type models generation - production environment detected"
    info "Skipping shared.sh - production environment detected"
fi

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
