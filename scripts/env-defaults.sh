#!/bin/bash
# Shared non-secret environment defaults for local scripts and validation.

DEFAULT_PORT_UI=3001
DEFAULT_PORT_SERVER=5331
DEFAULT_PORT_DB=5433
DEFAULT_PORT_REDIS=6380
DEFAULT_E2E_PORT_REDIS=6379

default_env_apply() {
    export PORT_UI="${PORT_UI:-${DEFAULT_PORT_UI}}"
    export PORT_SERVER="${PORT_SERVER:-${DEFAULT_PORT_SERVER}}"
    export PORT_DB="${PORT_DB:-${DEFAULT_PORT_DB}}"
    export PORT_REDIS="${PORT_REDIS:-${DEFAULT_PORT_REDIS}}"
}

default_env_apply_e2e() {
    export PORT_UI="${PORT_UI:-${DEFAULT_PORT_UI}}"
    export PORT_SERVER="${PORT_SERVER:-${DEFAULT_PORT_SERVER}}"
    export PORT_DB="${PORT_DB:-${DEFAULT_PORT_DB}}"
    export PORT_REDIS="${PORT_REDIS:-${DEFAULT_E2E_PORT_REDIS}}"
}
