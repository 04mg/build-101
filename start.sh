#!/usr/bin/env bash
set -Eeuo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"
export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"

if [[ -t 1 && -z "${NO_COLOR:-}" && "${TERM:-dumb}" != dumb ]]; then
  BOLD=$'\033[1m'; CYAN=$'\033[36m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RED=$'\033[31m'; RESET=$'\033[0m'
else
  BOLD=''; CYAN=''; GREEN=''; DIM=''; RED=''; RESET=''
fi
say() { printf '%s%s%s\n' "$1" "$2" "$RESET"; }

# Usage: ./start.sh [PORT] or ./start.sh --port PORT (default: PORT from env/.env, else 4000).
# A port given here also moves TrailBase to PORT+1 unless TRAILBASE_PORT is exported.
while (($#)); do
  case "$1" in
    -p|--port) [[ $# -ge 2 ]] || { say "$RED" "✗ $1 needs a value." >&2; exit 1; }; PORT_ARG="$2"; shift 2 ;;
    --port=*) PORT_ARG="${1#*=}"; shift ;;
    [0-9]*) PORT_ARG="$1"; shift ;;
    *) say "$RED" "✗ Unknown argument: $1. Usage: ./start.sh [--port PORT]" >&2; exit 1 ;;
  esac
done
if [[ -n "${PORT_ARG:-}" ]]; then
  [[ "$PORT_ARG" =~ ^[0-9]+$ ]] && ((PORT_ARG >= 1 && PORT_ARG <= 65534)) || { say "$RED" "✗ Invalid port: $PORT_ARG" >&2; exit 1; }
  export PORT="$PORT_ARG"
  export TRAILBASE_PORT="${TRAILBASE_PORT:-$((PORT_ARG + 1))}"
fi

for tool in node pnpm trail cargo curl flock; do
  command -v "$tool" >/dev/null || { say "$RED" "✗ Missing prerequisite: $tool" >&2; exit 1; }
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)' || { say "$RED" "✗ Node.js 22+ is required." >&2; exit 1; }

mkdir -p .run backend/wasm
exec 9>.run/start.lock
flock -n 9 || { say "$RED" "✗ The app is already running. Stop it before starting again." >&2; exit 1; }
BUILD_LOG="$DIR/.run/build.log"

pids=()
cleanup() {
  trap - EXIT INT TERM
  if ((${#pids[@]})); then
    echo "Stopping app processes…"
    kill "${pids[@]}" 2>/dev/null || true
    # Node drains/aborts streams; force shutdown only after a grace period.
    for _ in {1..60}; do
      local running=0
      for pid in "${pids[@]}"; do kill -0 "$pid" 2>/dev/null && running=1; done
      ((running == 0)) && break
      sleep 0.1
    done
    kill -KILL "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

say "$CYAN" "◆ Assistant  ·  Preparing app…"
if ! {
  pnpm --dir agents install --frozen-lockfile &&
  pnpm --dir frontend install --frozen-lockfile &&
  pnpm --dir agents run build &&
  pnpm --dir frontend run build &&
  cargo build --manifest-path backend/extensions/Cargo.toml --target wasm32-wasip2 --release --locked &&
  cp backend/extensions/target/wasm32-wasip2/release/trailbase_extensions.wasm backend/wasm/extensions.wasm
} >"$BUILD_LOG" 2>&1; then
  say "$RED" "✗ Build failed; see .run/build.log." >&2
  exit 1
fi

# Parse .env with Node, not a shell eval. Exported environment variables take priority.
settings="$(node --env-file-if-exists=.env --input-type=module -e '
  const { loadConfig } = await import("./agents/dist/config.js");
  const c = loadConfig();
  console.log(c.port);
  console.log(new URL(c.trailbaseUrl).port);
  console.log(process.env.ENABLE_TUNNEL ?? "1");
  console.log(process.env.PUBLIC_URL ?? "");
')"
mapfile -t settings <<< "$settings"
APP_PORT="${settings[0]}"
TRAIL_PORT="${settings[1]}"
TUNNEL_ENABLED="${settings[2]}"
PUBLIC_APP_URL="${settings[3]:-}"

if [[ "$TUNNEL_ENABLED" != 0 && "$TUNNEL_ENABLED" != 1 ]]; then
  say "$RED" "✗ ENABLE_TUNNEL must be 0 or 1." >&2
  exit 1
fi
if [[ "$TUNNEL_ENABLED" == 1 ]]; then
  command -v cloudflared >/dev/null || { say "$RED" "✗ Install cloudflared or set ENABLE_TUNNEL=0." >&2; exit 1; }
fi

# Readiness checks would otherwise pass against whatever already listens there.
for port in "$APP_PORT" "$TRAIL_PORT"; do
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    say "$RED" "✗ Port $port is already in use. Stop that process or run ./start.sh --port <free port>." >&2
    exit 1
  fi
done

wait_ready() {
  local url="$1" pid="$2" name="$3" log="$4"
  for _ in {1..120}; do
    kill -0 "$pid" 2>/dev/null || { say "$RED" "✗ $name exited; see $log." >&2; return 1; }
    if curl --fail --silent --max-time 1 "$url" >/dev/null; then return 0; fi
    sleep 0.5
  done
  say "$RED" "✗ $name did not become ready; see $log." >&2
  return 1
}

trail_args=(--depot "$DIR/backend")
[[ -n "$PUBLIC_APP_URL" ]] && trail_args+=(--public-url "$PUBLIC_APP_URL")
trail "${trail_args[@]}" run --address "127.0.0.1:$TRAIL_PORT" --public-dir "$DIR/frontend/dist" --spa >.run/trailbase.log 2>&1 9>&- &
TRAIL_PID=$!
pids+=("$TRAIL_PID")
wait_ready "http://127.0.0.1:$TRAIL_PORT/api/ping" "$TRAIL_PID" TrailBase .run/trailbase.log

node --env-file-if-exists=.env agents/dist/server.js >.run/agents.log 2>&1 9>&- &
NODE_PID=$!
pids+=("$NODE_PID")
wait_ready "http://127.0.0.1:$APP_PORT/api/agents/health" "$NODE_PID" Node .run/agents.log
# Verify forwarding as well as both process health checks.
curl --fail --silent --max-time 5 "http://127.0.0.1:$APP_PORT/api/ping" >/dev/null

printf '\n%s◆ Assistant%s\n\n' "$BOLD$CYAN" "$RESET"
say "$GREEN" "✓ App   http://localhost:$APP_PORT"

if [[ "$TUNNEL_ENABLED" == 1 ]]; then
  cloudflared tunnel --url "http://127.0.0.1:$APP_PORT" >.run/cloudflared.log 2>&1 9>&- &
  TUNNEL_PID=$!
  pids+=("$TUNNEL_PID")
  for _ in {1..40}; do
    kill -0 "$TUNNEL_PID" 2>/dev/null || { say "$RED" "✗ Tunnel exited; see .run/cloudflared.log." >&2; exit 1; }
    TUNNEL_URL="$(node --input-type=module -e 'import { readFileSync } from "node:fs"; console.log(readFileSync(".run/cloudflared.log", "utf8").match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0] ?? "")')"
    if [[ -n "$TUNNEL_URL" ]]; then say "$CYAN" "↗ Public $TUNNEL_URL"; break; fi
    sleep 0.5
  done
  [[ -n "$TUNNEL_URL" ]] || say "$DIM" "↗ Tunnel is connecting…"
fi

printf '\n%sPress Ctrl+C to stop.%s\n\n' "$DIM" "$RESET"
set +e
wait -n "${pids[@]}"
status=$?
set -e
say "$RED" "✗ An app process exited (status $status); check .run/ logs." >&2
exit 1
