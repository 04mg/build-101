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

for tool in node pnpm trail cargo curl flock; do
  command -v "$tool" >/dev/null || { say "$RED" "✗ Missing prerequisite: $tool" >&2; exit 1; }
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) process.exit(1)' || { say "$RED" "✗ Node.js 22+ is required." >&2; exit 1; }

mkdir -p .run backend/wasm
exec 9>.run/start.lock
flock -n 9 || { say "$RED" "✗ The app is already running. Stop it before starting watch mode." >&2; exit 1; }

pids=()
cleanup() {
  trap - EXIT INT TERM
  if ((${#pids[@]})); then
    kill "${pids[@]}" 2>/dev/null || true
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

say "$CYAN" "◆ Assistant  ·  Preparing development environment…"
if ! {
  pnpm --dir agents install --frozen-lockfile &&
  pnpm --dir frontend install --frozen-lockfile &&
  cargo build --manifest-path backend/extensions/Cargo.toml --target wasm32-wasip2 --release --locked &&
  cp backend/extensions/target/wasm32-wasip2/release/trailbase_extensions.wasm backend/wasm/extensions.wasm
} >.run/watch-build.log 2>&1; then
  say "$RED" "✗ Build failed; see .run/watch-build.log." >&2
  exit 1
fi

settings="$(node --env-file-if-exists=.env --input-type=module -e '
  const { loadConfig } = await import("./agents/src/config.ts");
  const c = loadConfig();
  console.log(new URL(c.trailbaseUrl).port);
  console.log(c.port);
')"
mapfile -t settings <<< "$settings"
TRAIL_PORT="${settings[0]}"
APP_PORT="${settings[1]}"

trail --depot "$DIR/backend" run --address "127.0.0.1:$TRAIL_PORT" --public-dir "$DIR/frontend/dist" --spa >.run/trailbase.log 2>&1 9>&- &
TRAIL_PID=$!
pids+=("$TRAIL_PID")

for _ in {1..120}; do
  kill -0 "$TRAIL_PID" 2>/dev/null || { say "$RED" "✗ TrailBase failed; see .run/trailbase.log." >&2; exit 1; }
  if curl --fail --silent --max-time 1 "http://127.0.0.1:$TRAIL_PORT/api/ping" >/dev/null; then break; fi
  sleep 0.5
done
curl --fail --silent --max-time 1 "http://127.0.0.1:$TRAIL_PORT/api/ping" >/dev/null || { say "$RED" "✗ TrailBase did not become ready; see .run/trailbase.log." >&2; exit 1; }

(cd agents && exec node --env-file-if-exists=../.env --import tsx --watch src/server.ts) >.run/agents.log 2>&1 9>&- &
AGENT_PID=$!
pids+=("$AGENT_PID")
(cd frontend && exec ./node_modules/.bin/vite --host 0.0.0.0) >.run/frontend.log 2>&1 9>&- &
FRONTEND_PID=$!
pids+=("$FRONTEND_PID")

# The founder network memory is optional: if it stops, the app keeps running.
core_pids=("${pids[@]}")
if [[ "${ENABLE_MEMORY:-1}" != 0 ]]; then
  bash memory/run.sh >.run/memory.log 2>&1 9>&- &
  pids+=("$!")
fi

printf '\n%s◆ Assistant%s\n\n' "$BOLD$CYAN" "$RESET"
say "$GREEN" "✓ Frontend  http://localhost:5173  ·  live reload"
say "$GREEN" "✓ Agent API http://localhost:$APP_PORT  ·  restarts on save"
printf '\n%sPress Ctrl+C to stop.%s\n\n' "$DIM" "$RESET"
set +e
wait -n "${core_pids[@]}"
status=$?
set -e
say "$RED" "✗ A development process exited (status $status); check .run/ logs." >&2
exit 1
