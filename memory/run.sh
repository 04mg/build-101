#!/usr/bin/env bash
# Founder network memory: FalkorDB (Docker) plus the private Graphiti service.
# Optional for the app: without it projects work and no network matches appear.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

command -v docker >/dev/null || { echo "Docker no está disponible: la red de founders queda apagada." >&2; exit 1; }
[[ -x .venv/bin/python ]] || python3 -m venv .venv
.venv/bin/python -c 'import graphiti_core' 2>/dev/null || .venv/bin/pip install -q -r requirements.txt
bash falkordb.sh start
exec .venv/bin/python service.py
