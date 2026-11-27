#!/usr/bin/env bash
# Start the MARS relay and its reserved public ngrok endpoint.
# The domain is baked into mobile/eas.json, so keep it stable.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="${MARS_RELAY_DOMAIN:-danceable-unrectified-missy.ngrok-free.app}"
PORT="${PORT:-3001}"

if ! curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "Starting local relay on port ${PORT}..."
  (cd "$ROOT" && nohup node relay/server.js > "$ROOT/relay/relay.log" 2>&1 &)
  sleep 2
fi

if ! curl -fsS --max-time 8 "https://${DOMAIN}/health" >/dev/null 2>&1; then
  echo "Starting ngrok tunnel to ${DOMAIN} -> localhost:${PORT}..."
  nohup ngrok http --url "$DOMAIN" "$PORT" > "$ROOT/relay/ngrok.log" 2>&1 &
  sleep 2
fi

if curl -fsS --max-time 8 "https://${DOMAIN}/health" >/dev/null 2>&1; then
  echo "Public relay ready: https://${DOMAIN}"
else
  echo "Public relay is not responding at https://${DOMAIN}" >&2
  echo "Check: tail -n 50 $ROOT/relay/ngrok.log" >&2
  exit 1
fi
