# MARS Mobile Changes

## What changed
- Relay URL now derived from `agentApiUrl` → `ws(s)://<host>:<port>/relay` (LAN). The QR's public QoWT relay speaks QUIC frames, not the MARS chat protocol.
- `RelayClient` sends `desktopId` at auth so the ADTP `/relay` can self-report under the paired identity (one desktop → one Home card).
- Added `systemClient` (fetch `/api/v1/system/info`, poll while paired) and `updatePairedDevice` to populate hostname/OS/CPU/RAM in store + app context.
- Added `uploadFile` (`POST /api/v1/transfers/upload`, multipart) to deliver attachments; the returned desktop path is appended to the agent message.
- Added `sendFile` (`POST /api/v1/transfers/send`) to ask the desktop to forward a file via QUIC to another peer.
- Added `downloadFile` (`GET /api/v1/transfers/{id}/download`) to fetch files from the desktop's intake directory.
- Attach button now shows when focused or draft non-empty.
- `useDesktopSystemStore` caches system snapshot.
- Tests: deriveRelayUrl, systemClient, uploadFile, updatePairedDevice added/updated.

## Home screen polish
- Device grid back to the standard **4 slots** (`GRID_SLOTS = HOME_DEVICE_CAP`): one paired device + three placeholders.
- "Connected Devices" badge denominator is now the slot count (4), not `devices.length`, so a single online device reads **1/4**, never 1/3.
- The placeholder announcement ("System operational. Welcome aboard.") is gone — it pushed the whole page down for a fake message. `useAnnouncementStore` starts `null` and Home only renders `AnnouncementCard` when a real announcement is set; the SCAN pill keeps its right-hand slot in the meantime.

## Device ID display fix
- DeviceCard & NodeCard now show a short human-readable ID (`displayId()` helper) instead of the full libp2p peer ID (e.g. `12D3KooW…` instead of `12D3KooW...longstring`). Short DEV-XXX IDs pass through unchanged.

## File transfer fixes (mobile ↔ desktop)
- **Upload**: Phone → desktop via REST `/transfers/upload` (multipart). File lands in desktop's intake dir; absolute path returned.
- **Send**: Mobile can now call `/transfers/send` with the uploaded file's desktop path + destination peer ID → desktop forwards via QUIC data plane (:40001) to target device.
- **Download**: Mobile can fetch files from desktop's intake dir via `/transfers/{id}/download` (serves uploaded files).
- **Receive**: For files pushed from other desktops via QUIC, mobile polls `/transfers` for incoming transfers and downloads via the new endpoint (watch-folder resolution TODO).

## Verification
- Mobile: `tsc --noEmit` clean; `jest` 39 suites, 217 passed.
- ADTP (gateway): 28 tests passed; endpoints `/system/info`, `/transfers/upload`, `/transfers/send`, `/transfers/{id}/download`, `WS /relay` work.

## Notes
- EAS preview build for these changes kicked off after commit (see PR for artifact URL).
- Project linked to new Expo account `ashir-techs-team` (project ID `24eb31f9-2bf9-4fd9-bba0-bda568d1e080`).
