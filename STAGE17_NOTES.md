# الساحة 2.0 — Stage 17: Live Room Management

- Added server-side lobby management for player rooms.
- Host can lock/unlock a lobby to stop new joins.
- Host can set a maximum player count within each game's hard limit.
- Host can remove/kick a player while the lobby is open; the removed session token is revoked.
- Added room-management controls to Faceoff and Bomb lobbies: live capacity, lock/unlock, copy code, max-player selection, and host kick controls.
- Existing Faceoff team selection/captain flow and Bomb team switching remain intact.
- Existing reconnect/session architecture is preserved.
- Server enforces lock and capacity; controls are not client-only.
- All JavaScript files pass `node --check`.
