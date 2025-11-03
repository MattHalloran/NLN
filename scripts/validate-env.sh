#!/bin/bash
# Validates that all required environment variables are set and properly formatted
# Usage: ./validate-env.sh <path-to-env-file>
# Example: ./validate-env.sh ../.env-prod

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
. "${HERE}/utils.sh"

# Get the env file path from argument, or default to .env
ENV_FILE="${1:-${HERE}/../.env}"

if [ ! -f "${ENV_FILE}" ]; then
    error "Environment file not found: ${ENV_FILE}"
    exit 1
fi

info "Validating environment file: ${ENV_FILE}"

# Load the env file
set -a
. "${ENV_FILE}"
set +a

# Track validation failures
VALIDATION_FAILED=0

# Function to check if a variable is set and not empty
check_var_exists() {
    local var_name="$1"
    local var_value="${!var_name}"

    if [ -z "${var_value}" ]; then
        error "Required variable ${var_name} is not set or is empty"
        VALIDATION_FAILED=1
        return 1
    else
        info "✓ ${var_name} is set"
        return 0
    fi
}

# Function to validate IP address format
validate_ip() {
    local var_name="$1"
    local ip="${!var_name}"

    if [[ ! $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        error "Variable ${var_name} (${ip}) is not a valid IP address"
        VALIDATION_FAILED=1
        return 1
    fi

    # Check each octet is <= 255
    IFS='.' read -ra OCTETS <<< "$ip"
    for octet in "${OCTETS[@]}"; do
        if [ "$octet" -gt 255 ]; then
            error "Variable ${var_name} (${ip}) has invalid octet value"
            VALIDATION_FAILED=1
            return 1
        fi
    done

    info "✓ ${var_name} is a valid IP address"
    return 0
}

# Function to validate URL format
validate_url() {
    local var_name="$1"
    local url="${!var_name}"

    if [[ ! $url =~ ^https?:// ]]; then
        error "Variable ${var_name} (${url}) must start with http:// or https://"
        VALIDATION_FAILED=1
        return 1
    fi

    info "✓ ${var_name} is a valid URL"
    return 0
}

# Function to validate port number
validate_port() {
    local var_name="$1"
    local port="${!var_name}"

    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        error "Variable ${var_name} (${port}) is not a valid port number (1-65535)"
        VALIDATION_FAILED=1
        return 1
    fi

    info "✓ ${var_name} is a valid port"
    return 0
}

# Function to validate boolean value
validate_boolean() {
    local var_name="$1"
    local value="${!var_name}"

    if [[ ! "$value" =~ ^(true|false)$ ]]; then
        error "Variable ${var_name} (${value}) must be 'true' or 'false'"
        VALIDATION_FAILED=1
        return 1
    fi

    info "✓ ${var_name} is a valid boolean"
    return 0
}

# Function to validate email format
validate_email() {
    local var_name="$1"
    local email="${!var_name}"

    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        error "Variable ${var_name} (${email}) is not a valid email address"
        VALIDATION_FAILED=1
        return 1
    fi

    info "✓ ${var_name} is a valid email"
    return 0
}

# Function to check if value is set for production
validate_production_value() {
    local var_name="$1"
    local var_value="${!var_name}"
    local production_safe="$2"

    if [ "${var_value}" != "${production_safe}" ]; then
        error "Variable ${var_name} (${var_value}) should be '${production_safe}' for production"
        VALIDATION_FAILED=1
        return 1
    fi

    info "✓ ${var_name} is set correctly for production"
    return 0
}

header "Validating Debug Settings"
check_var_exists "SERVER_LOCATION"
if [ -n "${SERVER_LOCATION}" ]; then
    if [[ ! "${SERVER_LOCATION}" =~ ^(local|dns)$ ]]; then
        error "SERVER_LOCATION must be 'local' or 'dns', got: ${SERVER_LOCATION}"
        VALIDATION_FAILED=1
    fi
fi
check_var_exists "CREATE_MOCK_DATA"
validate_boolean "CREATE_MOCK_DATA"
check_var_exists "DB_PULL"
validate_boolean "DB_PULL"

header "Validating Port Settings"
check_var_exists "PORT_UI" && validate_port "PORT_UI"
check_var_exists "PORT_SERVER" && validate_port "PORT_SERVER"
check_var_exists "PORT_DB" && validate_port "PORT_DB"
check_var_exists "PORT_REDIS" && validate_port "PORT_REDIS"

header "Validating Project Settings"
check_var_exists "PROJECT_DIR"
check_var_exists "SITE_IP" && validate_ip "SITE_IP"
check_var_exists "SERVER_URL" && validate_url "SERVER_URL"
check_var_exists "VIRTUAL_HOST"

# UI_URL is only required for production builds
if [[ "${ENV_FILE}" == *"prod"* ]]; then
    check_var_exists "UI_URL" && validate_url "UI_URL"
fi

header "Validating Credentials"
check_var_exists "JWT_SECRET"
if [ -n "${JWT_SECRET}" ] && [ ${#JWT_SECRET} -lt 12 ]; then
    error "JWT_SECRET should be at least 12 characters long for security"
    VALIDATION_FAILED=1
fi

check_var_exists "DB_NAME"
check_var_exists "DB_USER"
check_var_exists "DB_PASSWORD"
if [ -n "${DB_PASSWORD}" ] && [ ${#DB_PASSWORD} -lt 8 ]; then
    error "DB_PASSWORD should be at least 8 characters long for security"
    VALIDATION_FAILED=1
fi

check_var_exists "ADMIN_EMAIL" && validate_email "ADMIN_EMAIL"
check_var_exists "ADMIN_PASSWORD"
check_var_exists "SITE_EMAIL_USERNAME" && validate_email "SITE_EMAIL_USERNAME"
check_var_exists "SITE_EMAIL_PASSWORD"

# Production-specific validations
if [[ "${ENV_FILE}" == *"prod"* ]]; then
    header "Validating Production-Specific Settings"

    if [ "${CREATE_MOCK_DATA}" = "true" ]; then
        error "CREATE_MOCK_DATA must be 'false' for production!"
        VALIDATION_FAILED=1
    else
        info "✓ CREATE_MOCK_DATA is correctly set to false for production"
    fi

    if [ "${SERVER_LOCATION}" != "dns" ]; then
        error "SERVER_LOCATION must be 'dns' for production, got: '${SERVER_LOCATION}'"
        error "Production requires SERVER_LOCATION=dns to restrict CORS to production domains only"
        error "Change SERVER_LOCATION=dns in ${ENV_FILE} before deploying to VPS"
        VALIDATION_FAILED=1
    else
        info "✓ SERVER_LOCATION is correctly set to 'dns' for production"
    fi
fi

# Final result
echo ""
if [ $VALIDATION_FAILED -eq 0 ]; then
    success "✅ All environment variables are valid!"
    exit 0
else
    error "❌ Environment validation failed. Please fix the errors above."
    exit 1
fi
