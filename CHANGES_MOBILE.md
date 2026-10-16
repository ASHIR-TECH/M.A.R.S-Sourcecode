# MARS Mobile Changes

## What changed
- Relay URL now derived from `agentApiUrl` → `ws(s)://<host>:<port>/relay` (LAN). The QR's public QoWT relay speaks QUIC frames, not the MARS chat protocol.
- `RelayClient` sends `desktopId` at auth so the ADTP `/relay` can self-report under the paired identity (one desktop → one Home card).
- Added `systemClient` (fetch `/api/v1/system/info`, poll while paired) and `updatePairedDevice` to populate hostname/OS/CPU/RAM in store + app context.
- Added `uploadFile` (`POST /api/v1/transfers/upload`, multipart) to deliver attachments; the returned desktop path is appended to the agent message.
- Attach button now shows when focused or draft non-empty.
- `useDesktopSystemStore` caches system snapshot.
- Tests: deriveRelayUrl, systemClient, uploadFile, updatePairedDevice added/updated.

## Home screen polish
- Device grid back to the standard **4 slots** (`GRID_SLOTS = HOME_DEVICE_CAP`): one paired device + three placeholders.
- "Connected Devices" badge denominator is now the slot count (4), not `devices.length`, so a single online device reads **1/4**, never 1/3.
- The placeholder announcement ("System operational. Welcome aboard.") is gone — it pushed the whole page down for a fake message. `useAnnouncementStore` starts `null` and Home only renders `AnnouncementCard` when a real announcement is set; the SCAN pill keeps its right-hand slot in the meantime.

## Verification
- Mobile: `tsc --noEmit` clean; `jest` 39 suites, 217 passed.
- ADTP (gateway): 28 tests passed; endpoints `/system/info`, `/transfers/upload`, `WS /relay` work.

## Notes
- EAS preview build for these changes kicked off after commit (see PR for artifact URL).
