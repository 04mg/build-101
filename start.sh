#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Ensure PATH includes cargo and local bins
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

echo "=========================================================="
echo "  🚀 TrailBase Fullstack Starter (Native + WASM + React)"
echo "=========================================================="

# 1. Cleanup any previous running instances
pkill -f "trail --depot ./backend run" 2>/dev/null || true
pkill -f "trail run" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://127.0.0.1:4000" 2>/dev/null || true
sleep 1

# 2. Build frontend if dist/ does not exist
if [ ! -d "frontend/dist" ]; then
    echo "📦 Compilando frontend (React + Shadcn UI)..."
    (cd frontend && pnpm run build)
fi

# 3. Clean and trap signals for graceful shutdown
cleanup() {
    echo -e "\n🛑 Deteniendo TrailBase y Cloudflare Tunnel..."
    kill "$TRAIL_PID" "$TUNNEL_PID" 2>/dev/null || true
    pkill -P $$ 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 4. Iniciar TrailBase nativo
echo "⚙️  Iniciando TrailBase en http://127.0.0.1:4000..."
trail --depot ./backend run --address 0.0.0.0:4000 --public-dir ./frontend/dist --spa --dev > /tmp/trailbase.log 2>&1 &
TRAIL_PID=$!

# Esperar a que TrailBase responda
for i in {1..20}; do
    if curl -s http://127.0.0.1:4000/api/ping >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# 5. Iniciar Cloudflare Tunnel
echo "🌐 Levantando Cloudflare Tunnel..."
rm -f /tmp/cloudflared.log
cloudflared tunnel --url http://127.0.0.1:4000 > /tmp/cloudflared.log 2>&1 &
TUNNEL_PID=$!

# Esperar a obtener la URL pública
TUNNEL_URL=""
for i in {1..30}; do
    TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9.]*\.trycloudflare\.com' /tmp/cloudflared.log | head -n 1 || true)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    sleep 0.5
done

echo ""
echo "=========================================================="
echo "  ✅ SERVICIOS ACTIVOS Y LISTOS"
echo "=========================================================="
echo "  💻 Local App:       http://localhost:4000"
echo "  🛠️  Local Admin:     http://localhost:4000/_/"
echo "  ⚡ WASM Extension:  http://localhost:4000/api/ping"
echo "----------------------------------------------------------"
if [ -n "$TUNNEL_URL" ]; then
    echo "  🌍 URL Pública:     $TUNNEL_URL"
    echo "  🔑 Admin Remoto:    $TUNNEL_URL/_/"
    echo "  📡 API Ping Remota: $TUNNEL_URL/api/ping"
else
    echo "  ⚠️  El túnel está conectando. Revisa: cat /tmp/cloudflared.log"
fi
echo "=========================================================="
echo "Presiona [Ctrl + C] para detener todos los servicios."
echo ""

# Mantener activo esperando procesos
wait "$TRAIL_PID" "$TUNNEL_PID"
