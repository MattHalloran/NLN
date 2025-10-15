#!/bin/bash
set -e

echo "🚀 Starting server in production mode..."
echo ""

# Change to server directory
cd "$(dirname "$0")/.."

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env"
    set -a
    source .env
    set +a
else
    echo "⚠️  Warning: .env file not found in $(pwd)"
    echo "   The server may fail to start if required variables are not set"
fi

# Ensure PROJECT_DIR is set (fallback to parent directory)
if [ -z "$PROJECT_DIR" ]; then
    export PROJECT_DIR="$(cd ../.. && pwd)"
    echo "⚠️  PROJECT_DIR not set in .env, using: $PROJECT_DIR"
fi

# Ensure required directories exist
echo "📁 Creating required directories..."
mkdir -p "$PROJECT_DIR/data/logs"
mkdir -p "$PROJECT_DIR/assets/public"
mkdir -p "$PROJECT_DIR/assets/private"
mkdir -p "$PROJECT_DIR/assets/images"

echo ""
echo "✅ Pre-flight checks complete"
echo ""

# Free up the port if already in use
if [ -n "$PORT_SERVER" ]; then
    PORT=$PORT_SERVER
else
    PORT=5331
fi

echo "🔍 Checking if port $PORT is in use..."
PORT_PID=$(lsof -ti:$PORT 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    echo "⚠️  Port $PORT is in use by PID(s): $PORT_PID"
    echo "🛑 Stopping process(es) on port $PORT..."
    kill -9 $PORT_PID 2>/dev/null || true
    sleep 1
    echo "✅ Port $PORT freed"
else
    echo "✅ Port $PORT is available"
fi

echo ""

# Start server
exec node --max-old-space-size=4096 --wasm-max-initial-code-space-reservation=1048576 dist/index.js
