#!/usr/bin/env bash
# Publish the current mobile/ code as an OTA update to the self-hosted xprem server.
#
# Usage:
#   EXPO_TOKEN=... ./publish.sh [branch] [release-channel]
#     branch           default "production"  — where the update lands on the server
#     release-channel  default "production"  — channel the build was compiled with
set -euo pipefail

BRANCH="${1:-production}"
CHANNEL="${2:-production}"
cd "$(dirname "$0")/../../mobile"

export RELEASE_CHANNEL="${CHANNEL}"

echo "Publishing to branch '${BRANCH}' (channel '${CHANNEL}')…"
npx eoas publish --branch "${BRANCH}"
echo "Done."