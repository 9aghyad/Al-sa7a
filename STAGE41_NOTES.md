# Stage 41 — Family Feud answer-lock + Draw persistent room recovery

## Family Feud
- Answer buttons are now server-authoritative and non-optimistic.
- The client does not open an input merely because the button was tapped.
- Server grants exactly one active answer lock for the whole room for 10 seconds.
- Public family state now exposes a safe `answerLock.playerId` instead of the socket id.
- Only the player whose `playerId` owns the lock renders the keyboard/input editor.
- Other phones render a locked status showing who is answering and the remaining timer.
- Added explicit `answer:denied` feedback for race conditions / already-locked turns.
- Added answer-start, correct, wrong, and timeout audio/animation feedback.
- Improved state preservation using player id instead of player name.

## Draw
- Added optional PostgreSQL persistence for active Draw rooms using the existing `DATABASE_URL` environment variable.
- Creates `saha_draw_rooms` automatically when DB is available.
- Active Draw rooms are persisted and restored after a Render instance restart, so a browser's saved session/code is not immediately treated as an ended room.
- Player socket IDs are never persisted; restored players reconnect normally with their session token.
- Drawing strokes/fills are intentionally not persisted to the DB to avoid writing large payloads on every pointer event; lobby/game/session state is persisted.
- Added fallback: if a Draw session token cannot be resumed but the room still exists, the client attempts one normal room join using the player's name before clearing the saved session.
- Finished Draw rooms are removed from the DB.
- Existing local `data/sessions.json` persistence remains as fallback.

## Verification
- `node --check server.js` passed.
- Family Feud and Draw inline browser scripts were syntax-checked with Node.
- No live Render / multi-phone test was performed in this environment.
