#!/usr/bin/env bash
# Health watchdog for the reserved MARS public relay endpoint.
# Restarts the relay/tunnel services if either local or public health fails.
set -u

DOMAIN="${MARS_RELAY_DOMAIN:-danceable-unrectified-missy.ngrok-free.app}"
PORT="${PORT:-3001}"
LOCAL="http://127.0.0.1:${PORT}/health"
PUBLIC="https://${DOMAIN}/health"

if ! curl -fsS --max-time 5 "$LOCAL" >/dev/null 2>&1; then
  systemctl --user restart mars-relay.service
  sleep 2
fi

if ! curl -fsS --max-time 8 "$PUBLIC" >/dev/null 2>&1; then
  systemctl --user restart mars-ngrok.service
fi
