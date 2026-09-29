# Stage 24 — Unified Room Visibility + Draw Connectivity Fix

## Changes
- Restored a visible unified room bar/panel on the Draw player screen, opened by default.
- Draw lobby now shows room code, copy/share/QR, players, connection status, host controls, and Draw settings.
- Draw settings now actually save through `draw:setSettings` and include a host Start button.
- Draw Start button requires at least 2 connected players in the UI and server.
- Draw public state is now emitted per socket so each drawer receives the secret word while other players do not.
- Draw public state includes `myPlayerId`, `isHost`, room lock/max metadata for the shared lobby.
- Draw reconnect loads the saved session token from local storage when the URL does not contain one.
- Fixed a stale-socket race: an old Socket.IO connection can no longer mark a newer connection for the same player as offline.
- Added stronger server-side presence reconciliation before starting Draw.
- Active non-finished rooms are restored from the persisted sessions file after a server restart; restored players start offline and can reconnect using their session tokens.
- Added a universal QR room tool to the generic player UI so games that use the generic player page also expose a QR entry point.
- QR URL remains `/player?code=...`; scanning opens the name-entry flow and then routes the player into the detected room/game.

## Validation
- `node --check server.js` passed.
- Inline JavaScript extracted from `index.html`, `draw/players.html`, and `room-lobby.js` passed `node --check`.
- ZIP integrity checked with `unzip -tq`.
- Live two-device/Render testing was not available in this environment.
