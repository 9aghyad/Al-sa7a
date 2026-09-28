# Stage 28 — Homepage cards + Family Feud + Champion join fixes

## Fixes
- Homepage game cards now have a more deliberate visual cover treatment (glass artwork tile, decorative rings and stronger game-specific backgrounds) instead of looking like empty/broken image placeholders.
- Games marked as `upgrade` are now genuinely compact: small horizontal rectangles, including on mobile, with a tiny icon and action button.
- Unified homepage creation for Family Feud now creates **players-only mode (`3`)** so the creator actually enters the player lobby instead of being routed into presenter mode.
- Fixed **بطل الساحة** second-player joining from a phone: when a player arrives at `/games/champion/?code=Hxxx&name=...`, the join button now uses the room code from the URL and emits `room:join` instead of looking for a non-existent `joinCode` field.
- The Champion join form also pre-fills the name supplied by the join flow.

## Verification
- `server.js` passes `node --check`.
- Inline JavaScript in `public/index.html` and `public/games/champion/index.html` passes `node --check` after extraction.
- npm install could not complete within the available execution window, so a live Socket.IO multi-device test was not performed here.
