#!/usr/bin/env bash
set -euo pipefail

yarn validate:full
yarn lighthouse:local

VALIDATION_COMMAND="yarn validate:release" yarn validation:receipt
