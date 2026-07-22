#!/bin/bash
set -euo pipefail

# Sets secrets from an environment variable and .pem files into the secrets location.
# Legacy Vault helper. Useful only for environments that still run the local
# Vault workflow; normal production deploys source settings from .env-prod.
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/utils.sh"

# Variable to hold environment
environment=""

# Parse options
while getopts ":e:" opt; do
    case $opt in
    e)
        case $OPTARG in
        [Dd]ev*)
            environment="dev"
            ;;
        [Pp]rod*)
            environment="prod"
            ;;
        *)
            error "Invalid environment: $OPTARG. Expected 'dev' or 'prod'."
            exit 1
            ;;
        esac
        ;;
    \?)
        error "Invalid option: -$OPTARG" >&2
        exit 1
        ;;
    :)
        error "Option -$OPTARG requires an argument." >&2
        exit 1
        ;;
    esac
done

usage() {
    echo "Usage: $0 -e dev|prod"
    echo
    echo "Production Vault writes are disabled by default."
    echo "Set NLN_ALLOW_PROD_VAULT_WRITE=true only for an intentional legacy Vault rotation."
}

# Exit if no environment set
if [ -z "$environment" ]; then
    error "No environment set. Please use -e option with 'dev' or 'prod'."
    usage
    exit 1
fi

if [ "$environment" == "prod" ] && [ "${NLN_ALLOW_PROD_VAULT_WRITE:-}" != "true" ]; then
    error "Refusing production Vault writes."
    error "Production deploys use .env-prod; set NLN_ALLOW_PROD_VAULT_WRITE=true only for an intentional legacy Vault rotation."
    exit 1
fi

if [ ! -f "${HERE}/vaultTools.sh" ]; then
    error "Vault helper ${HERE}/vaultTools.sh is missing; this legacy secret sync workflow is unavailable."
    exit 1
fi

. "${HERE}/vaultTools.sh"

# Set env file based on the environment
env_file="${HERE}/../.env"
if [ "$environment" == "prod" ]; then
    env_file="${HERE}/../.env-prod"
fi
# Check if env file exists
if [ ! -f "$env_file" ]; then
    error "Environment file $env_file does not exist."
    exit 1
fi
# Source the env file
. "$env_file"
# Export vault address, so vault commands can be run
export VAULT_ADDR="${VAULT_ADDR:-}"

if [ -z "$VAULT_ADDR" ]; then
    error "VAULT_ADDR is not set in $env_file."
    exit 1
fi

# Check if Vault is initialized and unsealed
assert_vault_initialized
STARTED_SEALED="false"
if is_vault_sealed_status "true"; then
    STARTED_SEALED="true"
    INIT_OUTPUT_FILE="${HERE}/../.vault-init-output.txt"
    unseal_vault "$INIT_OUTPUT_FILE" 3
fi

reseal() {
    if [ "$STARTED_SEALED" = "true" ]; then
        info "Resealing Vault"
        vault operator seal
    fi
}

# Authenticate with Vault using the root token (only for prod)
if [ "$environment" == "prod" ]; then
    login_root "$INIT_OUTPUT_FILE"
fi

# Create directories if they don't exist
mkdir -p /run/secrets/vrooli/$environment

# Function to store file in vault
store_file_in_vault() {
    local key=$1
    local file_path=$2
    if [ ! -f "$file_path" ]; then
        warning "File $file_path does not exist."
        return
    fi
    local value=$(cat "$file_path")
    as_single_line=$(echo -n "$value" | sed ':a;N;$!ba;s/\n/\\n/g')
    info "Adding $key to vault"
    vault kv put secret/vrooli/$environment/$key value="$as_single_line"
    if [ $? -ne 0 ]; then
        error "Failed to add $key to vault."
    fi
}
# Store JWT keys in vault
store_file_in_vault "JWT_PRIV" "${HERE}/../jwt_priv.pem"
store_file_in_vault "JWT_PUB" "${HERE}/../jwt_pub.pem"

# Read lines in env file
while IFS= read -r line || [ -n "$line" ]; do
    # Ignore lines that start with '#' or are blank
    if echo "$line" | grep -q -v '^#' && [ -n "$line" ]; then
        key=$(echo "$line" | cut -d '=' -f 1)
        value=$(echo "$line" | cut -d '=' -f 2-)

        echo "setting secret $key in vault"
        vault kv put secret/vrooli/$environment/$key value="$value"
        if [ $? -ne 0 ]; then
            error "Failed to set secret $key in vault."
        fi
    fi
done <"$env_file"

reseal
