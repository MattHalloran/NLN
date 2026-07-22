#!/usr/bin/env bash
set -euo pipefail

echo "Deprecated: validate:release is an alias for the canonical validate:trusted gate." >&2
exec bash "$(dirname "$0")/validate-trusted.sh" "$@"
