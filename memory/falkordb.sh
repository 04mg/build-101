#!/usr/bin/env bash
set -euo pipefail

name="cruce-memory-falkordb"
volume="cruce-memory-falkordb-data"

case "${1:-start}" in
  start)
    if docker container inspect "$name" >/dev/null 2>&1; then
      running="$(docker inspect --format '{{.State.Running}}' "$name")"
      if [[ "$running" != "true" ]]; then docker start "$name" >/dev/null; fi
    else
      docker run -d --name "$name" \
        -p 6379:6379 \
        -v "$volume:/var/lib/falkordb/data" \
        falkordb/falkordb:latest >/dev/null
    fi
    for _ in $(seq 1 30); do
      if docker exec "$name" redis-cli ping 2>/dev/null | python3 -c 'import sys; sys.exit(0 if sys.stdin.read().strip() == "PONG" else 1)'; then
        printf 'FalkorDB listo en localhost:6379 (%s)\n' "$name"
        exit 0
      fi
      sleep 1
    done
    docker logs "$name"
    printf 'FalkorDB no respondió dentro de 30 segundos.\n' >&2
    exit 1
    ;;
  stop)
    if docker container inspect "$name" >/dev/null 2>&1; then docker stop "$name" >/dev/null; fi
    printf 'FalkorDB detenido. Los datos siguen en el volumen %s.\n' "$volume"
    ;;
  status)
    if docker container inspect "$name" >/dev/null 2>&1; then docker ps --filter "name=^/${name}$"; else printf 'FalkorDB todavía no fue creado.\n'; fi
    ;;
  *)
    printf 'Uso: bash memory/falkordb.sh [start|stop|status]\n' >&2
    exit 2
    ;;
esac
