#!/usr/bin/env bash
# NetVision V2 — Linux Launcher

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================================"
echo "          NETVISION V2 — LINUX LAUNCHER                    "
echo "     Neumorphic Cross-Platform Hotspot Intelligence        "
echo "============================================================"
echo ""

# Check for node
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    exit 1
fi

echo "[1/2] Starting NetVision V2 Backend on port 3001..."
cd "$DIR/backend"
node server.js &
BACKEND_PID=$!

sleep 3

echo "[2/2] Starting NetVision V2 Frontend on port 5173..."
cd "$DIR/frontend"
if [ -f "./node_modules/vite/bin/vite.js" ]; then
    node ./node_modules/vite/bin/vite.js --host &
else
    npx vite --host &
fi
FRONTEND_PID=$!

echo ""
echo "✔ NetVision V2 is active!"
echo "Frontend: http://localhost:5173"
echo "Backend : http://localhost:3001"
echo ""
echo "Press Ctrl+C to terminate all processes."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
