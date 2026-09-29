# Stage 30 — Reconnect/session cards + homepage proportions

## User-requested correction
The user clarified that “الألعاب غير المكتملة” means the saved/reconnect sessions shown after leaving a game, not games marked as under development.

## Changes
- Restored/locked the main homepage game cards to the normal proportions: moderate cards with the existing cover area, not the compact session-card style.
- Kept the “🛠️ تطوير وتحسين” label as a status only; it does not shrink or alter the normal game cards.
- Reconnect/session cards are now intentionally small horizontal rectangles, separate from the main game cards.
- Reconnect now works more robustly across all supported games: the saved session sends both the session token and saved player name, and the server first uses the token, then falls back to the matching offline saved player when an old/local token is stale after a restart/update.
- Session validation on the homepage also recognizes this safe offline-name fallback, so valid recoverable sessions are not incorrectly removed from the list.
- Added Champion reconnect routing from saved sessions.

## Verification
- `node --check server.js` passed.
- All inline JavaScript blocks in `public/index.html` passed `node --check`.
