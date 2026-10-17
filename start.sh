#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo "  🚀 TrailBase Booking Hub (100% Native + Rust-WASM)"
echo "=========================================================="

if ! command -v trail &> /dev/null; then
    export PATH="$HOME/.local/bin:$PATH"
fi

# Clean up existing processes if running
pkill -f "trail run" || true
sleep 1

echo "Iniciando TrailBase en http://0.0.0.0:4000..."
echo "Componentes WASM cargados: traildepot/wasm/trailbase_ai_component.wasm"
echo "Endpoints: REST (/api/records/v1/*), Admin (/_/admin), AI WASM (/api/chat)"

trail run --address 0.0.0.0:4000 --public-dir ./public --spa --dev
