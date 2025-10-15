#!/bin/bash
set -e

echo "🚀 Starting UI in production mode..."
echo ""

# Change to UI directory
cd "$(dirname "$0")/.."

# Load environment variables from server's .env file
if [ -f ../server/.env ]; then
    echo "📋 Loading environment variables from ../server/.env"
    set -a
    source ../server/.env
    set +a
else
    echo "⚠️  Warning: .env file not found"
fi

# Free up the port if already in use
if [ -n "$PORT_UI" ]; then
    PORT=$PORT_UI
else
    PORT=3001
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
echo "✅ Pre-flight checks complete"
echo ""

# Start UI server
exec serve --config serve.json --listen $PORT
