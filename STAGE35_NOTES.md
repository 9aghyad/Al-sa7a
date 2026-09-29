# Stage 35 — Family Feud player mode + room/game fixes

Implemented from Stage 34, using the uploaded `1ف1.zip` Family Feud player-mode behavior/UI as the reference while preserving the Saha Socket.IO room system.

## Family Feud
- Restored working mode selection for Presenter + Display + Players.
- Added working presenter and display pages/routes.
- Reworked player mode (mode 3) to follow the uploaded reference: team cards, question stage, answer board, written answer flow, reveal/award controls, player-controlled next/change question, lobby team selection and player list.
- Mode 3 core reveal/award/strike/next permissions now support the player-driven flow.

## Draw
- Added a direct host Start button inside the game lobby as a fallback to the room panel.
- Hardened `draw:start` host assignment/checks.
- Drawing sync is now incremental with stroke IDs and short batching instead of waiting for pointer-up.
- Local strokes are committed immediately so they no longer disappear between preview and server acknowledgement.
- Stroke updates no longer trigger expensive fill redraws.
- Added the floating old-answers panel for drawer and players.
- New guesses remain a lightweight transparent fade overlay; the old black answer box is removed.

## Million
- Hardened player identity using the server-provided `myPlayerId` so the active player can actually press answer buttons.
- Hardened host start authorization.

## Auction
- Added a prominent host-only Start button in the auction lobby.
- Hardened host assignment/checks for `market:start`.

## Profile / Room UI
- Fixed profile crop styling and image loading with object URLs + FileReader fallback.
- Circular preview/output remains 512x512 PNG with drag + zoom.
- Standardized room/avatar presentation to circular profile images where applicable.
- Room control remains fixed at the top-left and is host-only; compact settings button.

## Verification
- `node --check` passed for server and relevant JS/inline scripts.
- Full `npm install` could not complete within the available test window, so a real Socket.IO multi-device run was not claimed.
