#!/usr/bin/env bash
set -euo pipefail

yarn typecheck
yarn typecheck:test
yarn check:drift
yarn test:unit
yarn test:integration
yarn workspace ui build
yarn test:pwa
yarn test:e2e:admin

VALIDATION_COMMAND="yarn validate:trusted" yarn validation:receipt
