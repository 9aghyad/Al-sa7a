# Stage 39 — Family Feud player UI + written answer flow

- Reworked `public/games/family-feud/players.html` player mode to closely match the supplied mobile screenshots:
  - two large red/blue team cards
  - score + player status + three strike indicators
  - Strike / Double availability controls
  - large question card
  - `✍️ أجاوب كتابيًا` and `⚡ دبل + إجابة` 10-second buttons
  - two-column hidden answer cards with reveal buttons
  - compact player list in lobby
- Written answer flow:
  - clicking normal or double immediately prepares/focuses the answer input for mobile keyboard
  - server-authoritative 10-second lock
  - while one player answers, all players see `فلان يجاوب الآن` + countdown and answer buttons are disabled/hidden
  - only the player holding the lock can submit
  - double is consumed once by that player's team and doubles the awarded answer points
- Family Feud fuzzy answer matching was strengthened without changing the global matcher used by other games:
  - Arabic normalization
  - common spelling variants
  - curated Arabic synonym groups
  - token/stem overlap
  - typo tolerance
  - result indicates when an answer was accepted as the same meaning
- Existing presenter/display modes were left untouched.
- Syntax checks passed for `server.js` and the Family Feud player page JavaScript.
- Live Render/multi-phone testing was not performed in this environment.

## Draw entry fix continuation
- Fixed the unified home `room:created` redirect for `draw` to use the actual `unifiedName` / profile name instead of the old `#name` field, then route with `location.replace()` to `/games/draw/players` and the returned session token.
- Fixed Draw player reconnect/join bootstrap so it waits for Socket.IO `connect`, resumes with the saved session token when available, otherwise joins normally, and keeps the latest `draw:state` listener in one place.
- This targets the reported issue where `ارسمها` stayed in the entry/loading flow instead of entering the player room.
- Syntax check: `server.js` passes `node --check`.
