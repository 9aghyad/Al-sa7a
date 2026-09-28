# Stage 18 — Unified Teams & Readiness

- Added shared server-side team switching for team games.
- Added shared captain assignment for Family Feud, Bomb, and Faceoff.
- Added `room:setTeam`, `room:setCaptain`, plus Faceoff compatibility event `faceoff:setTeam`.
- Team capacity is enforced server-side using half of the room maximum.
- Captain moves are repaired automatically when a captain changes teams or is removed.
- Family Feud player lobby now exposes team switching, captain selection for host, and readiness.
- Bomb player lobby now exposes captain selection for host and readiness.
- Faceoff lobby now has unified readiness and retains its captain/player selection flow.
- Existing reconnect, room lock, max-player, kick, and game-specific settings remain intact.
- All public JavaScript files pass `node --check`.
