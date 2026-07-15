#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "${ROOT_DIR}"

# Deliberately synthetic and non-secret. These values must never be replaced
# with production configuration in the trusted local gate.
export CI=true
export NODE_ENV=development
export APP_RUNTIME=development
export SERVER_LOCATION=local
export VITE_SERVER_LOCATION=local
export JWT_SECRET=validation-fixture-jwt-secret
export CSRF_SECRET=validation-fixture-csrf-secret
export ADMIN_EMAIL=admin@example.test
export ADMIN_PASSWORD=admin-password
export DB_NAME=nln_validation_fixture
export DB_USER=nln_validation_fixture
export DB_PASSWORD=nln_validation_fixture
export PORT_UI="${VALIDATION_PORT_UI:-13001}"
export PORT_PWA="${VALIDATION_PORT_PWA:-13002}"
export PORT_SERVER="${VALIDATION_PORT_SERVER:-15331}"
export PORT_DB="${VALIDATION_PORT_DB:-15433}"
export PORT_REDIS="${VALIDATION_PORT_REDIS:-16379}"
export VITE_PORT_SERVER="${PORT_SERVER}"
export DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${PORT_DB}/${DB_NAME}"
export DATABASE_URL="${DB_URL}"
export REDIS_CONN="localhost:${PORT_REDIS}"
export CREATE_MOCK_DATA=true
export DB_PULL=false
export EMAIL_MODE=console
export ALLOW_MIGRATION_WITHOUT_BACKUP=true
export E2E_MANAGE_SERVICES=true
export E2E_TEARDOWN_REMOVE_SERVICES=true
export E2E_IGNORE_DOTENV=true
export E2E_DB_CONTAINER="nln_validation_db_${PORT_DB}"
export E2E_REDIS_CONTAINER="nln_validation_redis_${PORT_REDIS}"
export UI_URL="http://localhost:${PORT_UI}"
export SERVER_URL="http://localhost:${PORT_SERVER}"
export CORS_ORIGINS="${UI_URL}"
unset PROJECT_DIR E2E_PROJECT_DIR E2E_DATA_DIR E2E_DATA_BACKUP_DIR

yarn workspace @local/shared build
yarn workspace ui build
yarn test:pwa
yarn test:a11y
yarn test:e2e:public
yarn test:visual
yarn test:e2e:admin
yarn test:e2e:production
